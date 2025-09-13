import React, { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Download,
  Play,
  Pause,
  MoreHorizontal,
  Calendar,
  Timer,
  TrendingUp,
  Camera,
  Monitor,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { fullWebsiteTestApi } from '@/lib/fullWebsiteTestApi';
import type { 
  FullWebsiteTestSession, 
  TestProgress,
  WebSocketTestUpdate 
} from '@/types/full-website-test';

interface TestProgressCardProps {
  session: FullWebsiteTestSession;
  onViewResults: () => void;
  onCancel: () => void;
}

const TestProgressCard: React.FC<TestProgressCardProps> = ({
  session,
  onViewResults,
  onCancel
}) => {
  const [currentProgress, setCurrentProgress] = useState<TestProgress | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<WebSocketTestUpdate[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Subscribe to real-time updates for running tests
  useEffect(() => {
    if (fullWebsiteTestApi.isSessionRunning(session)) {
      const unsubscribe = fullWebsiteTestApi.subscribeToProgress(
        session.id,
        (progress) => {
          setCurrentProgress(progress);
        },
        (update) => {
          setRecentUpdates(prev => [...prev.slice(-4), update].slice(-5));
        }
      );

      return unsubscribe;
    }
  }, [session.id, session.status]);

  const getStatusColor = (status: FullWebsiteTestSession['status']): string => {
    const colors = {
      pending: 'bg-orange-100 text-orange-800 border-orange-200',
      discovering_urls: 'bg-blue-100 text-blue-800 border-blue-200',
      taking_screenshots: 'bg-purple-100 text-purple-800 border-purple-200',
      analyzing_changes: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      monitoring: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: FullWebsiteTestSession['status']) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      discovering_urls: <Globe className="h-4 w-4 animate-pulse" />,
      taking_screenshots: <Camera className="h-4 w-4 animate-pulse" />,
      analyzing_changes: <TrendingUp className="h-4 w-4 animate-pulse" />,
      monitoring: <Monitor className="h-4 w-4 animate-pulse" />,
      completed: <CheckCircle className="h-4 w-4" />,
      failed: <AlertCircle className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />
    };
    return icons[status] || icons.pending;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatDuration = (startedAt?: string, completedAt?: string): string => {
    if (!startedAt) return 'Not started';
    
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const calculateProgress = (): number => {
    if (currentProgress) {
      return currentProgress.progress_percentage;
    }
    
    if (session.total_urls === 0) return 0;
    return Math.round((session.processed_urls / session.total_urls) * 100);
  };

  const isRunning = fullWebsiteTestApi.isSessionRunning(session);
  const progressPercentage = calculateProgress();

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                {session.name}
              </CardTitle>
              
              <Badge 
                variant="outline" 
                className={`${getStatusColor(session.status)} flex items-center gap-1`}
              >
                {getStatusIcon(session.status)}
                {fullWebsiteTestApi.getStatusText(session.status)}
              </Badge>
            </div>
            
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                {session.base_url}
              </span>
              
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatTimeAgo(session.created_at)}
              </span>
              
              {session.started_at && (
                <span className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {formatDuration(session.started_at, session.completed_at)}
                </span>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Pause className="h-4 w-4" />
                Cancel
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onViewResults}
              disabled={session.status === 'pending'}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewResults}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Results
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {isExpanded ? 'Hide' : 'Show'} Details
                </DropdownMenuItem>
                {session.status === 'completed' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </DropdownMenuItem>
                  </>
                )}
                {isRunning && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onCancel}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Cancel Test
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {currentProgress?.current_step || 'Overall Progress'}
            </span>
            <span className="text-muted-foreground">
              {progressPercentage}%
            </span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">URLs Found</span>
              <span className="font-medium">{session.total_urls}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Processed</span>
              <span className="font-medium">{session.processed_urls}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Successful</span>
              <span className="font-medium text-green-600">{session.successful_urls}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Failed</span>
              <span className="font-medium text-red-600">{session.failed_urls}</span>
            </div>
          </div>
        </div>

        {/* Real-time Updates for Running Tests */}
        {currentProgress && isRunning && (
          <Alert>
            <Monitor className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {currentProgress.current_step}
                  {currentProgress.current_url && (
                    <span className="text-muted-foreground text-xs block">
                      Processing: {new URL(currentProgress.current_url).pathname}
                    </span>
                  )}
                </span>
                {currentProgress.estimated_time_remaining && (
                  <span className="text-xs text-muted-foreground">
                    ~{Math.round(currentProgress.estimated_time_remaining / 60)}m remaining
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Configuration Summary */}
            <div>
              <h4 className="text-sm font-medium mb-2">Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Screenshots: {session.config.screenshot_options.enabled ? 'Enabled' : 'Disabled'}</div>
                <div>Monitoring: {session.config.monitoring.enabled ? 'Enabled' : 'Disabled'}</div>
                <div>Max URLs: {session.config.sitemap_discovery.max_urls}</div>
                <div>Max Depth: {session.config.sitemap_discovery.max_depth}</div>
              </div>
            </div>

            {/* Results Summary */}
            {session.results_summary && (
              <div>
                <h4 className="text-sm font-medium mb-2">Results Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <Camera className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                          <div className="text-xs font-medium">{session.results_summary.total_screenshots_captured}</div>
                          <div className="text-xs text-muted-foreground">Screenshots</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total screenshots captured</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                          <div className="text-xs font-medium">{session.results_summary.total_health_checks_performed}</div>
                          <div className="text-xs text-muted-foreground">Health Checks</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Health checks performed</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                          <div className="text-xs font-medium">{session.results_summary.total_changes_detected}</div>
                          <div className="text-xs text-muted-foreground">Changes</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Changes detected</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-600" />
                          <div className="text-xs font-medium">{session.results_summary.total_alerts_generated}</div>
                          <div className="text-xs text-muted-foreground">Alerts</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Alerts generated</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {session.results_summary.overall_health_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Health Score</span>
                      <span className="font-medium">{session.results_summary.overall_health_score}/100</span>
                    </div>
                    <Progress 
                      value={session.results_summary.overall_health_score} 
                      className="h-1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Recent Updates */}
            {recentUpdates.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Updates</h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {recentUpdates.map((update, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{update.type.replace('_', ' ')}</span>
                      <span>{formatTimeAgo(update.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestProgressCard;
