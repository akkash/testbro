import { APIResponse } from '../types/api';
import { APITestStep, APITestResult, APIRequestConfig } from '../types/apiTesting';
import { logger, LogCategory } from './loggingService';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { validateResponseSchema } from '../utils/schemaValidator';

export class APITestingService {
  private requestTimeout: number = 30000; // 30 seconds default

  /**
   * Execute an API test step
   */
  async executeAPIStep(
    step: APITestStep,
    environmentVars: Record<string, string> = {},
    dataContext: Record<string, any> = {}
  ): Promise<APITestResult> {
    const startTime = Date.now();
    
    try {
      // Replace variables in the request configuration
      const processedConfig = this.processRequestConfig(step.request, environmentVars, dataContext);
      
      // Execute the HTTP request
      const response = await this.executeHTTPRequest(processedConfig);
      
      // Validate the response
      const validationResults = await this.validateResponse(response, step.validations);
      
      // Extract data for use in subsequent steps
      const extractedData = this.extractResponseData(response, step.dataExtractions);
      
      const executionTime = Date.now() - startTime;
      
      const result: APITestResult = {
        stepId: step.id,
        success: validationResults.every(v => v.passed),
        executionTime,
        request: {
          method: processedConfig.method,
          url: processedConfig.url,
          headers: processedConfig.headers,
          body: processedConfig.data
        },
        response: {
          status: response.status,
          headers: response.headers,
          body: response.data,
          size: JSON.stringify(response.data).length
        },
        validations: validationResults,
        extractedData,
        timestamp: new Date().toISOString()
      };

      logger.info('API test step executed successfully', LogCategory.TEST_EXECUTION, {
        stepId: step.id,
        method: processedConfig.method,
        url: processedConfig.url,
        status: response.status,
        executionTime
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const result: APITestResult = {
        stepId: step.id,
        success: false,
        executionTime,
        request: step.request,
        error: error instanceof Error ? error.message : 'Unknown error',
        validations: [],
        extractedData: {},
        timestamp: new Date().toISOString()
      };

      logger.error('API test step failed', LogCategory.TEST_EXECUTION, {
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return result;
    }
  }

  /**
   * Process request configuration by replacing variables
   */
  private processRequestConfig(
    config: APIRequestConfig,
    environmentVars: Record<string, string>,
    dataContext: Record<string, any>
  ): AxiosRequestConfig {
    const allVars = { ...environmentVars, ...dataContext };
    
    return {
      method: config.method.toLowerCase() as any,
      url: this.replaceVariables(config.url, allVars),
      headers: this.replaceVariablesInObject(config.headers || {}, allVars),
      data: config.body ? this.replaceVariablesInObject(config.body, allVars) : undefined,
      timeout: this.requestTimeout,
      validateStatus: () => true // Don't throw on HTTP error status
    };
  }

  /**
   * Execute HTTP request using axios
   */
  private async executeHTTPRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return await axios(config);
  }

  /**
   * Validate API response against defined rules
   */
  private async validateResponse(
    response: AxiosResponse,
    validations: any[]
  ): Promise<Array<{ rule: string; passed: boolean; message: string }>> {
    const results = [];

    for (const validation of validations) {
      let passed = false;
      let message = '';

      switch (validation.type) {
        case 'status_code':
          passed = response.status === validation.expectedValue;
          message = passed 
            ? `Status code ${response.status} matches expected value`
            : `Expected status ${validation.expectedValue}, got ${response.status}`;
          break;

        case 'response_time':
          const responseTime = response.config.metadata?.endTime - response.config.metadata?.startTime;
          passed = responseTime <= validation.maxTime;
          message = passed
            ? `Response time ${responseTime}ms is within limit`
            : `Response time ${responseTime}ms exceeds limit of ${validation.maxTime}ms`;
          break;

        case 'header_exists':
          passed = validation.headerName in response.headers;
          message = passed
            ? `Header ${validation.headerName} exists`
            : `Header ${validation.headerName} not found`;
          break;

        case 'body_contains':
          const bodyString = JSON.stringify(response.data);
          passed = bodyString.includes(validation.expectedValue);
          message = passed
            ? `Response body contains expected value`
            : `Response body does not contain: ${validation.expectedValue}`;
          break;

        case 'json_schema':
          try {
            passed = validateResponseSchema(response.data, validation.schema);
            message = passed
              ? 'Response matches expected schema'
              : 'Response does not match expected schema';
          } catch (error) {
            passed = false;
            message = `Schema validation error: ${error.message}`;
          }
          break;

        case 'json_path':
          try {
            const value = this.getValueByPath(response.data, validation.path);
            passed = value === validation.expectedValue;
            message = passed
              ? `JSONPath ${validation.path} has expected value`
              : `JSONPath ${validation.path}: expected ${validation.expectedValue}, got ${value}`;
          } catch (error) {
            passed = false;
            message = `JSONPath validation error: ${error.message}`;
          }
          break;
      }

      results.push({
        rule: validation.type,
        passed,
        message
      });
    }

    return results;
  }

  /**
   * Extract data from API response for use in subsequent steps
   */
  private extractResponseData(
    response: AxiosResponse,
    extractions: Array<{ name: string; source: 'body' | 'header' | 'status'; path?: string }>
  ): Record<string, any> {
    const extractedData: Record<string, any> = {};

    for (const extraction of extractions) {
      try {
        switch (extraction.source) {
          case 'status':
            extractedData[extraction.name] = response.status;
            break;
          
          case 'header':
            extractedData[extraction.name] = response.headers[extraction.path!];
            break;
          
          case 'body':
            if (extraction.path) {
              extractedData[extraction.name] = this.getValueByPath(response.data, extraction.path);
            } else {
              extractedData[extraction.name] = response.data;
            }
            break;
        }
      } catch (error) {
        logger.warn('Data extraction failed', LogCategory.TEST_EXECUTION, {
          extractionName: extraction.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return extractedData;
  }

  /**
   * Replace variables in a string using {{variable}} syntax
   */
  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = variables[varName.trim()];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Replace variables in an object recursively
   */
  private replaceVariablesInObject(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, variables));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, variables);
      }
      return result;
    }
    
    return obj;
  }

  /**
   * Get value from object using dot notation path
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}