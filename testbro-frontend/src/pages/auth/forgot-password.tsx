/**
 * Forgot Password Page
 * Password reset request functionality
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
  EmailField,
  ErrorState,
  StatusBadge
} from '@/components/ui';
import { 
  KeyIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Form validation
  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    setError('');
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Note: This would typically call a password reset API
      // For now, simulating the request
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email. Please try again.');
      toast.error('Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-100 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              We've sent password reset instructions to your email address
            </p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center space-y-4">
                <StatusBadge status="success" size="lg">
                  Email sent successfully
                </StatusBadge>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    We've sent password reset instructions to:
                  </p>
                  <p className="font-medium text-gray-900">{email}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <EnvelopeIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                    <div className="text-sm">
                      <h4 className="font-medium text-blue-900">What's next?</h4>
                      <div className="mt-2 text-blue-700">
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Check your email inbox (and spam folder)</li>
                          <li>Click the reset link in the email</li>
                          <li>Create a new secure password</li>
                          <li>Sign in with your new password</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Send to a different email
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/auth/login')}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <KeyIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            No problem! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter the email address associated with your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <EmailField
                name="email"
                label="Email address"
                value={email}
                onChange={(value) => setEmail(String(value))}
                error={error}
                placeholder="Enter your email address"
                autoComplete="email"
                required
                disabled={loading}
                description="We'll send password reset instructions to this email"
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Sending...' : 'Send reset instructions'}
              </Button>
            </form>

            {/* Navigation Links */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Link
                  to="/auth/login"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Back to sign in
                </Link>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    to="/auth/register"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Sign up for free
                  </Link>
                </p>
              </div>

              <div className="text-center">
                <Link
                  to="/"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to homepage
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-xs text-gray-600">
            <p className="mb-2">
              <strong>Having trouble?</strong>
            </p>
            <p>
              If you don't receive the email within a few minutes, please check your spam folder
              or contact our support team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
