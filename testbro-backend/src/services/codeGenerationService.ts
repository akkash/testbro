import { 
  RecordingSession, 
  RecordedAction, 
  GeneratedPlaywrightTest
} from '../types';
import { supabaseAdmin } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger, LogCategory } from './loggingService';

export interface CodeGenerationOptions {
  language: 'javascript' | 'typescript' | 'python';
  framework: 'playwright' | 'playwright-test';
  includeComments?: boolean;
  includeAssertions?: boolean;
  includeScreenshots?: boolean;
  testName?: string;
  description?: string;
}

export class CodeGenerationService {
  
  /**
   * Generate Playwright test code from a recording session
   */
  async generatePlaywrightTest(
    recordingSessionId: string,
    userId: string,
    options: CodeGenerationOptions
  ): Promise<GeneratedPlaywrightTest> {
    try {
      const [recordingSession, actions] = await Promise.all([
        this.getRecordingSession(recordingSessionId),
        this.getRecordingActions(recordingSessionId)
      ]);

      if (!recordingSession || !actions?.length) {
        throw new Error('Recording session or actions not found');
      }

      const testCode = this.generateTestCode(recordingSession, actions, options);
      const imports = this.generateImports(options);

      const generatedTest: GeneratedPlaywrightTest = {
        id: uuidv4(),
        recording_session_id: recordingSessionId,
        name: options.testName || recordingSession.name || 'Generated Test',
        description: options.description || `Generated from recording: ${recordingSession.name}`,
        test_code: testCode,
        test_framework: options.framework,
        language: options.language,
        imports,
        generated_at: new Date().toISOString(),
        user_id: userId
      };

      const { error } = await supabaseAdmin
        .from('generated_tests')
        .insert(generatedTest);

      if (error) {
        throw new Error(`Failed to save generated test: ${error.message}`);
      }

      logger.info('Generated Playwright test code', LogCategory.BROWSER, {
        recordingSessionId,
        language: options.language,
        actionCount: actions.length
      });

      return generatedTest;

    } catch (error) {
      logger.error('Failed to generate test', LogCategory.BROWSER, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private generateTestCode(
    session: RecordingSession,
    actions: RecordedAction[],
    options: CodeGenerationOptions
  ): string {
    switch (options.language) {
      case 'typescript':
      case 'javascript':
        return this.generateJSCode(session, actions, options);
      case 'python':
        return this.generatePythonCode(session, actions, options);
      default:
        throw new Error(`Unsupported language: ${options.language}`);
    }
  }

  private generateJSCode(
    session: RecordingSession,
    actions: RecordedAction[],
    options: CodeGenerationOptions
  ): string {
    const testName = this.sanitizeTestName(options.testName || session.name || 'Generated Test');
    const isPlaywrightTest = options.framework === 'playwright-test';
    
    let code = '';

    if (options.includeComments) {
      code += `// Generated from TestBro recording: ${session.name}\n`;
      code += `// Total actions: ${actions.length}\n\n`;
    }

    if (isPlaywrightTest) {
      code += `test('${testName}', async ({ page }) => {\n`;
    } else {
      code += `async function ${this.toCamelCase(testName)}() {\n`;
      code += `  const browser = await chromium.launch();\n`;
      code += `  const page = await browser.newPage();\n\n`;
    }

    const indent = isPlaywrightTest ? '  ' : '  ';

    // Navigate to start URL
    code += `${indent}await page.goto('${session.start_url}');\n\n`;

    // Generate actions
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (options.includeComments) {
        code += `${indent}// Step ${i + 1}: ${this.getActionDescription(action)}\n`;
      }
      code += this.generateActionCode(action, indent);
      code += '\n';
    }

    if (options.includeScreenshots) {
      code += `${indent}await page.screenshot({ path: 'final-state.png' });\n`;
    }

    if (!isPlaywrightTest) {
      code += `  await browser.close();\n`;
    }

    code += `}`;

    return code;
  }

  private generatePythonCode(
    session: RecordingSession,
    actions: RecordedAction[],
    options: CodeGenerationOptions
  ): string {
    const testName = this.sanitizeTestName(options.testName || session.name || 'Generated Test');
    let code = '';

    if (options.includeComments) {
      code += `# Generated from TestBro recording: ${session.name}\n`;
      code += `# Total actions: ${actions.length}\n\n`;
    }

    if (options.framework === 'playwright-test') {
      code += `def test_${this.toSnakeCase(testName)}(page):\n`;
    } else {
      code += `async def ${this.toSnakeCase(testName)}():\n`;
      code += `    async with async_playwright() as p:\n`;
      code += `        browser = await p.chromium.launch()\n`;
      code += `        page = await browser.new_page()\n\n`;
    }

    const indent = options.framework === 'playwright-test' ? '    ' : '        ';

    code += `${indent}await page.goto('${session.start_url}')\n\n`;

    // Generate actions
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (options.includeComments) {
        code += `${indent}# Step ${i + 1}: ${this.getActionDescription(action)}\n`;
      }
      code += this.generatePythonActionCode(action, indent);
      code += '\n';
    }

    return code;
  }

  private generateActionCode(action: RecordedAction, indent: string): string {
    const selector = this.escapeSelector(action.element.selector);
    
    switch (action.action_type) {
      case 'click':
        return `${indent}await page.click('${selector}');\n`;
      case 'type':
        const value = this.escapeString(action.value || '');
        return `${indent}await page.fill('${selector}', '${value}');\n`;
      case 'hover':
        return `${indent}await page.hover('${selector}');\n`;
      case 'navigate':
        return `${indent}await page.goto('${action.value}');\n`;
      default:
        return `${indent}// ${action.action_type} action\n`;
    }
  }

  private generatePythonActionCode(action: RecordedAction, indent: string): string {
    const selector = this.escapeSelector(action.element.selector);
    
    switch (action.action_type) {
      case 'click':
        return `${indent}await page.click('${selector}')\n`;
      case 'type':
        const value = this.escapeString(action.value || '');
        return `${indent}await page.fill('${selector}', '${value}')\n`;
      case 'hover':
        return `${indent}await page.hover('${selector}')\n`;
      case 'navigate':
        return `${indent}await page.goto('${action.value}')\n`;
      default:
        return `${indent}# ${action.action_type} action\n`;
    }
  }

  private generateImports(options: CodeGenerationOptions): string[] {
    const imports: string[] = [];
    
    switch (options.language) {
      case 'typescript':
      case 'javascript':
        if (options.framework === 'playwright-test') {
          imports.push("import { test, expect } from '@playwright/test';");
        } else {
          imports.push("import { chromium } from 'playwright';");
        }
        break;
      case 'python':
        imports.push("from playwright.async_api import async_playwright");
        break;
    }
    
    return imports;
  }

  private getActionDescription(action: RecordedAction): string {
    switch (action.action_type) {
      case 'click':
        return `Click on ${action.element.tag_name}`;
      case 'type':
        return `Type "${action.value}" into ${action.element.tag_name}`;
      case 'hover':
        return `Hover over ${action.element.tag_name}`;
      default:
        return `${action.action_type} action`;
    }
  }

  // Helper methods
  private async getRecordingSession(id: string): Promise<RecordingSession | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('recording_sessions')
        .select('*')
        .eq('id', id)
        .single();
      return error ? null : data as RecordingSession;
    } catch {
      return null;
    }
  }

  private async getRecordingActions(sessionId: string): Promise<RecordedAction[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('recorded_actions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order');
      return error ? [] : data as RecordedAction[];
    } catch {
      return [];
    }
  }

  private sanitizeTestName(name: string): string {
    return name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  }

  private toCamelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  private toSnakeCase(str: string): string {
    return str.replace(/\W+/g, ' ').split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase()).join('_');
  }

  private escapeSelector(selector: string): string {
    return selector.replace(/'/g, "\\'");
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}