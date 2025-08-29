import { apiClient } from '../api'

export interface TestTarget {
  id: string
  name: string
  url: string
  platform: 'web' | 'mobile-web' | 'mobile-app'
  description: string
  status: 'active' | 'inactive'
  project_id: string
  created_at: string
  updated_at: string
  created_by: string
  tags: string[]
  environment: string
  authentication?: {
    required: boolean
    type: 'basic' | 'oauth' | 'api_key'
    credentials?: any
  }
}

export interface CreateTestTargetData {
  name: string
  url: string
  platform: 'web' | 'mobile-web' | 'mobile-app'
  description: string
  project_id: string
  environment: string
  tags?: string[]
  authentication?: any
}

export class TestTargetService {
  static async listTestTargets(params?: {
    page?: number
    limit?: number
    project_id?: string
    platform?: string
    status?: string
    environment?: string
  }) {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.project_id) queryParams.append('project_id', params.project_id)
      if (params?.platform) queryParams.append('platform', params.platform)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.environment) queryParams.append('environment', params.environment)

      const endpoint = `/api/test-targets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await apiClient.get(endpoint)
      return { data: result.data, meta: result.meta, error: null }
    } catch (error: any) {
      console.error('Error fetching test targets:', error)
      return { data: [], meta: null, error: error.message }
    }
  }

  static async getTestTarget(id: string) {
    try {
      const result = await apiClient.get(`/api/test-targets/${id}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching test target:', error)
      return { data: null, error: error.message }
    }
  }

  static async createTestTarget(targetData: CreateTestTargetData) {
    try {
      const result = await apiClient.post('/api/test-targets', targetData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error creating test target:', error)
      return { data: null, error: error.message }
    }
  }

  static async updateTestTarget(id: string, targetData: Partial<CreateTestTargetData>) {
    try {
      const result = await apiClient.put(`/api/test-targets/${id}`, targetData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error updating test target:', error)
      return { data: null, error: error.message }
    }
  }

  static async deleteTestTarget(id: string) {
    try {
      await apiClient.delete(`/api/test-targets/${id}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error deleting test target:', error)
      return { error: error.message }
    }
  }
}