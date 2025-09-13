/**
 * Landing Page
 * Main landing page for TestBro with hero section and features
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import {
  PlayIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Test Generation',
      description: 'Generate comprehensive test cases automatically using advanced AI algorithms that understand your application flow.'
    },
    {
      icon: PlayIcon,
      title: 'Visual Test Builder',
      description: 'Create test flows with an intuitive drag-and-drop interface. No coding required - build tests visually.'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-time Monitoring',
      description: 'Monitor test executions in real-time with detailed progress tracking and instant failure notifications.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Cross-browser Testing',
      description: 'Run tests across multiple browsers and devices to ensure consistent user experience everywhere.'
    },
    {
      icon: ClockIcon,
      title: 'Continuous Integration',
      description: 'Seamlessly integrate with your CI/CD pipeline for automated testing on every deployment.'
    },
    {
      icon: CogIcon,
      title: 'Smart Analytics',
      description: 'Get detailed insights into test performance, failure patterns, and application quality metrics.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'QA Lead at TechCorp',
      avatar: '/avatars/sarah.jpg',
      quote: 'TestBro has revolutionized our testing process. We\'ve reduced our test creation time by 70% and caught 40% more bugs.'
    },
    {
      name: 'Michael Chen',
      role: 'DevOps Engineer at StartupXYZ',
      avatar: '/avatars/michael.jpg',
      quote: 'The AI-powered test generation is incredible. It creates test cases I never would have thought of manually.'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Product Manager at E-commerce Inc',
      avatar: '/avatars/emily.jpg',
      quote: 'Our deployment confidence has skyrocketed since implementing TestBro. The visual test builder is so intuitive.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TestBro</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a>
              <Button variant="outline" onClick={() => navigate('/auth/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth/register')}>
                Get Started
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-8">
              AI-Powered Test Automation
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {' '}Made Simple
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Create, execute, and monitor comprehensive test suites with the power of AI. 
              Reduce testing time by 70% while increasing coverage and reliability.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth/register')}
                className="px-8 py-4 text-lg"
              >
                Start Free Trial
                <ArrowRightIcon className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 text-lg"
              >
                <PlayIcon className="mr-2 w-5 h-5" />
                View Demo
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/50 to-purple-100/50 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for modern testing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From AI-powered test generation to real-time monitoring, TestBro provides 
              all the tools you need for comprehensive test automation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-6">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why teams choose TestBro
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">70% faster test creation</h3>
                    <p className="text-gray-600">AI generates comprehensive test cases in minutes, not hours.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">40% more bugs caught</h3>
                    <p className="text-gray-600">Advanced AI identifies edge cases human testers might miss.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">99.9% uptime reliability</h3>
                    <p className="text-gray-600">Enterprise-grade infrastructure ensures your tests always run.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Zero maintenance overhead</h3>
                    <p className="text-gray-600">Self-healing tests adapt automatically to UI changes.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">Test Suite: E-commerce Checkout</span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">✓ Navigate to product page</span>
                      <span className="text-green-600 font-medium">Passed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">✓ Add item to cart</span>
                      <span className="text-green-600 font-medium">Passed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">✓ Proceed to checkout</span>
                      <span className="text-green-600 font-medium">Passed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">⟳ Fill payment details</span>
                      <span className="text-blue-600 font-medium">Running</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-3 bg-green-50 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">
                      Success Rate: 98.5% • Avg Duration: 2m 34s
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by development teams worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say about TestBro
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-8 shadow-sm">
                <p className="text-gray-700 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full bg-gray-200"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to revolutionize your testing?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers who have already transformed their testing workflow.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="outline"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg border-white"
              onClick={() => navigate('/auth/register')}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg"
              onClick={() => window.open('mailto:sales@testbro.ai', '_blank')}
            >
              Talk to Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TB</span>
                </div>
                <span className="text-xl font-bold text-white">TestBro</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered test automation platform for modern development teams.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API Documentation</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Community</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 TestBro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
