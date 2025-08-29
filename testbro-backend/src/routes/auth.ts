import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { bruteForceProtection, tokenUtils } from '../middleware/auth';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * POST /api/auth/login
 * User login with email and password
 * Enhanced with security features
 */
router.post('/login', authRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, remember_me = false } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Input validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Email and password are required',
      code: 'MISSING_CREDENTIALS',
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    });
  }

  // Check brute force protection
  const bruteForceCheck = bruteForceProtection(clientIp);
  if (!bruteForceCheck.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many failed login attempts. Please try again later.',
      retryAfter: bruteForceCheck.retryAfter,
      code: bruteForceCheck.reason,
    });
  }

  try {
    // Attempt authentication
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed attempt for brute force protection
      bruteForceProtection(clientIp, true);
      bruteForceProtection(email, true); // Also track by email
      
      // Log security event
      console.warn(`Failed login attempt for ${email} from ${clientIp} using ${userAgent}`);
      
      return res.status(401).json({
        error: 'AUTHENTICATION_FAILED',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({
        error: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
      });
    }

    // Check if user is verified
    if (!data.user.email_confirmed_at) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in',
        code: 'EMAIL_UNVERIFIED',
      });
    }

    // Record successful attempt (reduces failed attempt counter)
    bruteForceProtection(clientIp, false);
    bruteForceProtection(email, false);

    // Generate session metadata
    const sessionId = tokenUtils.generateSessionId();
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}${clientIp}${data.user.id}`)
      .digest('hex');

    // Check for concurrent sessions
    const activeSessionCount = tokenUtils.getUserSessionCount(data.user.id);
    if (activeSessionCount >= 5) { // Max 5 concurrent sessions
      console.warn(`User ${data.user.id} has ${activeSessionCount} active sessions`);
    }

    // Log successful authentication
    console.log(`Successful login: ${data.user.email} (${data.user.id}) from ${clientIp}`);

    // Security headers
    res.set({
      'X-Session-ID': sessionId,
      'X-Device-Fingerprint': deviceFingerprint.substring(0, 16),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
    });

    // Return enhanced session data
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
        email_confirmed_at: data.user.email_confirmed_at,
        last_sign_in_at: data.user.last_sign_in_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
      security: {
        sessionId,
        deviceFingerprint: deviceFingerprint.substring(0, 16),
        expiresAt: data.session.expires_at,
        rememberMe: remember_me,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Login failed due to server error',
      code: 'SERVER_ERROR',
    });
  }
}));

/**
 * POST /api/auth/signup
 * User registration
 */
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, user_metadata } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Email and password are required',
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Password must be at least 8 characters long',
    });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: user_metadata || {},
      },
    });

    if (error) {
      return res.status(400).json({
        error: 'REGISTRATION_FAILED',
        message: error.message,
      });
    }

    // Create default organization for new user
    if (data.user) {
      await createDefaultOrganization(data.user.id, email);
    }

    res.status(201).json({
      user: data.user,
      session: data.session,
      message: 'Registration successful. Please check your email for verification.',
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Registration failed',
    });
  }
}));

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Authorization header required',
    });
  }

  const token = authHeader.substring(7);

  try {
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      return res.status(400).json({
        error: 'LOGOUT_FAILED',
        message: error.message,
      });
    }

    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Logout failed',
    });
  }
}));

/**
 * POST /api/auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Refresh token is required',
    });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({
        error: 'TOKEN_REFRESH_FAILED',
        message: error.message,
      });
    }

    res.json({
      session: data.session,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Token refresh failed',
    });
  }
}));

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header required',
    });
  }

  const token = authHeader.substring(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    // Get user's organizations
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        role,
        organizations (
          id,
          name,
          description,
          settings
        )
      `)
      .eq('user_id', data.user.id);

    if (membershipError) {
      console.error('Error fetching organizations:', membershipError);
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
      },
      organizations: memberships || [],
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get user profile',
    });
  }
}));

/**
 * POST /api/auth/reset-password
 * Request password reset
 */
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Email is required',
    });
  }

  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
    });

    if (error) {
      return res.status(400).json({
        error: 'RESET_FAILED',
        message: error.message,
      });
    }

    res.json({
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Password reset failed',
    });
  }
}));

/**
 * POST /api/auth/update-password
 * Update user password
 */
router.post('/update-password', asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header required',
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Password must be at least 8 characters long',
    });
  }

  const token = authHeader.substring(7);

  try {
    // First get the user from the token
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    // Update password using Supabase Auth Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password }
    );

    if (error) {
      return res.status(400).json({
        error: 'UPDATE_FAILED',
        message: error.message,
      });
    }

    res.json({
      user: data.user,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Password update failed',
    });
  }
}));

/**
 * Helper function to create default organization for new users
 */
async function createDefaultOrganization(userId: string, email: string) {
  try {
    const orgName = `${email.split('@')[0]}'s Organization`;

    // Create organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
        description: 'Default organization created during signup',
        owner_id: userId,
        settings: {
          max_users: 5,
          max_projects: 3,
          max_tests_per_month: 1000,
          features: ['basic', 'ai_generation'],
        },
      })
      .select()
      .single();

    if (orgError) {
      console.error('Failed to create default organization:', orgError);
      return;
    }

    // Add user as admin to the organization
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'admin',
        invited_by: userId,
        joined_at: new Date().toISOString(),
        status: 'active',
      });

    if (memberError) {
      console.error('Failed to add user to organization:', memberError);
    }

    console.log(`Created default organization "${orgName}" for user ${userId}`);
  } catch (error) {
    console.error('Error creating default organization:', error);
  }
}

export default router;
