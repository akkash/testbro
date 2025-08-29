import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Mail, Lock, Github, Chrome } from 'lucide-react'

type AuthMode = 'signin' | 'signup'

interface AuthFormProps {
  initialMode?: AuthMode
  onSuccess?: () => void
}

export default function AuthForm({ initialMode = 'signin', onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null)

  const { signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        setError('Please confirm your password')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setLoading(true)
    try {
      const result = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)

      if (result.error) {
        setError(result.error)
      } else {
        if (mode === 'signup') {
          setError('Check your email for the confirmation link!')
        } else {
          if (onSuccess) {
            onSuccess()
          } else {
            navigate('/dashboard')
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setSocialLoading(provider)
    setError('')

    try {
      const result = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithGithub()

      if (result.error) {
        setError(result.error)
      }
      // OAuth will handle the redirect automatically
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === 'signin'
              ? 'Welcome back to TestBro.ai'
              : 'Get started with your AI-powered testing journey'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Social Auth Buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialAuth('google')}
              disabled={socialLoading !== null}
            >
              <Chrome className="w-4 h-4 mr-2" />
              {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialAuth('github')}
              disabled={socialLoading !== null}
            >
              <Github className="w-4 h-4 mr-2" />
              {socialLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')
              }
            </Button>
          </form>

          {/* Mode Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError('')
              }}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'
              }
            </button>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
