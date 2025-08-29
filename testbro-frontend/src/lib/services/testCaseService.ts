import { apiClient } from '../api'

export interface TestCase {
  id: string
  name: string
  description: string
  type: 'e2e' | 'ui' | 'api' | 'performance'
  status: 'draft' | 'active' | 'archived'
  steps: TestStep[]
  project_id: string
  target_id: string
  suite_id?: string
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  ai_generated: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface TestStep {
  id: string
  order: number
  action: 'click' | 'type' | 'navigate' | 'wait' | 'verify' | 'upload' | 'select'
  element: string
  value?: string
  description: string
  timeout?: number
  screenshot?: boolean
  ai_context?: string
}

export interface CreateTestCaseData {
  name: string
  description: string
  type: 'e2e' | 'ui' | 'api' | 'performance'
  project_id: string
  target_id: string
  suite_id?: string
  steps?: Omit<TestStep, 'id'>[]
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export class TestCaseService {
  static async listTestCases(params?: {
    page?: number
    limit?: number
    project_id?: string
    suite_id?: string
    target_id?: string
    status?: string
    priority?: string
    ai_generated?: boolean
    tags?: string[]
    search?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.project_id) queryParams.append('project_id', params.project_id)
      if (params?.suite_id) queryParams.append('suite_id', params.suite_id)
      if (params?.target_id) queryParams.append('target_id', params.target_id)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.priority) queryParams.append('priority', params.priority)
      if (params?.ai_generated !== undefined) queryParams.append('ai_generated', params.ai_generated.toString())
      if (params?.search) queryParams.append('search', params.search)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params?.sort_order) queryParams.append('sort_order', params.sort_order)
      if (params?.tags) {
        params.tags.forEach(tag => queryParams.append('tags', tag))
      }

      const endpoint = `/api/test-cases${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await apiClient.get(endpoint)
      return { data: result.data, meta: result.meta, error: null }
    } catch (error: any) {
      console.error('Error fetching test cases:', error)
      return { data: [], meta: null, error: error.message }
    }
  }

  static async getTestCase(id: string) {
    try {
      const result = await apiClient.get(`/api/test-cases/${id}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching test case:', error)
      return { data: null, error: error.message }
    }
  }

  static async createTestCase(testCaseData: CreateTestCaseData) {
    try {
      const result = await apiClient.post('/api/test-cases', testCaseData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error creating test case:', error)
      return { data: null, error: error.message }
    }
  }

  static async updateTestCase(id: string, testCaseData: Partial<CreateTestCaseData>) {
    try {
      const result = await apiClient.put(`/api/test-cases/${id}`, testCaseData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error updating test case:', error)
      return { data: null, error: error.message }
    }
  }

  static async deleteTestCase(id: string) {
    try {
      await apiClient.delete(`/api/test-cases/${id}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error deleting test case:', error)
      return { error: error.message }
    }
  }

  static async duplicateTestCase(id: string, name?: string, description?: string) {
    try {
      const result = await apiClient.post(`/api/test-cases/${id}/duplicate`, {
        name,
        description
      })
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error duplicating test case:', error)
      return { data: null, error: error.message }
    }
  }
}