import { apiClient } from '../api'

export interface TestExecution {
  id: string
  test_case_id: string
  suite_id?: string
  project_id: string
  target_id: string
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled'
  started_at: string
  completed_at?: string
  duration_seconds?: number
  browser: string
  environment: string
  results?: any[]
  metrics?: any
  error_message?: string
  initiated_by: string
}

export interface ExecuteTestRequest {
  test_case_id?: string
  test_suite_id?: string
  project_id: string
  target_id: string
  browser?: string
  environment?: string
}

export class ExecutionService {
  static async listExecutions(params?: {
    page?: number
    limit?: number
    project_id?: string
    status?: string
    browser?: string
    environment?: string
    date_from?: string
    date_to?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.project_id) queryParams.append('project_id', params.project_id)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.browser) queryParams.append('browser', params.browser)
      if (params?.environment) queryParams.append('environment', params.environment)
      if (params?.date_from) queryParams.append('date_from', params.date_from)
      if (params?.date_to) queryParams.append('date_to', params.date_to)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params?.sort_order) queryParams.append('sort_order', params.sort_order)

      const endpoint = `/api/executions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await apiClient.get(endpoint)
      return { data: result.data, meta: result.meta, error: null }
    } catch (error: any) {
      console.error('Error fetching executions:', error)
      return { data: [], meta: null, error: error.message }
    }
  }

  static async getExecution(id: string) {
    try {
      const result = await apiClient.get(`/api/executions/${id}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching execution:', error)
      return { data: null, error: error.message }
    }
  }

  static async executeTest(executeData: ExecuteTestRequest) {
    try {
      const result = await apiClient.post('/api/executions', executeData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error executing test:', error)
      return { data: null, error: error.message }
    }
  }

  static async cancelExecution(id: string) {
    try {
      await apiClient.delete(`/api/executions/${id}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error canceling execution:', error)
      return { error: error.message }
    }
  }
}