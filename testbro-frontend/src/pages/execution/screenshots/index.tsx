/**
 * Screenshot Gallery
 * View and compare screenshots from test executions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  LoadingSpinner,
  Select,
  FormField,
  Modal
} from '@/components/ui';
import {
  PhotoIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Types
interface Screenshot {
  id: string;
  executionId: string;
  stepId: string;
  stepName: string;
  url: string;
  thumbnailUrl: string;
  timestamp: Date;
  status: 'passed' | 'failed' | 'warning';
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
  annotations?: ScreenshotAnnotation[];
  comparison?: ScreenshotComparison;
}

interface ScreenshotAnnotation {
  id: string;
  type: 'highlight' | 'error' | 'warning' | 'info';
  x: number;
  y: number;
  width: number;
  height: number;
  message: string;
}

interface ScreenshotComparison {
  baselineUrl: string;
  diffUrl: string;
  diffPercentage: number;
  status: 'match' | 'different' | 'new';
}

interface ScreenshotFilter {
  status: string;
  step: string;
  timeRange: string;
}

export default function ScreenshotGallery() {
  const { projectId, executionId } = useParams();
  const navigate = useNavigate();

  // State
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'compare'>('view');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [filter, setFilter] = useState<ScreenshotFilter>({
    status: 'all',
    step: 'all',
    timeRange: 'all'
  });

  // Load screenshots
  useEffect(() => {
    loadScreenshots();
  }, [executionId]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [screenshots, filter]);

  const loadScreenshots = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock screenshot data
      const mockScreenshots: Screenshot[] = [
        {
          id: 'screen-1',
          executionId: executionId!,
          stepId: 'step-1',
          stepName: 'Navigate to homepage',
          url: '/screenshots/homepage-full.png',
          thumbnailUrl: '/screenshots/homepage-thumb.png',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          status: 'passed',
          dimensions: { width: 1920, height: 1080 },
          fileSize: 245760,
          annotations: [
            {
              id: 'ann-1',
              type: 'highlight',
              x: 100,
              y: 200,
              width: 300,
              height: 50,
              message: 'Navigation menu verified'
            }
          ]
        },
        {
          id: 'screen-2',
          executionId: executionId!,
          stepId: 'step-2',
          stepName: 'Click product card',
          url: '/screenshots/product-click-full.png',
          thumbnailUrl: '/screenshots/product-click-thumb.png',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          status: 'failed',
          dimensions: { width: 1920, height: 1080 },
          fileSize: 312480,
          annotations: [
            {
              id: 'ann-2',
              type: 'error',
              x: 250,
              y: 400,
              width: 200,
              height: 100,
              message: 'Element not found: [data-testid="product-card"]'
            }
          ],
          comparison: {
            baselineUrl: '/screenshots/baseline-product.png',
            diffUrl: '/screenshots/diff-product.png',
            diffPercentage: 12.5,
            status: 'different'
          }
        },
        {
          id: 'screen-3',
          executionId: executionId!,
          stepId: 'step-3',
          stepName: 'Fill checkout form',
          url: '/screenshots/checkout-form-full.png',
          thumbnailUrl: '/screenshots/checkout-form-thumb.png',
          timestamp: new Date(Date.now() - 6 * 60 * 1000),
          status: 'warning',
          dimensions: { width: 1920, height: 1080 },
          fileSize: 198720,
          annotations: [
            {
              id: 'ann-3',
              type: 'warning',
              x: 300,
              y: 500,
              width: 400,
              height: 60,
              message: 'Form validation styling differs from baseline'
            }
          ],
          comparison: {
            baselineUrl: '/screenshots/baseline-checkout.png',
            diffUrl: '/screenshots/diff-checkout.png',
            diffPercentage: 3.2,
            status: 'different'
          }
        },
        {
          id: 'screen-4',
          executionId: executionId!,
          stepId: 'step-4',
          stepName: 'Payment confirmation',
          url: '/screenshots/payment-full.png',
          thumbnailUrl: '/screenshots/payment-thumb.png',
          timestamp: new Date(Date.now() - 4 * 60 * 1000),
          status: 'passed',
          dimensions: { width: 1920, height: 1080 },
          fileSize: 156240,
          comparison: {
            baselineUrl: '/screenshots/baseline-payment.png',
            diffUrl: '/screenshots/diff-payment.png',
            diffPercentage: 0.1,
            status: 'match'
          }
        }
      ];

      setScreenshots(mockScreenshots);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
      toast.error('Failed to load screenshots');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = screenshots;

    // Status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(screenshot => screenshot.status === filter.status);
    }

    // Step filter
    if (filter.step !== 'all') {
      filtered = filtered.filter(screenshot => screenshot.stepId === filter.step);
    }

    // Time range filter
    if (filter.timeRange !== 'all') {
      const now = Date.now();
      const timeThreshold = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      }[filter.timeRange] || 0;

      filtered = filtered.filter(screenshot => 
        now - screenshot.timestamp.getTime() <= timeThreshold
      );
    }

    setFilteredScreenshots(filtered);
  };

  const openScreenshot = (screenshot: Screenshot, mode: 'view' | 'compare' = 'view') => {
    setSelectedScreenshot(screenshot);
    setModalMode(mode);
    setZoomLevel(100);
    setShowModal(true);
  };

  const navigateScreenshot = (direction: 'prev' | 'next') => {
    if (!selectedScreenshot) return;

    const currentIndex = filteredScreenshots.findIndex(s => s.id === selectedScreenshot.id);
    let nextIndex;

    if (direction === 'prev') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredScreenshots.length - 1;
    } else {
      nextIndex = currentIndex < filteredScreenshots.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedScreenshot(filteredScreenshots[nextIndex]);
  };

  const downloadScreenshot = (screenshot: Screenshot) => {
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = `${screenshot.stepName}-${screenshot.timestamp.toISOString()}.png`;
    link.click();
    toast.success('Screenshot downloaded');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: Screenshot['status']) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Screenshot['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <PhotoIcon className="w-4 h-4" />;
    }
  };

  const uniqueSteps = Array.from(new Set(screenshots.map(s => ({ id: s.stepId, name: s.stepName }))));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screenshots</h1>
          <p className="text-gray-600">View and analyze test execution screenshots</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}/executions/${executionId}`)}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Execution
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <Select
            value={filter.status}
            onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All' },
              { value: 'passed', label: 'Passed' },
              { value: 'failed', label: 'Failed' },
              { value: 'warning', label: 'Warning' }
            ]}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Step:</label>
          <Select
            value={filter.step}
            onValueChange={(value) => setFilter(prev => ({ ...prev, step: value }))}
            options={[
              { value: 'all', label: 'All Steps' },
              ...uniqueSteps.map(step => ({ value: step.id, label: step.name }))
            ]}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <Select
            value={filter.timeRange}
            onValueChange={(value) => setFilter(prev => ({ ...prev, timeRange: value }))}
            options={[
              { value: 'all', label: 'All Time' },
              { value: '1h', label: 'Last Hour' },
              { value: '6h', label: 'Last 6 Hours' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' }
            ]}
          />
        </div>
        
        <div className="ml-auto text-sm text-gray-600">
          {filteredScreenshots.length} of {screenshots.length} screenshots
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PhotoIcon className="w-8 h-8 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{screenshots.length}</div>
                <p className="text-sm text-gray-600">Total Screenshots</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {screenshots.filter(s => s.status === 'passed').length}
                </div>
                <p className="text-sm text-gray-600">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {screenshots.filter(s => s.status === 'failed').length}
                </div>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {screenshots.filter(s => s.status === 'warning').length}
                </div>
                <p className="text-sm text-gray-600">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screenshot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredScreenshots.map(screenshot => (
          <Card 
            key={screenshot.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => openScreenshot(screenshot)}
          >
            <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
              <img
                src={screenshot.thumbnailUrl}
                alt={screenshot.stepName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <Badge className={getStatusColor(screenshot.status)}>
                  {getStatusIcon(screenshot.status)}
                  <span className="ml-1 capitalize">{screenshot.status}</span>
                </Badge>
              </div>
              
              {/* Comparison Badge */}
              {screenshot.comparison && (
                <div className="absolute top-2 left-2">
                  <Badge 
                    variant="outline"
                    className={
                      screenshot.comparison.status === 'match' ? 'bg-green-50 text-green-700 border-green-200' :
                      screenshot.comparison.status === 'different' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }
                  >
                    {screenshot.comparison.status === 'match' ? 'Match' :
                     screenshot.comparison.status === 'different' ? `${screenshot.comparison.diffPercentage}% diff` :
                     'New'}
                  </Badge>
                </div>
              )}
              
              {/* Annotations Indicator */}
              {screenshot.annotations && screenshot.annotations.length > 0 && (
                <div className="absolute bottom-2 left-2">
                  <Badge variant="outline" className="bg-white/90">
                    {screenshot.annotations.length} annotation{screenshot.annotations.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 truncate mb-2">
                {screenshot.stepName}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Size:</span>
                  <span>{screenshot.dimensions.width}×{screenshot.dimensions.height}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>File size:</span>
                  <span>{formatFileSize(screenshot.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time:</span>
                  <span>{screenshot.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openScreenshot(screenshot, 'view');
                  }}
                  className="flex-1"
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  View
                </Button>
                
                {screenshot.comparison && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openScreenshot(screenshot, 'compare');
                    }}
                    className="flex-1"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    Compare
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredScreenshots.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No screenshots found</p>
                <p className="text-sm mt-1">
                  {screenshots.length === 0 
                    ? 'No screenshots were captured during this execution'
                    : 'Try adjusting your filters to see more results'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        size="full"
        className="p-0"
      >
        {selectedScreenshot && (
          <div className="flex flex-col h-screen">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedScreenshot.stepName}
                </h2>
                <Badge className={getStatusColor(selectedScreenshot.status)}>
                  {getStatusIcon(selectedScreenshot.status)}
                  <span className="ml-1 capitalize">{selectedScreenshot.status}</span>
                </Badge>
                {selectedScreenshot.comparison && (
                  <Badge variant="outline">
                    {selectedScreenshot.comparison.diffPercentage}% difference
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                {selectedScreenshot.comparison && (
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                    <button
                      onClick={() => setModalMode('view')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        modalMode === 'view'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <EyeIcon className="w-4 h-4 mr-1 inline" />
                      View
                    </button>
                    <button
                      onClick={() => setModalMode('compare')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        modalMode === 'compare'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <MagnifyingGlassIcon className="w-4 h-4 mr-1 inline" />
                      Compare
                    </button>
                  </div>
                )}
                
                {/* Navigation */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateScreenshot('prev')}
                  disabled={filteredScreenshots.length <= 1}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateScreenshot('next')}
                  disabled={filteredScreenshots.length <= 1}
                >
                  <ArrowRightIcon className="w-4 h-4" />
                </Button>
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.max(25, prev - 25))}
                  >
                    <ArrowsPointingInIcon className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-mono px-2 min-w-[60px] text-center">
                    {zoomLevel}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadScreenshot(selectedScreenshot)}
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 bg-gray-100 overflow-auto p-4">
              {modalMode === 'view' ? (
                <div className="flex justify-center">
                  <div 
                    className="relative bg-white rounded-lg shadow-lg overflow-auto max-h-full"
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  >
                    <img
                      src={selectedScreenshot.url}
                      alt={selectedScreenshot.stepName}
                      className="max-w-none"
                    />
                    
                    {/* Annotations */}
                    {selectedScreenshot.annotations?.map(annotation => (
                      <div
                        key={annotation.id}
                        className={`absolute border-2 ${
                          annotation.type === 'error' ? 'border-red-500 bg-red-500/10' :
                          annotation.type === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
                          annotation.type === 'highlight' ? 'border-blue-500 bg-blue-500/10' :
                          'border-gray-500 bg-gray-500/10'
                        }`}
                        style={{
                          left: `${annotation.x}px`,
                          top: `${annotation.y}px`,
                          width: `${annotation.width}px`,
                          height: `${annotation.height}px`
                        }}
                        title={annotation.message}
                      >
                        <div className={`absolute -top-6 left-0 text-xs px-2 py-1 rounded text-white ${
                          annotation.type === 'error' ? 'bg-red-500' :
                          annotation.type === 'warning' ? 'bg-yellow-500' :
                          annotation.type === 'highlight' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}>
                          {annotation.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                selectedScreenshot.comparison && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Baseline */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">Baseline</h3>
                      <div 
                        className="bg-white rounded-lg shadow-lg overflow-auto"
                        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                      >
                        <img
                          src={selectedScreenshot.comparison.baselineUrl}
                          alt="Baseline"
                          className="max-w-none"
                        />
                      </div>
                    </div>
                    
                    {/* Current */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">Current</h3>
                      <div 
                        className="bg-white rounded-lg shadow-lg overflow-auto"
                        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                      >
                        <img
                          src={selectedScreenshot.url}
                          alt="Current"
                          className="max-w-none"
                        />
                      </div>
                    </div>
                    
                    {/* Diff */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">Difference</h3>
                      <div 
                        className="bg-white rounded-lg shadow-lg overflow-auto"
                        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                      >
                        <img
                          src={selectedScreenshot.comparison.diffUrl}
                          alt="Difference"
                          className="max-w-none"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
