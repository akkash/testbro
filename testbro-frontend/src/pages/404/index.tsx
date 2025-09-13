/**
 * 404 Not Found Page
 * Displayed when a user navigates to a non-existent route
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { HomeIcon, ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
            <span className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              404
            </span>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xs font-bold">!</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. 
          The link might be broken or the page may have been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleGoBack}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Or try one of these helpful links:
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => navigate('/projects')}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              View Projects
            </button>
            <button
              onClick={() => navigate('/test-builder')}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Test Builder
            </button>
            <button
              onClick={() => navigate('/executions')}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Test Executions
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Need help? {' '}
            <a 
              href="mailto:support@testbro.ai" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
