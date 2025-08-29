import { Request, Response, NextFunction } from 'express';
import { authenticateUser, requireRole } from '../../src/middleware/auth';
import { supabaseAdmin } from '../../src/config/database';

// Mock Supabase admin
jest.mock('../../src/config/database', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid JWT token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
        app_metadata: { provider: 'google' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token',
      };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid JWT token', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      mockRequest.headers = {
        authorization: 'Bearer invalid-jwt-token',
      };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    let requireAdminRole: any;

    beforeEach(() => {
      requireAdminRole = requireRole('admin');
    });

    it('should allow access for user with required role', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockRequest.organizationId = 'org-123';

      // Mock the database call for role check
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      });

      await requireAdminRole(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for user without required role', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockRequest.organizationId = 'org-123';

      // Mock the database call for role check
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'viewer' },
                error: null,
              }),
            }),
          }),
        }),
      });

      await requireAdminRole(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions. Required: admin, Current: viewer',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      await requireAdminRole(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
