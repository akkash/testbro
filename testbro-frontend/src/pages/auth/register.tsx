/**
 * Registration Page
 * Enhanced registration page with comprehensive form validation
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  FormField,
  EmailField,
  PasswordField,
  LoadingSpinner,
  ErrorState,
  Separator,
  Progress
} from '@/components/ui';
import { 
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  acceptTerms: boolean;
  allowMarketing: boolean;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: 'red' | 'yellow' | 'green';
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    acceptTerms: false,
    allowMarketing: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'red'
  });

  const { signUp, signInWithGoogle, signInWithGithub, isAuthenticated, lastError, clearError } = useAuth();
  const navigate = useNavigate();

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Password strength calculation
  useEffect(() => {
    if (formData.password) {
      const strength = calculatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: [], color: 'red' });
    }
  }, [formData.password]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character');
    }

    const color: 'red' | 'yellow' | 'green' = 
      score <= 2 ? 'red' : score <= 4 ? 'yellow' : 'green';

    return { score, feedback, color };
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Password is too weak. Please choose a stronger password.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(formData.email, formData.password);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Registration successful! Please check your email to confirm your account.');
        navigate('/auth/verify-email', { 
          state: { email: formData.email } 
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle social authentication
  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    clearError();

    try {
      const result = provider === 'google' 
        ? await signInWithGoogle() 
        : await signInWithGithub();

      if (result.error) {
        toast.error(result.error);
      }
      // OAuth redirect will handle success
    } catch (error) {
      console.error(`${provider} auth error:`, error);
      toast.error(`Failed to sign up with ${provider}`);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <UserPlusIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Start your AI-powered testing journey today
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create your TestBro account in just a few steps
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Social Authentication */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handleSocialAuth('google')}
                disabled={socialLoading !== null || loading}
              >
                {socialLoading === 'google' ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handleSocialAuth('github')}
                disabled={socialLoading !== null || loading}
              >
                {socialLoading === 'github' ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
                {socialLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with email
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  type="text"
                  name="firstName"
                  label="First name"
                  value={formData.firstName}
                  onChange={(value) => handleFieldChange('firstName', String(value))}
                  error={errors.firstName}
                  placeholder="First name"
                  autoComplete="given-name"
                  required
                  disabled={loading}
                />

                <FormField
                  type="text"
                  name="lastName"
                  label="Last name"
                  value={formData.lastName}
                  onChange={(value) => handleFieldChange('lastName', String(value))}
                  error={errors.lastName}
                  placeholder="Last name"
                  autoComplete="family-name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Field */}
              <EmailField
                name="email"
                label="Email address"
                value={formData.email}
                onChange={(value) => handleFieldChange('email', String(value))}
                error={errors.email}
                placeholder="Enter your email"
                autoComplete="email"
                required
                disabled={loading}
              />

              {/* Company Field */}
              <FormField
                type="text"
                name="companyName"
                label="Company name (optional)"
                value={formData.companyName}
                onChange={(value) => handleFieldChange('companyName', String(value))}
                placeholder="Your company or organization"
                autoComplete="organization"
                disabled={loading}
              />

              {/* Password Field */}
              <div className="space-y-2">
                <PasswordField
                  name="password"
                  label="Password"
                  value={formData.password}
                  onChange={(value) => handleFieldChange('password', String(value))}
                  error={errors.password}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Password strength</span>
                      <span className={
                        passwordStrength.color === 'green' ? 'text-green-600' :
                        passwordStrength.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {passwordStrength.score <= 2 ? 'Weak' : 
                         passwordStrength.score <= 4 ? 'Medium' : 'Strong'}
                      </span>
                    </div>
                    <Progress 
                      value={(passwordStrength.score / 5) * 100} 
                      className="h-2"
                    />
                    {passwordStrength.feedback.length > 0 && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Password should contain:</p>
                        <ul className="space-y-1 ml-2">
                          {passwordStrength.feedback.map((item, index) => (
                            <li key={index} className="flex items-center gap-1">
                              <XMarkIcon className="h-3 w-3 text-red-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <PasswordField
                name="confirmPassword"
                label="Confirm password"
                value={formData.confirmPassword}
                onChange={(value) => handleFieldChange('confirmPassword', String(value))}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
                disabled={loading}
              />

              {/* Terms and Conditions */}
              <div className="space-y-3">
                <FormField
                  type="checkbox"
                  name="acceptTerms"
                  label={
                    <span>
                      I agree to the{' '}
                      <Link to="/legal/terms" className="text-blue-600 hover:text-blue-500">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/legal/privacy" className="text-blue-600 hover:text-blue-500">
                        Privacy Policy
                      </Link>
                    </span>
                  }
                  value={formData.acceptTerms}
                  onChange={(value) => handleFieldChange('acceptTerms', Boolean(value))}
                  error={errors.acceptTerms}
                  required
                  disabled={loading}
                />

                <FormField
                  type="checkbox"
                  name="allowMarketing"
                  label="I'd like to receive product updates and marketing communications"
                  value={formData.allowMarketing}
                  onChange={(value) => handleFieldChange('allowMarketing', Boolean(value))}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || socialLoading !== null}
                loading={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            {/* Error Display */}
            {lastError && (
              <ErrorState
                type="validation"
                message={lastError}
                compact
                onRetry={clearError}
              />
            )}

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in instead
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                ← Back to homepage
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
