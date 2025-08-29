import { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Eye,
  Grid3X3,
  List,
  Search,
  Clock,
  Monitor,
  Smartphone,
  Globe,
  Camera,
  Share,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Screenshot {
  id: string;
  url: string;
  filename: string;
  sessionId: string;
  stepNumber?: number;
  actionId?: string;
  timestamp: string;
  metadata: {
    width: number;
    height: number;
    fileSize: number;
    format: string;
    pageUrl: string;
    device: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    viewport: { width: number; height: number };
  };
  thumbnailUrl?: string;
  tags?: string[];
  description?: string;
  comparisonData?: {
    baselineUrl?: string;
    similarity?: number;
    differenceUrl?: string;
  };
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  sessionId?: string;
  onScreenshotSelect?: (screenshot: Screenshot) => void;
  onScreenshotDelete?: (screenshotId: string) => void;
  onScreenshotDownload?: (screenshot: Screenshot) => void;
  onCompareScreenshots?: (screenshot1: Screenshot, screenshot2: Screenshot) => void;
  className?: string;
}

export default function ScreenshotGallery({
  screenshots = [],
  sessionId,
  onScreenshotSelect,
  onScreenshotDelete,
  onScreenshotDownload,
  onCompareScreenshots,
  className = "",
}: ScreenshotGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'comparison'>('grid');
  const [selectedScreenshots, setSelectedScreenshots] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [filterBrowser, setFilterBrowser] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'timestamp' | 'step' | 'size'>('timestamp');
  const [showMetadata, setShowMetadata] = useState(false);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);


  // Filter and sort screenshots
  const filteredScreenshots = screenshots
    .filter(screenshot => {
      const matchesSearch = 
        screenshot.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screenshot.metadata.pageUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screenshot.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDevice = filterDevice === 'all' || screenshot.metadata.device === filterDevice;
      const matchesBrowser = filterBrowser === 'all' || screenshot.metadata.browser === filterBrowser;
      const matchesSession = !sessionId || screenshot.sessionId === sessionId;

      return matchesSearch && matchesDevice && matchesBrowser && matchesSession;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'step':
          return (a.stepNumber || 0) - (b.stepNumber || 0);
        case 'size':
          return b.metadata.fileSize - a.metadata.fileSize;
        default:
          return 0;
      }
    });

  // Slideshow functionality
  useEffect(() => {
    if (isSlideshow && filteredScreenshots.length > 0) {
      const interval = setInterval(() => {
        setCurrentViewIndex(prev => 
          prev >= filteredScreenshots.length - 1 ? 0 : prev + 1
        );
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isSlideshow, filteredScreenshots.length]);

  const handleScreenshotSelect = (screenshot: Screenshot) => {
    if (selectedScreenshots.has(screenshot.id)) {
      const newSelection = new Set(selectedScreenshots);
      newSelection.delete(screenshot.id);
      setSelectedScreenshots(newSelection);
    } else {
      const newSelection = new Set(selectedScreenshots);
      newSelection.add(screenshot.id);
      setSelectedScreenshots(newSelection);
    }
    onScreenshotSelect?.(screenshot);
  };

  const handleCompareSelected = () => {
    const selected = Array.from(selectedScreenshots);
    if (selected.length === 2) {
      const screenshot1 = screenshots.find(s => s.id === selected[0]);
      const screenshot2 = screenshots.find(s => s.id === selected[1]);
      if (screenshot1 && screenshot2) {
        onCompareScreenshots?.(screenshot1, screenshot2);
        setViewMode('comparison');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'tablet': return Smartphone;
      default: return Monitor;
    }
  };

  const getStatusBadge = (screenshot: Screenshot) => {
    if (screenshot.comparisonData?.similarity !== undefined) {
      const similarity = screenshot.comparisonData.similarity;
      if (similarity > 0.95) {
        return <Badge variant="secondary" className="text-green-600">Passed</Badge>;
      } else if (similarity > 0.8) {
        return <Badge variant="outline" className="text-yellow-600">Warning</Badge>;
      } else {
        return <Badge variant="destructive">Failed</Badge>;
      }
    }
    return null;
  };

  if (screenshots.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No screenshots available</p>
            <p className="text-sm text-gray-400 mt-1">
              Screenshots will appear here during test execution
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <span>Screenshot Gallery</span>
                <Badge variant="outline">{filteredScreenshots.length} images</Badge>
              </CardTitle>
              <CardDescription>
                View, compare, and manage test execution screenshots
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Slideshow Toggle */}
              <Button
                variant={isSlideshow ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsSlideshow(!isSlideshow)}
                disabled={filteredScreenshots.length === 0}
              >
                {isSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search screenshots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBrowser} onValueChange={setFilterBrowser}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Browsers</SelectItem>
                <SelectItem value="chrome">Chrome</SelectItem>
                <SelectItem value="firefox">Firefox</SelectItem>
                <SelectItem value="safari">Safari</SelectItem>
                <SelectItem value="edge">Edge</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">By Time</SelectItem>
                <SelectItem value="step">By Step</SelectItem>
                <SelectItem value="size">By Size</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="metadata"
                checked={showMetadata}
                onCheckedChange={setShowMetadata}
              />
              <Label htmlFor="metadata" className="text-sm">Show Metadata</Label>
            </div>
          </div>

          {/* Selection Actions */}
          {selectedScreenshots.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-blue-700">
                {selectedScreenshots.size} screenshot{selectedScreenshots.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareSelected}
                  disabled={selectedScreenshots.size !== 2}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Compare
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectedScreenshots.forEach(id => {
                      const screenshot = screenshots.find(s => s.id === id);
                      if (screenshot) {
                        onScreenshotDownload?.(screenshot);
                      }
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedScreenshots(new Set())}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Screenshot Display */}
          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsContent value="grid" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredScreenshots.map((screenshot, index) => {
                  const DeviceIcon = getDeviceIcon(screenshot.metadata.device);
                  const isSelected = selectedScreenshots.has(screenshot.id);
                  
                  return (
                    <Card
                      key={screenshot.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      } ${currentViewIndex === index && isSlideshow ? 'ring-2 ring-green-500' : ''}`}
                      onClick={() => handleScreenshotSelect(screenshot)}
                    >
                      <CardContent className="p-3">
                        <div className="relative group">
                          {/* Screenshot Thumbnail */}
                          <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          
                          {/* Overlay Actions */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex items-center space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="secondary" size="sm">
                                    <Maximize2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-6xl">
                                  <DialogHeader>
                                    <DialogTitle>Screenshot Viewer</DialogTitle>
                                    <DialogDescription>
                                      {screenshot.filename} - Step {screenshot.stepNumber}
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4">
                                    {/* Image Controls */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                                        >
                                          <ZoomOut className="w-4 h-4" />
                                        </Button>
                                        <span className="text-sm text-gray-600 min-w-[60px]">
                                          {zoomLevel}%
                                        </span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setZoomLevel(Math.min(400, zoomLevel + 25))}
                                        >
                                          <ZoomIn className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => onScreenshotDownload?.(screenshot)}
                                        >
                                          <Download className="w-4 h-4 mr-2" />
                                          Download
                                        </Button>
                                        <Button variant="outline" size="sm">
                                          <Share className="w-4 h-4 mr-2" />
                                          Share
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Image Display */}
                                    <div 
                                      className="border rounded-lg overflow-auto max-h-[60vh] bg-gray-50"
                                      style={{ transform: `scale(${zoomLevel / 100})` }}
                                    >
                                      <div className="aspect-video bg-white flex items-center justify-center">
                                        <ImageIcon className="w-16 h-16 text-gray-400" />
                                        <span className="ml-2 text-gray-500">
                                          {screenshot.filename}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Screenshot Metadata */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <h4 className="font-medium mb-2">Image Details</h4>
                                        <div className="space-y-1 text-gray-600">
                                          <div>Dimensions: {screenshot.metadata.width}×{screenshot.metadata.height}</div>
                                          <div>Size: {formatFileSize(screenshot.metadata.fileSize)}</div>
                                          <div>Format: {screenshot.metadata.format.toUpperCase()}</div>
                                          <div>Viewport: {screenshot.metadata.viewport.width}×{screenshot.metadata.viewport.height}</div>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-2">Context</h4>
                                        <div className="space-y-1 text-gray-600">
                                          <div>Step: #{screenshot.stepNumber}</div>
                                          <div>Device: {screenshot.metadata.device}</div>
                                          <div>Browser: {screenshot.metadata.browser}</div>
                                          <div>Time: {formatTimestamp(screenshot.timestamp)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScreenshotDownload?.(screenshot);
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-5 h-5 text-blue-600 bg-white rounded-full" />
                            </div>
                          )}

                          {/* Step Number Badge */}
                          {screenshot.stepNumber && (
                            <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                              #{screenshot.stepNumber}
                            </Badge>
                          )}

                          {/* Status Badge */}
                          <div className="absolute bottom-2 right-2">
                            {getStatusBadge(screenshot)}
                          </div>
                        </div>

                        {/* Screenshot Info */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">
                              {screenshot.filename}
                            </span>
                            <div className="flex items-center space-x-1">
                              <DeviceIcon className="w-3 h-3 text-gray-500" />
                              <Globe className="w-3 h-3 text-gray-500" />
                            </div>
                          </div>

                          {showMetadata && (
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>{screenshot.metadata.width}×{screenshot.metadata.height}</div>
                              <div>{formatFileSize(screenshot.metadata.fileSize)}</div>
                              <div>{formatTimestamp(screenshot.timestamp)}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-2">
              <ScrollArea className="h-96">
                {filteredScreenshots.map((screenshot) => {
                  const DeviceIcon = getDeviceIcon(screenshot.metadata.device);
                  const isSelected = selectedScreenshots.has(screenshot.id);
                  
                  return (
                    <Card
                      key={screenshot.id}
                      className={`cursor-pointer transition-all hover:shadow-sm ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleScreenshotSelect(screenshot)}
                    >
                      <CardContent className="flex items-center space-x-4 p-4">
                        {/* Thumbnail */}
                        <div className="w-16 h-12 bg-gray-100 rounded border flex-shrink-0 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">
                              {screenshot.filename}
                            </span>
                            <div className="flex items-center space-x-2">
                              {screenshot.stepNumber && (
                                <Badge variant="outline" className="text-xs">
                                  Step #{screenshot.stepNumber}
                                </Badge>
                              )}
                              {getStatusBadge(screenshot)}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <DeviceIcon className="w-4 h-4" />
                              <span>{screenshot.metadata.device}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Globe className="w-4 h-4" />
                              <span>{screenshot.metadata.browser}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTimestamp(screenshot.timestamp)}</span>
                            </div>
                            <span>{formatFileSize(screenshot.metadata.fileSize)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScreenshotSelect?.(screenshot);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Full Size</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScreenshotDownload?.(screenshot);
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScreenshotDelete?.(screenshot.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <div className="text-center text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Select two screenshots to compare them</p>
                <p className="text-sm mt-1">
                  Use the grid or list view to select screenshots, then click Compare
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Navigation for slideshow */}
          {isSlideshow && filteredScreenshots.length > 0 && (
            <div className="flex items-center justify-center space-x-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentViewIndex(Math.max(0, currentViewIndex - 1))}
                disabled={currentViewIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-gray-600">
                {currentViewIndex + 1} of {filteredScreenshots.length}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentViewIndex(Math.min(filteredScreenshots.length - 1, currentViewIndex + 1))}
                disabled={currentViewIndex === filteredScreenshots.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}