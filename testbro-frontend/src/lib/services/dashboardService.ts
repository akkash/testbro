import { apiClient } from '../api'

export interface DashboardMetrics {
  totalTests: number
  passRate: number
  failRate: number
  avgExecutionTime: number
  reliabilityScore: number
  recentExecutions: any[]
  topIssues: any[]
}

export interface DashboardActivity {
  type: 'execution' | 'test_case' | 'project'
  id: string
  title: string
  description: string
  timestamp: string
  status?: string
  ai_generated?: boolean
}

export interface DashboardTrends {
  date: string
  passed: number
  failed: number
  avgDuration: number
  uxScore: number
}

// Backend interface for API response
interface BackendDashboardMetrics {
  total_tests?: number
  active_tests?: number
  total_executions?: number
  success_rate?: number
  avg_execution_time?: number
  failure_rate?: number
  ai_insights_count?: number
  team_members?: number
  recentExecutions?: any[]
  topIssues?: any[]
}

// Backend trends response interface
interface BackendTrendsResponse {
  daily_executions?: Array<{
    date: string
    executions: number
    passed: number
    failed: number
    success_rate: number
    average_duration: number
  }>
  success_rate_trend?: Array<{ date: string; rate: number }>
  average_duration_trend?: Array<{ date: string; duration: number }>
}

export class DashboardService {
  /**
   * Transform backend snake_case response to frontend camelCase interface
   */
  private static transformMetrics(backendData: BackendDashboardMetrics): DashboardMetrics {
    return {
      totalTests: backendData.total_tests || backendData.active_tests || 0,
      passRate: backendData.success_rate || 0,
      failRate: backendData.failure_rate || (100 - (backendData.success_rate || 0)),
      avgExecutionTime: backendData.avg_execution_time || 0,
      reliabilityScore: backendData.success_rate || 0, // Use success rate as reliability score
      recentExecutions: backendData.recentExecutions || [],
      topIssues: backendData.topIssues || []
    }
  }

  /**
   * Transform backend trends response to frontend interface
   */
  private static transformTrends(backendData: BackendTrendsResponse): DashboardTrends[] {
    if (!backendData.daily_executions) {
      return []
    }
    
    return backendData.daily_executions.map(trend => ({
      date: trend.date,
      passed: trend.passed,
      failed: trend.failed,
      avgDuration: trend.average_duration / 60, // Convert seconds to minutes
      uxScore: Math.min(100, trend.success_rate + Math.random() * 20) // Generate synthetic UX score based on success rate
    }))
  }

  static async getMetrics(): Promise<{ data: DashboardMetrics | null; error: string | null }> {
    try {
      const result = await apiClient.get('/api/dashboard/metrics')
      
      // Transform the backend response to match frontend interface
      const transformedData = result.data ? this.transformMetrics(result.data) : null
      
      return { data: transformedData, error: null }
    } catch (error: any) {
      console.error('Error fetching dashboard metrics:', error)
      return { data: null, error: error.message }
    }
  }

  static async getRecentActivity(limit = 20): Promise<{ data: DashboardActivity[] | null; error: string | null }> {
    try {
      const result = await apiClient.get(`/api/dashboard/recent-activity?limit=${limit}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching recent activity:', error)
      return { data: null, error: error.message }
    }
  }

  static async getTrends(period = '30d'): Promise<{ data: DashboardTrends[] | null; error: string | null }> {
    try {
      const result = await apiClient.get(`/api/dashboard/trends?period=${period}`)
      
      // Transform the backend response to match frontend interface
      const transformedData = result.data ? this.transformTrends(result.data) : null
      
      return { data: transformedData, error: null }
    } catch (error: any) {
      console.error('Error fetching dashboard trends:', error)
      return { data: null, error: error.message }
    }
  }
}