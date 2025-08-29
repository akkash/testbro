import { Page } from 'playwright';
import { 
  RecordingSession, 
  RecordedAction, 
  BrowserSession,
  RecordingEvent,
  WebSocketEvent
} from '../types';
import { supabaseAdmin, TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketService } from './websocketService';
import { logger, LogCategory } from './loggingService';
import path from 'path';
import fs from 'fs/promises';

export interface RecordingOptions {
  captureScreenshots?: boolean;
  includeHoverEvents?: boolean;
  includeScrollEvents?: boolean;
  includeKeyboardEvents?: boolean;
  debounceMs?: number;
  excludeSelectors?: string[];
}

export class ActionRecordingService {
  private activeRecordings = new Map<string, {
    session: RecordingSession;
    page: Page;
    actions: RecordedAction[];
    lastActionTime: number;
  }>();

  private wsService: WebSocketService;

  // JavaScript code to inject for recording DOM events
  private readonly recordingScript = `
    (function() {
      if (window.__testbroRecorder) {
        return; // Already injected
      }

      window.__testbroRecorder = {
        isRecording: false,
        actions: [],
        options: {},
        sessionId: null,
        
        // Utility functions
        generateSelector: function(element) {
          if (element.id) {
            return '#' + element.id;
          }
          
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 3);
            if (classes.length > 0) {
              return element.tagName.toLowerCase() + '.' + classes.join('.');
            }
          }
          
          // Generate nth-child selector
          let selector = element.tagName.toLowerCase();
          let parent = element.parentElement;
          
          while (parent && parent !== document.body) {
            const siblings = Array.from(parent.children).filter(child => 
              child.tagName === element.tagName
            );
            
            if (siblings.length > 1) {
              const index = siblings.indexOf(element) + 1;
              selector = parent.tagName.toLowerCase() + ' > ' + selector + ':nth-child(' + index + ')';
            } else {
              selector = parent.tagName.toLowerCase() + ' > ' + selector;
            }
            
            element = parent;
            parent = parent.parentElement;
          }
          
          return selector;
        },
        
        generateXPath: function(element) {
          if (element.id) {
            return '//*[@id="' + element.id + '"]';
          }
          
          const components = [];
          let current = element;
          
          while (current && current !== document.documentElement) {
            let index = 1;
            let sibling = current.previousElementSibling;
            
            while (sibling) {
              if (sibling.tagName === current.tagName) {
                index++;
              }
              sibling = sibling.previousElementSibling;
            }
            
            const tagName = current.tagName.toLowerCase();
            const component = index > 1 ? tagName + '[' + index + ']' : tagName;
            components.unshift(component);
            
            current = current.parentElement;
          }
          
          return '/' + components.join('/');
        },
        
        getElementInfo: function(element) {
          const rect = element.getBoundingClientRect();
          const attributes = {};
          
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            attributes[attr.name] = attr.value;
          }
          
          return {
            selector: this.generateSelector(element),
            xpath: this.generateXPath(element),
            text_content: element.textContent ? element.textContent.substring(0, 200) : '',
            tag_name: element.tagName.toLowerCase(),
            attributes: attributes,
            bounding_box: {
              x: rect.x + window.scrollX,
              y: rect.y + window.scrollY,
              width: rect.width,
              height: rect.height
            }
          };
        },
        
        recordAction: function(actionType, element, event, value) {
          if (!this.isRecording) return;
          
          const now = Date.now();
          
          // Debounce rapid events
          if (this.lastActionTime && now - this.lastActionTime < (this.options.debounceMs || 100)) {
            if (['scroll', 'mousemove', 'mouseenter', 'mouseleave'].includes(actionType)) {
              return;
            }
          }
          
          this.lastActionTime = now;
          
          // Check excluded selectors
          if (this.options.excludeSelectors && this.options.excludeSelectors.length > 0) {
            const selector = this.generateSelector(element);
            for (const excludeSelector of this.options.excludeSelectors) {
              if (element.matches && element.matches(excludeSelector)) {
                return;
              }
            }
          }
          
          const action = {
            id: this.generateId(),
            session_id: this.sessionId,
            order: this.actions.length + 1,
            timestamp: new Date().toISOString(),
            action_type: actionType,
            element: this.getElementInfo(element),
            value: value || null,
            coordinates: event ? {
              x: event.clientX + window.scrollX,
              y: event.clientY + window.scrollY
            } : null,
            modifiers: event ? this.getModifiers(event) : [],
            page_url: window.location.href,
            viewport_size: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          };
          
          this.actions.push(action);
          
          // Send to backend
          this.sendActionToBackend(action);
        },
        
        getModifiers: function(event) {
          const modifiers = [];
          if (event.ctrlKey) modifiers.push('ctrl');
          if (event.shiftKey) modifiers.push('shift');
          if (event.altKey) modifiers.push('alt');
          if (event.metaKey) modifiers.push('meta');
          return modifiers;
        },
        
        generateId: function() {
          return 'action_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        },
        
        sendActionToBackend: function(action) {
          fetch('/api/recording/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(action)
          }).catch(error => {
            console.error('Failed to send action to backend:', error);
          });
        },
        
        // Event handlers
        handleClick: function(event) {
          if (event.target && event.target !== document) {
            this.recordAction('click', event.target, event);
          }
        },
        
        handleKeydown: function(event) {
          if (!this.options.includeKeyboardEvents) return;
          
          if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
            return; // Handle in input events
          }
          
          this.recordAction('keypress', event.target, event, event.key);
        },
        
        handleInput: function(event) {
          if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
            this.recordAction('type', event.target, event, event.target.value);
          }
        },
        
        handleChange: function(event) {
          if (event.target && event.target.tagName === 'SELECT') {
            this.recordAction('select', event.target, event, event.target.value);
          }
        },
        
        handleScroll: function(event) {
          if (!this.options.includeScrollEvents) return;
          
          this.recordAction('scroll', document.documentElement, null, {
            scrollX: window.scrollX,
            scrollY: window.scrollY
          });
        },
        
        handleMouseEnter: function(event) {
          if (!this.options.includeHoverEvents) return;
          
          if (event.target && event.target !== document) {
            this.recordAction('hover', event.target, event);
          }
        },
        
        handleDragStart: function(event) {
          if (event.target) {
            this.recordAction('drag', event.target, event);
          }
        },
        
        handleDrop: function(event) {
          if (event.target) {
            this.recordAction('drop', event.target, event);
          }
        },
        
        // Start/stop recording
        startRecording: function(sessionId, options = {}) {
          this.sessionId = sessionId;
          this.options = options;
          this.isRecording = true;
          this.actions = [];
          this.lastActionTime = 0;
          
          // Add event listeners
          document.addEventListener('click', this.handleClick.bind(this), true);
          document.addEventListener('keydown', this.handleKeydown.bind(this), true);
          document.addEventListener('input', this.handleInput.bind(this), true);
          document.addEventListener('change', this.handleChange.bind(this), true);
          document.addEventListener('scroll', this.handleScroll.bind(this), true);
          document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
          document.addEventListener('dragstart', this.handleDragStart.bind(this), true);
          document.addEventListener('drop', this.handleDrop.bind(this), true);
          
          console.log('TestBro recorder started for session:', sessionId);
        },
        
        stopRecording: function() {
          this.isRecording = false;
          
          // Remove event listeners
          document.removeEventListener('click', this.handleClick.bind(this), true);
          document.removeEventListener('keydown', this.handleKeydown.bind(this), true);
          document.removeEventListener('input', this.handleInput.bind(this), true);
          document.removeEventListener('change', this.handleChange.bind(this), true);
          document.removeEventListener('scroll', this.handleScroll.bind(this), true);
          document.removeEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
          document.removeEventListener('dragstart', this.handleDragStart.bind(this), true);
          document.removeEventListener('drop', this.handleDrop.bind(this), true);
          
          console.log('TestBro recorder stopped');
          return this.actions;
        },
        
        pauseRecording: function() {
          this.isRecording = false;
        },
        
        resumeRecording: function() {
          this.isRecording = true;
        }
      };
    })();
  `;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Start recording actions for a browser session
   */
  async startRecording(
    browserSessionId: string,
    page: Page,
    name: string,
    projectId: string,
    targetId: string,
    userId: string,
    options: RecordingOptions = {}
  ): Promise<RecordingSession> {
    const sessionId = uuidv4();

    try {
      // Create recording session
      const session: RecordingSession = {
        id: sessionId,
        name,
        description: '',
        browser_session_id: browserSessionId,
        project_id: projectId,
        target_id: targetId,
        user_id: userId,
        status: 'recording',
        actions: [],
        start_url: page.url(),
        total_duration_ms: 0,
        created_at: new Date().toISOString(),
        tags: []
      };

      // Insert into database
      const { error } = await supabaseAdmin
        .from('recording_sessions')
        .insert(session);

      if (error) {
        throw new Error(`Failed to create recording session: ${error.message}`);
      }

      // Inject recording script into page
      await page.addInitScript(this.recordingScript);
      await page.evaluate(this.recordingScript);

      // Start recording with options
      await page.evaluate(`
        window.__testbroRecorder.startRecording('${sessionId}', ${JSON.stringify(options)});
      `);

      // Store active recording
      this.activeRecordings.set(sessionId, {
        session,
        page,
        actions: [],
        lastActionTime: Date.now()
      });

      // Emit recording started event
      this.emitRecordingEvent(sessionId, {
        action: 'start',
        recording_session: session
      });

      logger.info('Recording session started', LogCategory.BROWSER, {
        sessionId,
        browserSessionId,
        name,
        projectId
      });

      return session;

    } catch (error) {
      logger.error('Failed to start recording', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Stop recording and save session
   */
  async stopRecording(sessionId: string): Promise<RecordingSession> {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    try {
      // Stop recording in browser
      const finalActions = await recording.page.evaluate(`
        return window.__testbroRecorder.stopRecording();
      `) as RecordedAction[] | null;

      // Calculate total duration
      const totalDuration = Date.now() - recording.lastActionTime;

      // Update session
      const updatedSession: RecordingSession = {
        ...recording.session,
        status: 'completed',
        actions: finalActions || recording.actions,
        total_duration_ms: totalDuration,
        completed_at: new Date().toISOString()
      };

      // Save to database
      const { error } = await supabaseAdmin
        .from('recording_sessions')
        .update({
          status: 'completed',
          actions: finalActions || recording.actions,
          total_duration_ms: totalDuration,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        throw new Error(`Failed to update recording session: ${error.message}`);
      }

      // Save individual actions
      if (finalActions && finalActions.length > 0) {
        await this.saveActions(sessionId, finalActions);
      }

      // Remove from active recordings
      this.activeRecordings.delete(sessionId);

      // Emit recording completed event
      this.emitRecordingEvent(sessionId, {
        action: 'stop',
        recording_session: updatedSession
      });

      logger.info('Recording session completed', LogCategory.BROWSER, {
        sessionId,
        actionCount: finalActions?.length || 0,
        duration: totalDuration
      });

      return updatedSession;

    } catch (error) {
      logger.error('Failed to stop recording', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(sessionId: string): Promise<void> {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    try {
      await recording.page.evaluate(`
        window.__testbroRecorder.pauseRecording();
      `);

      recording.session.status = 'paused';

      // Update database
      await supabaseAdmin
        .from('recording_sessions')
        .update({ status: 'paused' })
        .eq('id', sessionId);

      // Emit event
      this.emitRecordingEvent(sessionId, {
        action: 'pause',
        recording_session: recording.session
      });

      logger.info('Recording session paused', LogCategory.BROWSER, { sessionId });

    } catch (error) {
      logger.error('Failed to pause recording', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(sessionId: string): Promise<void> {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    try {
      await recording.page.evaluate(`
        window.__testbroRecorder.resumeRecording();
      `);

      recording.session.status = 'recording';

      // Update database
      await supabaseAdmin
        .from('recording_sessions')
        .update({ status: 'recording' })
        .eq('id', sessionId);

      // Emit event
      this.emitRecordingEvent(sessionId, {
        action: 'resume',
        recording_session: recording.session
      });

      logger.info('Recording session resumed', LogCategory.BROWSER, { sessionId });

    } catch (error) {
      logger.error('Failed to resume recording', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Record an action manually (called from the injected script)
   */
  async recordAction(action: RecordedAction): Promise<void> {
    const recording = this.activeRecordings.get(action.session_id);
    if (!recording) {
      return; // Recording might have been stopped
    }

    try {
      // Add screenshot if enabled
      if (recording.session && action.action_type === 'click') {
        const screenshotDir = path.join(process.cwd(), 'screenshots', action.session_id);
        await fs.mkdir(screenshotDir, { recursive: true });
        
        const filename = `action_${action.order}_${Date.now()}.png`;
        const filepath = path.join(screenshotDir, filename);
        
        await recording.page.screenshot({
          path: filepath,
          fullPage: false
        });

        action.screenshot_after = `/screenshots/${action.session_id}/${filename}`;
      }

      // Add to memory
      recording.actions.push(action);

      // Save to database
      await supabaseAdmin
        .from('recorded_actions')
        .insert(action);

      // Emit event
      this.emitRecordingEvent(action.session_id, {
        action: 'action_recorded',
        recorded_action: action
      });

      logger.debug('Action recorded', LogCategory.BROWSER, {
        sessionId: action.session_id,
        actionType: action.action_type,
        order: action.order
      });

    } catch (error) {
      logger.error('Failed to record action', LogCategory.BROWSER, {
        sessionId: action.session_id,
        actionType: action.action_type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active recording sessions
   */
  getActiveRecordings(): string[] {
    return Array.from(this.activeRecordings.keys());
  }

  /**
   * Get recording session info
   */
  getRecordingInfo(sessionId: string): RecordingSession | null {
    const recording = this.activeRecordings.get(sessionId);
    return recording ? recording.session : null;
  }

  /**
   * Get recording session from database
   */
  async getRecordingSession(sessionId: string): Promise<RecordingSession | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('recording_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as RecordingSession;

    } catch (error) {
      logger.error('Failed to get recording session', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get actions for a recording session
   */
  async getRecordingActions(sessionId: string): Promise<RecordedAction[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('recorded_actions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order');

      if (error) {
        throw new Error(`Failed to get recording actions: ${error.message}`);
      }

      return data as RecordedAction[];

    } catch (error) {
      logger.error('Failed to get recording actions', LogCategory.BROWSER, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // Private helper methods

  private async saveActions(sessionId: string, actions: RecordedAction[]): Promise<void> {
    if (!actions || actions.length === 0) return;

    try {
      const { error } = await supabaseAdmin
        .from('recorded_actions')
        .insert(actions);

      if (error) {
        throw new Error(`Failed to save actions: ${error.message}`);
      }

    } catch (error) {
      logger.error('Failed to save actions', LogCategory.BROWSER, {
        sessionId,
        actionCount: actions.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private emitRecordingEvent(sessionId: string, data: { action: 'start' | 'pause' | 'resume' | 'stop' | 'action_recorded'; recording_session?: RecordingSession; recorded_action?: RecordedAction }): void {
    const event = {
      type: 'recording' as const,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      data
    };

    this.wsService.emitToSession(sessionId, 'recording', event);
  }
}