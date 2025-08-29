import { Page } from 'playwright';
import { 
  PlaybackSession, 
  RecordingSession, 
  RecordedAction, 
  PlaybackStepResult,
  PlaybackEvent,
  BrowserSession
} from '../types';
import { supabaseAdmin, TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketService } from './websocketService';
import { logger, LogCategory } from './loggingService';
import path from 'path';
import fs from 'fs/promises';

export interface PlaybackOptions {
  speed?: number; // 0.1 to 5.0, where 1.0 is normal speed
  stepDelay?: number; // Additional delay between steps in ms
  captureScreenshots?: boolean;
  stopOnError?: boolean;
  skipToStep?: number; // Start playback from specific step
  breakpoints?: number[]; // Steps to pause on
  highlightElements?: boolean;
  showMouseCursor?: boolean;
}

export class TestPlaybackService {
  private activePlaybacks = new Map<string, {
    session: PlaybackSession;
    page: Page;
    recordingSession: RecordingSession;
    actions: RecordedAction[];
    currentStep: number;
    isPaused: boolean;
    options: PlaybackOptions;
  }>();

  private wsService: WebSocketService;

  // JavaScript to inject for element highlighting during playback
  private readonly highlightScript = `
    (function() {
      window.__testbroPlayback = window.__testbroPlayback || {
        highlightedElement: null,
        
        highlightElement: function(selector) {
          this.removeHighlight();
          
          try {
            const element = document.querySelector(selector);
            if (element) {
              element.style.outline = '3px solid #ff6b6b';
              element.style.outlineOffset = '2px';
              element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
              element.style.transition = 'all 0.3s ease';
              this.highlightedElement = element;
              
              // Scroll element into view
              element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
              });
            }
          } catch (error) {
            console.warn('Failed to highlight element:', selector, error);
          }
        },
        
        removeHighlight: function() {
          if (this.highlightedElement) {
            this.highlightedElement.style.outline = '';
            this.highlightedElement.style.outlineOffset = '';
            this.highlightedElement.style.backgroundColor = '';
            this.highlightedElement.style.transition = '';
            this.highlightedElement = null;
          }
        },
        
        showMouseCursor: function(x, y) {
          let cursor = document.getElementById('testbro-mouse-cursor');
          if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'testbro-mouse-cursor';
            cursor.style.cssText = \`
              position: fixed;
              width: 20px;
              height: 20px;
              background: radial-gradient(circle, #ff6b6b 30%, transparent 30%);
              border: 2px solid #ff6b6b;
              border-radius: 50%;
              pointer-events: none;
              z-index: 999999;
              transition: all 0.2s ease;
            \`;
            document.body.appendChild(cursor);
          }
          
          cursor.style.left = (x - 10) + 'px';
          cursor.style.top = (y - 10) + 'px';
          cursor.style.opacity = '1';
        },
        
        hideMouseCursor: function() {
          const cursor = document.getElementById('testbro-mouse-cursor');
          if (cursor) {
            cursor.style.opacity = '0';
          }
        }
      };
    })();
  `;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Start playback of a recorded session
   */
  async startPlayback(
    recordingSessionId: string,
    browserSessionId: string,
    page: Page,
    userId: string,
    options: PlaybackOptions = {}
  ): Promise<PlaybackSession> {
    const playbackId = uuidv4();

    try {
      // Get recording session and actions
      const [recordingSession, actions] = await Promise.all([
        this.getRecordingSession(recordingSessionId),
        this.getRecordingActions(recordingSessionId)
      ]);

      if (!recordingSession) {
        throw new Error(`Recording session ${recordingSessionId} not found`);
      }

      if (!actions || actions.length === 0) {
        throw new Error(`No actions found for recording session ${recordingSessionId}`);
      }

      // Create playback session
      const playbackSession: PlaybackSession = {
        id: playbackId,
        recording_session_id: recordingSessionId,
        browser_session_id: browserSessionId,
        status: 'running',
        current_step: options.skipToStep || 1,
        total_steps: actions.length,
        started_at: new Date().toISOString(),
        playback_speed: options.speed || 1.0,
        step_results: [],
        screenshots: [],
        user_id: userId,
        created_at: new Date().toISOString()
      };

      // Insert into database
      const { error } = await supabaseAdmin
        .from('playback_sessions')
        .insert(playbackSession);

      if (error) {
        throw new Error(`Failed to create playback session: ${error.message}`);
      }

      // Inject playback script
      await page.addInitScript(this.highlightScript);
      await page.evaluate(this.highlightScript);

      // Navigate to start URL if needed
      if (page.url() !== recordingSession.start_url) {
        await page.goto(recordingSession.start_url, { waitUntil: 'domcontentloaded' });
      }

      // Store active playback
      this.activePlaybacks.set(playbackId, {
        session: playbackSession,
        page,
        recordingSession,
        actions: actions.sort((a, b) => a.order - b.order),
        currentStep: options.skipToStep || 1,
        isPaused: false,
        options: {
          speed: 1.0,
          stepDelay: 0,
          captureScreenshots: true,
          stopOnError: true,
          highlightElements: true,
          showMouseCursor: true,
          ...options
        }
      });

      // Emit playback started event
      this.emitPlaybackEvent(playbackId, {
        action: 'start',
        playback_session: playbackSession
      });

      logger.info('Playback session started', LogCategory.BROWSER, {
        playbackId,
        recordingSessionId,
        totalSteps: actions.length,
        startStep: options.skipToStep || 1
      });

      // Start executing steps
      this.executeNextStep(playbackId);

      return playbackSession;

    } catch (error) {
      logger.error('Failed to start playback', LogCategory.BROWSER, {
        playbackId,
        recordingSessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pausePlayback(playbackId: string): Promise<void> {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback) {
      throw new Error(`Playback session ${playbackId} not found`);
    }

    playback.isPaused = true;
    playback.session.status = 'paused';

    // Update database
    await supabaseAdmin
      .from('playback_sessions')
      .update({ status: 'paused' })
      .eq('id', playbackId);

    // Emit event
    this.emitPlaybackEvent(playbackId, {
      action: 'pause',
      playback_session: playback.session
    });

    logger.info('Playback paused', LogCategory.BROWSER, { playbackId });
  }

  /**
   * Resume playback
   */
  async resumePlayback(playbackId: string): Promise<void> {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback) {
      throw new Error(`Playback session ${playbackId} not found`);
    }

    playback.isPaused = false;
    playback.session.status = 'running';

    // Update database
    await supabaseAdmin
      .from('playback_sessions')
      .update({ status: 'running' })
      .eq('id', playbackId);

    // Emit event
    this.emitPlaybackEvent(playbackId, {
      action: 'resume',
      playback_session: playback.session
    });

    logger.info('Playback resumed', LogCategory.BROWSER, { playbackId });

    // Continue execution
    this.executeNextStep(playbackId);
  }

  /**
   * Stop playback
   */
  async stopPlayback(playbackId: string): Promise<PlaybackSession> {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback) {
      throw new Error(`Playback session ${playbackId} not found`);
    }

    try {
      playback.session.status = 'completed';
      playback.session.completed_at = new Date().toISOString();

      // Remove highlights
      await playback.page.evaluate(`() => {
        if (window.__testbroPlayback) {
          window.__testbroPlayback.removeHighlight();
          window.__testbroPlayback.hideMouseCursor();
        }
      }`);

      // Update database
      await supabaseAdmin
        .from('playback_sessions')
        .update({
          status: 'completed',
          completed_at: playback.session.completed_at,
          step_results: playback.session.step_results
        })
        .eq('id', playbackId);

      // Remove from active playbacks
      this.activePlaybacks.delete(playbackId);

      // Emit event
      this.emitPlaybackEvent(playbackId, {
        action: 'stop',
        playback_session: playback.session
      });

      logger.info('Playback stopped', LogCategory.BROWSER, {
        playbackId,
        completedSteps: playback.session.step_results.length,
        totalSteps: playback.session.total_steps
      });

      return playback.session;

    } catch (error) {
      logger.error('Failed to stop playback', LogCategory.BROWSER, {
        playbackId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Execute next step in playback
   */
  private async executeNextStep(playbackId: string): Promise<void> {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback || playback.isPaused) {
      return;
    }

    if (playback.currentStep > playback.actions.length) {
      // Playback completed
      await this.stopPlayback(playbackId);
      return;
    }

    const action = playback.actions[playback.currentStep - 1];
    if (!action) {
      // Skip to next step
      playback.currentStep++;
      setTimeout(() => this.executeNextStep(playbackId), 100);
      return;
    }

    // Check if this is a breakpoint
    if (playback.options.breakpoints?.includes(playback.currentStep)) {
      await this.pausePlayback(playbackId);
      return;
    }

    try {
      const stepResult = await this.executeStep(playback, action);
      
      // Add step result
      playback.session.step_results.push(stepResult);
      playback.session.current_step = playback.currentStep;

      // Update database with progress
      await supabaseAdmin
        .from('playback_sessions')
        .update({
          current_step: playback.currentStep,
          step_results: playback.session.step_results
        })
        .eq('id', playbackId);

      // Emit step completed event
      this.emitPlaybackEvent(playbackId, {
        action: stepResult.status === 'failed' ? 'step_failed' : 'step_completed',
        playback_session: playback.session,
        step_result: stepResult
      });

      // Check if we should stop on error
      if (stepResult.status === 'failed' && playback.options.stopOnError) {
        playback.session.status = 'failed';
        playback.session.error_message = stepResult.error_message;
        await this.stopPlayback(playbackId);
        return;
      }

      // Move to next step
      playback.currentStep++;

      // Calculate delay based on speed and step delay
      const baseDelay = 1000 / playback.options.speed!;
      const totalDelay = baseDelay + (playback.options.stepDelay || 0);

      // Schedule next step
      setTimeout(() => this.executeNextStep(playbackId), totalDelay);

    } catch (error) {
      const stepResult: PlaybackStepResult = {
        action_id: action.id,
        step_order: playback.currentStep,
        status: 'failed',
        duration_ms: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        element_found: false
      };

      playback.session.step_results.push(stepResult);

      // Emit failure event
      this.emitPlaybackEvent(playbackId, {
        action: 'step_failed',
        playback_session: playback.session,
        step_result: stepResult
      });

      if (playback.options.stopOnError) {
        playback.session.status = 'failed';
        playback.session.error_message = stepResult.error_message;
        await this.stopPlayback(playbackId);
      } else {
        // Continue to next step
        playback.currentStep++;
        setTimeout(() => this.executeNextStep(playbackId), 1000);
      }
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(playback: any, action: RecordedAction): Promise<PlaybackStepResult> {
    const startTime = Date.now();
    
    const stepResult: PlaybackStepResult = {
      action_id: action.id,
      step_order: playback.currentStep,
      status: 'running',
      duration_ms: 0,
      timestamp: new Date().toISOString(),
      element_found: false
    };

    try {
      // Highlight element if enabled
      if (playback.options.highlightElements && action.element.selector) {
        await playback.page.evaluate(`(selector) => {
          if (window.__testbroPlayback) {
            window.__testbroPlayback.highlightElement(selector);
          }
        }`, action.element.selector);
      }

      // Show mouse cursor if enabled
      if (playback.options.showMouseCursor && action.coordinates) {
        await playback.page.evaluate(`(x, y) => {
          if (window.__testbroPlayback) {
            window.__testbroPlayback.showMouseCursor(x, y);
          }
        }`, action.coordinates.x, action.coordinates.y);
      }

      // Wait for element to be available
      let element = null;
      if (action.element.selector) {
        try {
          element = await playback.page.waitForSelector(action.element.selector, { 
            timeout: 5000,
            state: 'visible' 
          });
          stepResult.element_found = !!element;
        } catch (error) {
          // Try XPath if CSS selector fails
          if (action.element.xpath) {
            try {
              element = await playback.page.waitForSelector(`xpath=${action.element.xpath}`, { 
                timeout: 5000,
                state: 'visible' 
              });
              stepResult.element_found = !!element;
            } catch (xpathError) {
              stepResult.element_found = false;
            }
          }
        }
      }

      // Execute action based on type
      switch (action.action_type) {
        case 'click':
          if (element) {
            await element.click();
          } else if (action.coordinates) {
            await playback.page.mouse.click(action.coordinates.x, action.coordinates.y);
          }
          break;

        case 'type':
          if (element && action.value) {
            await element.clear();
            await element.type(action.value);
          }
          break;

        case 'select':
          if (element && action.value) {
            await element.selectOption(action.value);
          }
          break;

        case 'scroll':
          if (action.value && typeof action.value === 'object') {
            const scrollData = action.value as any;
            await playback.page.evaluate(`(x, y) => {
              window.scrollTo(x, y);
            }`, scrollData.scrollX || 0, scrollData.scrollY || 0);
          } else if (action.coordinates) {
            await playback.page.mouse.wheel(action.coordinates.x, action.coordinates.y);
          }
          break;

        case 'hover':
          if (element) {
            await element.hover();
          } else if (action.coordinates) {
            await playback.page.mouse.move(action.coordinates.x, action.coordinates.y);
          }
          break;

        case 'keypress':
          if (action.value) {
            await playback.page.keyboard.press(action.value);
          }
          break;

        case 'navigate':
          if (action.value) {
            await playback.page.goto(action.value, { waitUntil: 'domcontentloaded' });
          }
          break;

        case 'wait':
          const waitTime = action.value ? parseInt(action.value) : 1000;
          await playback.page.waitForTimeout(waitTime);
          break;

        default:
          logger.warn('Unknown action type during playback', LogCategory.BROWSER, {
            actionType: action.action_type,
            playbackId: playback.session.id
          });
      }

      // Take screenshot if enabled
      if (playback.options.captureScreenshots) {
        const screenshotUrl = await this.takeStepScreenshot(playback.session.id, playback.currentStep);
        stepResult.screenshot_url = screenshotUrl;
        playback.session.screenshots.push(screenshotUrl);
      }

      // Record actual coordinates for verification
      if (element) {
        const boundingBox = await element.boundingBox();
        if (boundingBox) {
          stepResult.actual_coordinates = {
            x: boundingBox.x + boundingBox.width / 2,
            y: boundingBox.y + boundingBox.height / 2
          };
        }
      }

      stepResult.status = 'completed';
      stepResult.duration_ms = Date.now() - startTime;

      logger.debug('Step executed successfully', LogCategory.BROWSER, {
        playbackId: playback.session.id,
        step: playback.currentStep,
        actionType: action.action_type,
        duration: stepResult.duration_ms
      });

      return stepResult;

    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error_message = error instanceof Error ? error.message : 'Unknown error';
      stepResult.duration_ms = Date.now() - startTime;

      logger.error('Step execution failed', LogCategory.BROWSER, {
        playbackId: playback.session.id,
        step: playback.currentStep,
        actionType: action.action_type,
        error: stepResult.error_message
      });

      return stepResult;
    }
  }

  /**
   * Take screenshot for a specific step
   */
  private async takeStepScreenshot(playbackId: string, stepNumber: number): Promise<string> {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback) {
      throw new Error(`Playback session ${playbackId} not found`);
    }

    try {
      const screenshotDir = path.join(process.cwd(), 'screenshots', 'playback', playbackId);
      await fs.mkdir(screenshotDir, { recursive: true });
      
      const filename = `step_${stepNumber.toString().padStart(3, '0')}_${Date.now()}.png`;
      const filepath = path.join(screenshotDir, filename);
      
      await playback.page.screenshot({
        path: filepath,
        fullPage: false
      });

      return `/screenshots/playback/${playbackId}/${filename}`;

    } catch (error) {
      logger.error('Failed to take step screenshot', LogCategory.BROWSER, {
        playbackId,
        stepNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return '';
    }
  }

  /**
   * Get active playback sessions
   */
  getActivePlaybacks(): string[] {
    return Array.from(this.activePlaybacks.keys());
  }

  /**
   * Get playback session info
   */
  getPlaybackInfo(playbackId: string): PlaybackSession | null {
    const playback = this.activePlaybacks.get(playbackId);
    return playback ? playback.session : null;
  }

  // Private helper methods

  private async getRecordingSession(recordingSessionId: string): Promise<RecordingSession | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('recording_sessions')
        .select('*')
        .eq('id', recordingSessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as RecordingSession;

    } catch (error) {
      logger.error('Failed to get recording session', LogCategory.BROWSER, {
        recordingSessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private async getRecordingActions(recordingSessionId: string): Promise<RecordedAction[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('recorded_actions')
        .select('*')
        .eq('session_id', recordingSessionId)
        .order('order');

      if (error) {
        throw new Error(`Failed to get recording actions: ${error.message}`);
      }

      return data as RecordedAction[];

    } catch (error) {
      logger.error('Failed to get recording actions', LogCategory.BROWSER, {
        recordingSessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  private emitPlaybackEvent(playbackId: string, data: { action: 'start' | 'pause' | 'resume' | 'stop' | 'step_completed' | 'step_failed'; playback_session?: PlaybackSession; step_result?: PlaybackStepResult }): void {
    const event = {
      type: 'playback' as const,
      session_id: playbackId,
      timestamp: new Date().toISOString(),
      data
    };

    this.wsService.emitToSession(playbackId, 'playback', event);
  }
}