import { apiClient } from '../api'

export interface TestSuite {
  id: string
  name: string
  description: string
  test_case_ids: string[]
  project_id: string
  target_ids: string[]
  environment: 'staging' | 'production' | 'development'
  schedule?: {
    enabled: boolean
    cron: string
    timezone: string
  }
  created_at: string
  updated_at: string
  created_by: string
  tags: string[]
  is_active: boolean
}

export interface CreateTestSuiteData {
  name: string
  description: string
  test_case_ids: string[]
  project_id: string
  target_ids: string[]
  environment: 'staging' | 'production' | 'development'
  tags?: string[]
  schedule?: {
    enabled: boolean
    cron: string
    timezone: string
  }
}

export class TestSuiteService {
  static async listTestSuites(params?: {
    page?: number
    limit?: number
    project_id?: string
    environment?: string
    is_active?: boolean
  }) {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.project_id) queryParams.append('project_id', params.project_id)
      if (params?.environment) queryParams.append('environment', params.environment)
      if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())

      const endpoint = `/api/test-suites${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await apiClient.get(endpoint)
      return { data: result.data, meta: result.meta, error: null }
    } catch (error: any) {
      console.error('Error fetching test suites:', error)
      return { data: [], meta: null, error: error.message }
    }
  }

  static async getTestSuite(id: string) {
    try {
      const result = await apiClient.get(`/api/test-suites/${id}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching test suite:', error)
      return { data: null, error: error.message }
    }
  }

  static async createTestSuite(suiteData: CreateTestSuiteData) {
    try {
      const result = await apiClient.post('/api/test-suites', suiteData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error creating test suite:', error)
      return { data: null, error: error.message }
    }
  }

  static async updateTestSuite(id: string, suiteData: Partial<CreateTestSuiteData>) {
    try {
      const result = await apiClient.put(`/api/test-suites/${id}`, suiteData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error updating test suite:', error)
      return { data: null, error: error.message }
    }
  }

  static async deleteTestSuite(id: string) {
    try {
      await apiClient.delete(`/api/test-suites/${id}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error deleting test suite:', error)
      return { error: error.message }
    }
  }

  static async executeTestSuite(id: string, config?: { browser?: string; environment?: string }) {
    try {
      const result = await apiClient.post(`/api/test-suites/${id}/execute`, config)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error executing test suite:', error)
      return { data: null, error: error.message }
    }
  }
}