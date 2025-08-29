import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import { supabaseAdmin } from '../../src/config/database';

// Mock Supabase admin
jest.mock('../../src/config/database', () => ({
  supabaseAdmin: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

describe('Authentication Flow Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      user_metadata: {
        name: 'Test User',
        company: 'Test Company',
      },
    };

    it('should complete full user registration and login flow', async () => {
      // Mock successful registration
      const mockUser = {
        id: 'user-123',
        email: testUser.email,
        user_metadata: testUser.user_metadata,
        app_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };

      (supabaseAdmin.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      // Test registration
      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.user.email).toBe(testUser.email);
      expect(registerResponse.body.message).toContain('Registration successful');

      // Mock successful login
      (supabaseAdmin.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      // Test login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(testUser.email);
      expect(loginResponse.body.session.access_token).toBe('mock-access-token');
      expect(loginResponse.body.message).toBe('Login successful');

      // Mock successful user retrieval
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock organization membership query
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      // Test getting user profile
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${mockSession.access_token}`)
        .expect(200);

      expect(profileResponse.body.user.email).toBe(testUser.email);
      expect(profileResponse.body.user.user_metadata.name).toBe('Test User');

      // Mock successful logout
      (supabaseAdmin.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      // Test logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${mockSession.access_token}`)
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logout successful');
    });

    it('should handle password reset flow', async () => {
      // Mock successful password reset request
      (supabaseAdmin.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error: null,
      });

      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(resetResponse.body.message).toContain('Password reset email sent');
    });
  });

  describe('Error Handling', () => {
    it('should handle registration with existing email', async () => {
      (supabaseAdmin.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error).toBe('REGISTRATION_FAILED');
      expect(response.body.message).toBe('User already registered');
    });

    it('should handle login with wrong credentials', async () => {
      (supabaseAdmin.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error).toBe('AUTHENTICATION_FAILED');
      expect(response.body.message).toBe('Invalid login credentials');
    });

    it('should handle registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Password must be at least 8 characters long');
    });

    it('should handle missing email or password', async () => {
      // Test missing email
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response1.body.error).toBe('VALIDATION_ERROR');
      expect(response1.body.message).toBe('Email and password are required');

      // Test missing password
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response2.body.error).toBe('VALIDATION_ERROR');
      expect(response2.body.message).toBe('Email and password are required');
    });

    it('should handle invalid authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidHeader')
        .expect(401);

      expect(response.body.error).toBe('UNAUTHORIZED');
      expect(response.body.message).toBe('Authorization header required');
    });

    it('should handle expired tokens', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      expect(response.body.error).toBe('UNAUTHORIZED');
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json')
        .expect(400);

      // Express should handle malformed JSON
      expect(response.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Email and password are required');
    });
  });
});
