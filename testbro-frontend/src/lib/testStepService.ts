import { apiClient } from "./api";

interface TestStep {
  id?: string;
  order: number;
  action: string;
  element?: string;
  value?: string;
  description: string;
  timeout?: number;
  screenshot?: boolean;
  ai_context?: string;
}

interface UpdateTestStepData {
  action?: string;
  element?: string;
  value?: string;
  description?: string;
  timeout?: number;
  screenshot?: boolean;
  ai_context?: string;
}

export class TestStepService {
  /**
   * Update a specific test step
   */
  static async updateTestStep(
    testCaseId: string,
    stepId: string,
    stepData: UpdateTestStepData
  ): Promise<{ data: any; error: any }> {
    try {
      const result = await apiClient.patch(`/api/test-cases/${testCaseId}/steps/${stepId}`, stepData);
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error updating test step:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Delete a specific test step
   */
  static async deleteTestStep(
    testCaseId: string,
    stepId: string
  ): Promise<{ data: any; error: any }> {
    try {
      const result = await apiClient.delete(`/api/test-cases/${testCaseId}/steps/${stepId}`);
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error deleting test step:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Add a new test step to a test case
   */
  static async addTestStep(
    testCaseId: string,
    stepData: Omit<TestStep, 'id'>
  ): Promise<{ data: any; error: any }> {
    try {
      const result = await apiClient.post(`/api/test-cases/${testCaseId}/steps`, stepData);
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error adding test step:', error);
      return { data: null, error: error.message };
    }
  }
}