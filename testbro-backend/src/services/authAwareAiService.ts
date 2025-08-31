import { openRouterKey } from '../config/database';
import { logger, LogCategory } from './loggingService';

/**
 * Enhanced AI Service for Authentication-Aware Test Generation
 * 
 * This service extends the standard AI test generation to understand
 * authentication patterns and automatically generate auth steps with
 * secret placeholders.
 */
export class AuthAwareAIService {
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly defaultModel = 'openai/gpt-4-turbo-preview';

  constructor() {
    if (!openRouterKey) {
      throw new Error('OpenRouter API key is required for AI test generation');
    }
  }

  /**
   * Generates test steps with authentication awareness
   */
  async generateAuthAwareTestSteps(
    prompt: string,
    availableSecrets: Array<{ secretKey: string; secretType: string }>,
    projectContext?: {
      url?: string;
      description?: string;
      existingTests?: Array<{ name: string; description: string }>;
    }
  ): Promise<{
    steps: Array<{
      type: 'auth' | 'action' | 'assertion';
      authType?: 'username_password' | 'phone_otp';
      secretKey?: string;
      action?: string;
      selector?: string;
      value?: string;
      description: string;
      generated_code: string;
    }>;
    hasAuthentication: boolean;
    detectedAuthType?: 'username_password' | 'phone_otp';
    suggestedSecretKey?: string;
    reasoning: string;
  }> {
    try {
      logger.info('Starting auth-aware test generation', LogCategory.AI_GENERATION, {
        promptLength: prompt.length,
        availableSecretsCount: availableSecrets.length,
        hasProjectContext: !!projectContext
      });

      const systemPrompt = this.buildAuthAwareSystemPrompt(availableSecrets, projectContext);
      const response = await this.callOpenRouter(systemPrompt, prompt);
      
      return this.parseAuthAwareResponse(response, availableSecrets);
    } catch (error) {
      logger.error('Auth-aware test generation failed', LogCategory.AI_GENERATION, {
        error: error instanceof Error ? error.message : 'Unknown error',
        promptLength: prompt.length
      });
      throw error;
    }
  }

  /**
   * Analyzes a prompt to detect authentication requirements
   */
  async analyzeAuthenticationNeeds(
    prompt: string,
    availableSecrets: Array<{ secretKey: string; secretType: string }>
  ): Promise<{
    requiresAuth: boolean;
    authType?: 'username_password' | 'phone_otp';
    confidence: number;
    suggestedSecret?: string;
    reasoning: string;
  }> {
    try {
      const analysisPrompt = `Analyze this test scenario and determine if it requires authentication:

\"${prompt}\"

Available secrets:
${availableSecrets.map(s => `- ${s.secretKey} (${s.secretType})`).join('\n')}

Respond with JSON only:`;

      const systemPrompt = `You are an expert test analyst. Analyze test scenarios for authentication requirements.

Return JSON with:
{
  \"requiresAuth\": boolean,
  \"authType\": \"username_password\" | \"phone_otp\" | null,
  \"confidence\": 0.0-1.0,
  \"suggestedSecret\": \"secret_key_name\" | null,
  \"reasoning\": \"explanation\"
}

Look for keywords: login, sign in, authenticate, username, password, phone, OTP, verification code, etc.`;

      const response = await this.callOpenRouter(systemPrompt, analysisPrompt);
      return JSON.parse(response.trim());
    } catch (error) {
      logger.error('Auth analysis failed', LogCategory.AI_GENERATION, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback analysis
      const requiresAuth = /\\b(login|sign\\s?in|authenticate|username|password|phone|otp|verification|log\\s?in)\\b/i.test(prompt);
      return {
        requiresAuth,
        confidence: requiresAuth ? 0.6 : 0.9,
        reasoning: 'Fallback keyword analysis due to AI service error'
      };
    }
  }

  /**
   * Generates selectors for authentication elements
   */
  async generateAuthSelectors(
    pageContext: {
      url: string;
      html?: string;
      screenshot?: string;
    },
    authType: 'username_password' | 'phone_otp'
  ): Promise<{
    selectors: {
      usernameField?: string;
      passwordField?: string;
      phoneField?: string;
      otpField?: string;
      submitButton?: string;
      phoneSubmitButton?: string;
      otpSubmitButton?: string;
    };
    confidence: number;
    reasoning: string;
  }> {
    try {
      const selectorPrompt = `Generate CSS selectors for a ${authType.replace('_', '/')} authentication form.

Page URL: ${pageContext.url}
${pageContext.html ? `HTML snippet: ${pageContext.html.substring(0, 2000)}...` : ''}

Return JSON with the most reliable selectors:`;

      const systemPrompt = `You are an expert at web automation. Generate robust CSS selectors for authentication forms.

For username_password, return:
{
  \"selectors\": {
    \"usernameField\": \"CSS selector\",
    \"passwordField\": \"CSS selector\",
    \"submitButton\": \"CSS selector\"
  },
  \"confidence\": 0.0-1.0,
  \"reasoning\": \"explanation\"
}

For phone_otp, return:
{
  \"selectors\": {
    \"phoneField\": \"CSS selector\",
    \"phoneSubmitButton\": \"CSS selector\",
    \"otpField\": \"CSS selector\",
    \"otpSubmitButton\": \"CSS selector\"
  },
  \"confidence\": 0.0-1.0,
  \"reasoning\": \"explanation\"
}

Prefer ID selectors, then name attributes, then specific class combinations. Avoid overly specific selectors.`;

      const response = await this.callOpenRouter(systemPrompt, selectorPrompt);
      return JSON.parse(response.trim());
    } catch (error) {
      logger.error('Auth selector generation failed', LogCategory.AI_GENERATION, {
        error: error instanceof Error ? error.message : 'Unknown error',
        authType,
        url: pageContext.url
      });
      
      // Fallback selectors
      if (authType === 'username_password') {
        return {
          selectors: {
            usernameField: '[name=\"username\"], [name=\"email\"], #username, #email',
            passwordField: '[name=\"password\"], #password, [type=\"password\"]',
            submitButton: '[type=\"submit\"], button[type=\"submit\"], #login, .login-btn'
          },
          confidence: 0.5,
          reasoning: 'Fallback selectors due to AI service error'
        };
      } else {
        return {
          selectors: {
            phoneField: '[name=\"phone\"], [name=\"mobile\"], #phone, #mobile',
            phoneSubmitButton: '#send-otp, .send-otp, button[type=\"submit\"]',
            otpField: '[name=\"otp\"], [name=\"code\"], #otp, #code',
            otpSubmitButton: '#verify, .verify, button[type=\"submit\"]'
          },
          confidence: 0.5,
          reasoning: 'Fallback selectors due to AI service error'
        };
      }
    }
  }

  /**
   * Enhances existing test steps with authentication
   */
  async enhanceTestWithAuth(
    existingSteps: Array<{
      action: string;
      selector?: string;
      value?: string;
      description: string;
    }>,
    authRequirement: {
      authType: 'username_password' | 'phone_otp';
      secretKey: string;
      insertPosition?: number; // Where to insert auth steps (default: beginning)
    }
  ): Promise<{
    enhancedSteps: Array<{
      type: 'auth' | 'action' | 'assertion';
      authType?: 'username_password' | 'phone_otp';
      secretKey?: string;
      action?: string;
      selector?: string;
      value?: string;
      description: string;
      generated_code: string;
    }>;
    insertedAuthSteps: number;
  }> {
    const insertPosition = authRequirement.insertPosition || 0;
    const authSteps = this.generateAuthSteps(authRequirement.authType, authRequirement.secretKey);
    
    const enhancedSteps = [...existingSteps];
    authSteps.reverse().forEach(authStep => {
      enhancedSteps.splice(insertPosition, 0, authStep);
    });

    return {
      enhancedSteps: enhancedSteps.map(step => ({
        type: 'action' as const,
        ...step
      })),
      insertedAuthSteps: authSteps.length
    };
  }

  /**
   * Builds the system prompt for auth-aware test generation
   */
  private buildAuthAwareSystemPrompt(
    availableSecrets: Array<{ secretKey: string; secretType: string }>,
    projectContext?: any
  ): string {
    const secretsList = availableSecrets.length > 0 
      ? availableSecrets.map(s => `- ${s.secretKey} (${s.secretType.replace('_', '/')})`).join('\n')
      : 'No secrets available - user must create secrets first';

    return `You are an expert test automation engineer specializing in authentication-aware test generation.

Your task is to generate comprehensive test steps that include authentication when needed.

Available secrets:
${secretsList}

When authentication is detected:
1. Always start with appropriate auth steps
2. Use secret placeholders like {{secret.SECRET_KEY.username}} and {{secret.SECRET_KEY.password}}
3. Include proper selectors for form elements
4. Generate working Playwright code

For username/password auth, generate steps like:
- Fill username field with {{secret.SECRET_KEY.username}}
- Fill password field with {{secret.SECRET_KEY.password}}
- Click submit button
- Wait for navigation

For phone/OTP auth, generate steps like:
- Fill phone field with {{secret.SECRET_KEY.phone}}
- Click send OTP button
- Wait for OTP
- Fill OTP field with received code
- Click verify button

Return JSON with:
{
  \"steps\": [
    {
      \"type\": \"auth|action|assertion\",
      \"authType\": \"username_password|phone_otp\" (if type is auth),
      \"secretKey\": \"secret_name\" (if type is auth),
      \"action\": \"click|type|navigate|wait|verify\",
      \"selector\": \"CSS selector\",
      \"value\": \"value or secret placeholder\",
      \"description\": \"human readable description\",
      \"generated_code\": \"await page.action('selector', 'value');\"
    }
  ],
  \"hasAuthentication\": boolean,
  \"detectedAuthType\": \"username_password|phone_otp\" (if hasAuthentication),
  \"suggestedSecretKey\": \"secret_name\" (if hasAuthentication),
  \"reasoning\": \"explanation of auth detection and approach\"
}

Project context:
${projectContext ? JSON.stringify(projectContext, null, 2) : 'None provided'}`;
  }

  /**
   * Calls OpenRouter API
   */
  private async callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(this.openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://testbro.ai',
        'X-Title': 'TestBro.ai Auth-Aware Test Generation'
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Parses AI response for auth-aware test generation
   */
  private parseAuthAwareResponse(
    response: string,
    availableSecrets: Array<{ secretKey: string; secretType: string }>
  ) {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response.trim());
      
      // Validate and enhance the response
      if (parsed.hasAuthentication && !parsed.suggestedSecretKey && availableSecrets.length > 0) {
        // Auto-suggest a compatible secret
        const compatibleSecret = availableSecrets.find(s => 
          s.secretType === parsed.detectedAuthType
        );
        if (compatibleSecret) {
          parsed.suggestedSecretKey = compatibleSecret.secretKey;
        }
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse AI response', LogCategory.AI_GENERATION, {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseLength: response.length
      });
      
      // Fallback response
      return {
        steps: [],
        hasAuthentication: false,
        reasoning: 'Failed to parse AI response, please try again'
      };
    }
  }

  /**
   * Generates auth steps for a given auth type
   */
  private generateAuthSteps(
    authType: 'username_password' | 'phone_otp',
    secretKey: string
  ) {
    if (authType === 'username_password') {
      return [
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'type',
          selector: '[name=\"username\"], #username',
          value: `{{secret.${secretKey}.username}}`,
          description: 'Fill username field',
          generated_code: `await page.fill('[name=\"username\"]', await secretsService.get('${secretKey}', 'username'));`
        },
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'type',
          selector: '[name=\"password\"], #password',
          value: `{{secret.${secretKey}.password}}`,
          description: 'Fill password field',
          generated_code: `await page.fill('[name=\"password\"]', await secretsService.get('${secretKey}', 'password'));`
        },
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'click',
          selector: '[type=\"submit\"], #login',
          description: 'Submit login form',
          generated_code: `await page.click('[type=\"submit\"]');`
        }
      ];
    } else {
      return [
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'type',
          selector: '[name=\"phone\"], #phone',
          value: `{{secret.${secretKey}.phone}}`,
          description: 'Fill phone number',
          generated_code: `await page.fill('[name=\"phone\"]', await secretsService.get('${secretKey}', 'phone'));`
        },
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'click',
          selector: '#send-otp, .send-otp',
          description: 'Send OTP',
          generated_code: `await page.click('#send-otp');`
        },
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'wait',
          description: 'Wait for OTP delivery',
          generated_code: `await page.waitForTimeout(5000); // Wait for SMS delivery`
        },
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'type',
          selector: '[name="otp"], #otp',
          value: 'OTP_CODE',
          description: 'Fill OTP code',
          generated_code: `const otp = await otpProvider.getOtp(await secretsService.get('${secretKey}', 'phone'));
await page.fill('[name="otp"]', otp);`
        },
        {
          type: 'auth' as const,
          authType,
          secretKey,
          action: 'click',
          selector: '#verify, .verify',
          description: 'Verify OTP',
          generated_code: `await page.click('#verify');`
        }
      ];
    }
  }
}

// Export singleton instance
export const authAwareAI = new AuthAwareAIService();

// Types for external use
export interface AuthAwareTestStep {
  type: 'auth' | 'action' | 'assertion';
  authType?: 'username_password' | 'phone_otp';
  secretKey?: string;
  action?: string;
  selector?: string;
  value?: string;
  description: string;
  generated_code: string;
}

export interface AuthRequirement {
  requiresAuth: boolean;
  authType?: 'username_password' | 'phone_otp';
  confidence: number;
  suggestedSecret?: string;
  reasoning: string;
}"
