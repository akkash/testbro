import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ApiRequestConfig {
  headers?: Record<string, string>
  useApiKey?: boolean
  apiKey?: string
  skipAuth?: boolean
  retryOnAuthFailure?: boolean
}

interface AuthTokenInfo {
  token: string
  expiresAt?: number
  shouldRefresh?: boolean
}

class ApiClient {
  private isRefreshing = false
  private refreshPromise: Promise<string | null> | null = null

  private async getTokenInfo(): Promise<AuthTokenInfo | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      // Check if token is close to expiry (within 5 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      const shouldRefresh = expiresAt > 0 && (expiresAt - now) < fiveMinutes

      return {
        token: session.access_token,
        expiresAt,
        shouldRefresh
      }
    } catch (error) {
      console.error('Failed to get token info:', error)
      return null
    }
  }

  private async refreshAuthToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenRefresh()

    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session?.access_token) {
        console.error('Token refresh failed:', error)
        // Clear session and redirect to login
        await supabase.auth.signOut()
        return null
      }
      return data.session.access_token
    } catch (error) {
      console.error('Token refresh error:', error)
      return null
    }
  }
  private getAuthHeaders = async (config?: ApiRequestConfig): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config?.headers
    }

    // Skip authentication if explicitly requested
    if (config?.skipAuth) {
      return headers
    }

    if (config?.useApiKey && config?.apiKey) {
      // Use API key for programmatic access
      headers['Authorization'] = `Bearer ${config.apiKey}`
      headers['X-API-Key'] = config.apiKey
    } else {
      // Use Supabase JWT for user authentication
      const tokenInfo = await this.getTokenInfo()
      if (tokenInfo) {
        // Check if token should be refreshed
        if (tokenInfo.shouldRefresh) {
          console.log('Token is close to expiry, attempting refresh...')
          const newToken = await this.refreshAuthToken()
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
          } else {
            // Token refresh failed, use existing token
            headers['Authorization'] = `Bearer ${tokenInfo.token}`
          }
        } else {
          headers['Authorization'] = `Bearer ${tokenInfo.token}`
        }
      }
    }

    return headers
  }

  private handleResponse = async (response: Response, originalRequest?: () => Promise<Response>, config?: ApiRequestConfig): Promise<any> => {
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 && config?.retryOnAuthFailure !== false) {
        console.log('Authentication failed, attempting token refresh...')
        const newToken = await this.refreshAuthToken()
        
        if (newToken && originalRequest) {
          console.log('Token refreshed, retrying request...')
          // Retry the original request with the new token
          const retryResponse = await originalRequest()
          return this.handleResponse(retryResponse, undefined, { ...config, retryOnAuthFailure: false })
        } else {
          // Token refresh failed or no retry function
          console.error('Token refresh failed, redirecting to login')
          // Optionally trigger a logout/redirect to login
          await supabase.auth.signOut()
        }
      }

      const errorData = await response.json().catch(() => ({ 
        error: 'NETWORK_ERROR', 
        message: 'Network request failed' 
      }))
      
      // Enhanced error information
      const error = new Error(errorData.message || `HTTP ${response.status}`)
      ;(error as any).status = response.status
      ;(error as any).code = errorData.code || errorData.error
      ;(error as any).details = errorData
      
      throw error
    }
    
    return response.json()
  }

  public get = async (endpoint: string, config?: ApiRequestConfig) => {
    const makeRequest = async () => {
      const headers = await this.getAuthHeaders(config)
      return fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers
      })
    }
    
    const response = await makeRequest()
    return this.handleResponse(response, makeRequest, config)
  }

  public post = async (endpoint: string, data?: any, config?: ApiRequestConfig) => {
    const makeRequest = async () => {
      const headers = await this.getAuthHeaders(config)
      return fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined
      })
    }
    
    const response = await makeRequest()
    return this.handleResponse(response, makeRequest, config)
  }

  public put = async (endpoint: string, data?: any, config?: ApiRequestConfig) => {
    const makeRequest = async () => {
      const headers = await this.getAuthHeaders(config)
      return fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined
      })
    }
    
    const response = await makeRequest()
    return this.handleResponse(response, makeRequest, config)
  }

  public delete = async (endpoint: string, config?: ApiRequestConfig) => {
    const makeRequest = async () => {
      const headers = await this.getAuthHeaders(config)
      return fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers
      })
    }
    
    const response = await makeRequest()
    return this.handleResponse(response, makeRequest, config)
  }

  public patch = async (endpoint: string, data?: any, config?: ApiRequestConfig) => {
    const makeRequest = async () => {
      const headers = await this.getAuthHeaders(config)
      return fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: data ? JSON.stringify(data) : undefined
      })
    }
    
    const response = await makeRequest()
    return this.handleResponse(response, makeRequest, config)
  }
}

export const apiClient = new ApiClient()
export default apiClient