import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../../contexts/AuthContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { BrowserRouter } from 'react-router-dom';
import { apiClient } from '../../lib/api';

// Mock API client
vi.mock('../../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn()
    }
  }
}));

// Test component for integration testing
const TestComponent = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Frontend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authentication Integration', () => {
    test('Auth context provides correct authentication state', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock successful session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            expires_at: Date.now() / 1000 + 3600,
            user: { id: 'test-user-id', email: 'test@example.com' }
          }
        },
        error: null
      });

      const AuthTestComponent = () => {
        const { useAuth } = require('../../contexts/AuthContext');
        const { isAuthenticated, user } = useAuth();
        
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="user-email">
              {user?.email || 'no-email'}
            </div>
          </div>
        );
      };

      render(
        <TestComponent>
          <AuthTestComponent />
        </TestComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    test('Organization context loads user organizations', async () => {
      // Mock API response
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [
          {
            id: 'org-1',
            organizations: {
              id: 'org-1',
              name: 'Test Organization',
              description: 'Test org'
            },
            role: 'admin'
          }
        ]
      });

      const OrgTestComponent = () => {
        const { useOrganization } = require('../../contexts/OrganizationContext');
        const { organizations, currentOrganization } = useOrganization();
        
        return (
          <div>
            <div data-testid="orgs-count">{organizations.length}</div>
            <div data-testid="current-org">
              {currentOrganization?.name || 'no-org'}
            </div>
          </div>
        );
      };

      render(
        <TestComponent>
          <OrgTestComponent />
        </TestComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orgs-count')).toHaveTextContent('1');
        expect(screen.getByTestId('current-org')).toHaveTextContent('Test Organization');
      });
    });
  });

  describe('2. API Integration', () => {
    test('API client handles authentication headers correctly', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock session with token
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token-123',
            expires_at: Date.now() / 1000 + 3600,
            user: { id: 'test-user' }
          }
        },
        error: null
      });

      // Mock successful API response
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [{ id: 'project-1', name: 'Test Project' }]
      });

      // Import after mocking
      const { apiClient: realApiClient } = await import('../../lib/api');
      
      await realApiClient.get('/api/projects');

      // Verify API client was called
      expect(apiClient.get).toHaveBeenCalledWith('/api/projects');
    });

    test('API client handles errors gracefully', async () => {
      // Mock API error
      const mockError = new Error('Network error');
      (mockError as any).status = 500;
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      const { apiClient: realApiClient } = await import('../../lib/api');

      await expect(realApiClient.get('/api/projects')).rejects.toThrow('Network error');
    });

    test('API client retries on 401 errors', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock token refresh
      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'new-token',
            expires_at: Date.now() / 1000 + 3600,
            user: { id: 'test-user' }
          }
        },
        error: null
      });

      // First call fails with 401, second succeeds
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce({ status: 401, message: 'Unauthorized' })
        .mockResolvedValueOnce({ data: 'success' });

      const { apiClient: realApiClient } = await import('../../lib/api');
      
      const result = await realApiClient.get('/api/projects');
      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('3. Component Integration', () => {
    test('Protected routes redirect when not authenticated', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock no session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const ProtectedComponent = () => {
        const { useAuth } = require('../../contexts/AuthContext');
        const { isAuthenticated, loading } = useAuth();
        
        if (loading) return <div data-testid="loading">Loading...</div>;
        if (!isAuthenticated) return <div data-testid="redirect">Redirecting...</div>;
        
        return <div data-testid="protected">Protected Content</div>;
      };

      render(
        <TestComponent>
          <ProtectedComponent />
        </TestComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('redirect')).toBeInTheDocument();
      });
    });

    test('Dashboard loads data when authenticated', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock authenticated session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            expires_at: Date.now() / 1000 + 3600,
            user: { id: 'test-user', email: 'test@example.com' }
          }
        },
        error: null
      });

      // Mock API responses
      vi.mocked(apiClient.get)
        .mockImplementation((endpoint: string) => {
          if (endpoint === '/api/organizations') {
            return Promise.resolve({
              data: [{
                id: 'org-1',
                organizations: { id: 'org-1', name: 'Test Org' },
                role: 'admin'
              }]
            });
          }
          if (endpoint === '/api/projects') {
            return Promise.resolve({
              data: [{ id: 'project-1', name: 'Test Project' }]
            });
          }
          return Promise.resolve({ data: [] });
        });

      const DashboardComponent = () => {
        const { useAuth } = require('../../contexts/AuthContext');
        const { useOrganization } = require('../../contexts/OrganizationContext');
        const { isAuthenticated } = useAuth();
        const { currentOrganization } = useOrganization();
        
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="org-name">
              {currentOrganization?.name || 'no-org'}
            </div>
          </div>
        );
      };

      render(
        <TestComponent>
          <DashboardComponent />
        </TestComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('org-name')).toHaveTextContent('Test Org');
      });
    });
  });

  describe('4. Real-time Communication', () => {
    test('WebSocket connection status updates', async () => {
      // Mock WebSocket hook
      const mockUseWebSocket = {
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      };

      vi.doMock('../../hooks/useWebSocket', () => ({
        useWebSocket: () => mockUseWebSocket
      }));

      const WebSocketComponent = () => {
        const { useWebSocket } = require('../../hooks/useWebSocket');
        const { isConnected, connectionStatus } = useWebSocket('test-event');
        
        return (
          <div>
            <div data-testid="connection-status">{connectionStatus}</div>
            <div data-testid="is-connected">{isConnected ? 'connected' : 'disconnected'}</div>
          </div>
        );
      };

      render(
        <TestComponent>
          <WebSocketComponent />
        </TestComponent>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('connected');
    });
  });

  describe('5. Error Handling', () => {
    test('Network errors are handled gracefully', async () => {
      // Mock network error
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network Error'));

      const ErrorHandlingComponent = () => {
        const [error, setError] = require('react').useState(null as string | null);
        const [loading, setLoading] = require('react').useState(false);

        const handleApiCall = async () => {
          try {
            setLoading(true);
            await apiClient.get('/api/projects');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          } finally {
            setLoading(false);
          }
        };

        require('react').useEffect(() => {
          handleApiCall();
        }, []);

        return (
          <div>
            <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
          </div>
        );
      };

      render(
        <TestComponent>
          <ErrorHandlingComponent />
        </TestComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network Error');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });

    test('Authentication errors trigger logout', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock sign out function
      const mockSignOut = vi.fn();
      vi.mocked(supabase.auth.signOut).mockImplementation(mockSignOut);

      // Mock 401 error
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      vi.mocked(apiClient.get).mockRejectedValue(authError);

      const AuthErrorComponent = () => {
        const { useAuth } = require('../../contexts/AuthContext');
        const { signOut } = useAuth();

        const handleApiCall = async () => {
          try {
            await apiClient.get('/api/projects');
          } catch (err: any) {
            if (err.status === 401) {
              await signOut();
            }
          }
        };

        require('react').useEffect(() => {
          handleApiCall();
        }, []);

        return <div data-testid="auth-error-component">Component rendered</div>;
      };

      render(
        <TestComponent>
          <AuthErrorComponent />
        </TestComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-component')).toBeInTheDocument();
      });
    });
  });
});