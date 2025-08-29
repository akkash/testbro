import { apiClient } from '../api'

export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
  created_by: string
  organization_id: string
  tags: string[]
  // Additional fields from backend joins/aggregations
  test_cases_count?: number
  test_targets_count?: number
  organization_name?: string
}

export interface CreateProjectData {
  name: string
  description: string
  organization_id?: string
  tags?: string[]
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: 'active' | 'inactive' | 'archived'
  tags?: string[]
}

export class ProjectService {
  static async listProjects(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.search) queryParams.append('search', params.search)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params?.sort_order) queryParams.append('sort_order', params.sort_order)

      const endpoint = `/api/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await apiClient.get(endpoint)
      return { data: result.data, meta: result.meta, error: null }
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      return { data: [], meta: null, error: error.message }
    }
  }

  static async getProject(id: string) {
    try {
      const result = await apiClient.get(`/api/projects/${id}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching project:', error)
      return { data: null, error: error.message }
    }
  }

  static async createProject(projectData: CreateProjectData) {
    try {
      const result = await apiClient.post('/api/projects', projectData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error creating project:', error)
      return { data: null, error: error.message }
    }
  }

  static async updateProject(id: string, projectData: UpdateProjectData) {
    try {
      const result = await apiClient.put(`/api/projects/${id}`, projectData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error updating project:', error)
      return { data: null, error: error.message }
    }
  }

  static async deleteProject(id: string) {
    try {
      await apiClient.delete(`/api/projects/${id}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error deleting project:', error)
      return { error: error.message }
    }
  }

  static async getProjectStats(id: string) {
    try {
      const result = await apiClient.get(`/api/projects/${id}/stats`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching project stats:', error)
      return { data: null, error: error.message }
    }
  }
}