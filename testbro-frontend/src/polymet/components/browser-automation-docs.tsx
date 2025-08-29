import React from "react";
import {
  Monitor,
  Play,
  Eye,
  Download,
  Share,
  Settings,
  Wifi,
  Video,
  Clock,
  Zap,
  Shield,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BrowserAutomationDocs() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Monitor className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Browser Automation Playback
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Watch your tests execute in real-time with live streaming and recorded
          playback. See exactly how TestBro.ai interacts with your application,
          just like a human QA engineer.
        </p>
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Live Streaming
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <Video className="w-3 h-3 mr-1" />
            HD Recording
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            <Zap className="w-3 h-3 mr-1" />
            Real-time
          </Badge>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-green-600" />

              <span>Live Streaming</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Watch tests execute in real-time as they run. See every click,
              type, and navigation as it happens with low-latency streaming.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />

                <span>Real-time browser view</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />

                <span>Live status updates</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />

                <span>Multi-viewer support</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-blue-600" />

              <span>Recorded Playback</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Every test execution is automatically recorded in HD quality.
              Review past runs with full video controls and playback options.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />

                <span>1080p HD quality</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />

                <span>Variable playback speeds</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />

                <span>Seek and skip controls</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />

              <span>Smart Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Videos are automatically linked to test results, UX insights, and
              performance metrics for comprehensive analysis.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />

                <span>Linked to test results</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />

                <span>UX scoring integration</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />

                <span>Historical tracking</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Browser Automation Works</CardTitle>
          <CardDescription>
            Understanding the technology behind TestBro.ai's browser automation
            recording
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="capture" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="capture">Capture</TabsTrigger>
              <TabsTrigger value="stream">Stream</TabsTrigger>
              <TabsTrigger value="record">Record</TabsTrigger>
              <TabsTrigger value="playback">Playback</TabsTrigger>
            </TabsList>

            <TabsContent value="capture" className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Browser Capture Technology
                  </h3>
                  <p className="text-gray-600 mb-4">
                    TestBro.ai uses advanced browser automation frameworks
                    (Playwright/Selenium) with built-in screen recording
                    capabilities to capture every interaction.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Capture Features:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Full browser viewport recording</li>
                        <li>• Mouse movements and clicks</li>
                        <li>• Keyboard inputs and form interactions</li>
                        <li>• Page navigation and scrolling</li>
                        <li>• Element highlighting and focus</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Quality Settings:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 1080p HD resolution</li>
                        <li>• 30 FPS smooth playback</li>
                        <li>• Optimized compression</li>
                        <li>• Minimal performance impact</li>
                        <li>• Cross-browser compatibility</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stream" className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Live Streaming Infrastructure
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Real-time streaming allows you to watch tests as they
                    execute, providing immediate feedback and the ability to
                    monitor long-running test suites.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">
                        Streaming Features:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Low-latency WebRTC streaming</li>
                        <li>• Adaptive quality based on connection</li>
                        <li>• Multiple concurrent viewers</li>
                        <li>• Real-time status overlays</li>
                        <li>• Automatic reconnection</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Performance:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• &lt; 500ms latency</li>
                        <li>• Bandwidth optimization</li>
                        <li>• CDN-powered delivery</li>
                        <li>• Global edge locations</li>
                        <li>• 99.9% uptime SLA</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="record" className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Recording & Storage</h3>
                  <p className="text-gray-600 mb-4">
                    All test executions are automatically recorded and stored
                    securely in the cloud with intelligent retention policies
                    and easy access controls.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Storage Features:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Automatic cloud storage</li>
                        <li>• Intelligent compression</li>
                        <li>• Configurable retention periods</li>
                        <li>• Secure encrypted storage</li>
                        <li>• Fast retrieval and streaming</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Organization:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Linked to test case IDs</li>
                        <li>• Execution timestamp metadata</li>
                        <li>• Project and suite organization</li>
                        <li>• Searchable by test results</li>
                        <li>• Bulk download options</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="playback" className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Advanced Playback Controls
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Rich video player with professional controls designed
                    specifically for test analysis and debugging workflows.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Player Controls:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Play, pause, and seek controls</li>
                        <li>• Variable speed (0.5x to 2x)</li>
                        <li>• Skip forward/backward (10s)</li>
                        <li>• Volume control and muting</li>
                        <li>• Fullscreen mode</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">
                        Advanced Features:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Frame-by-frame stepping</li>
                        <li>• Thumbnail preview on hover</li>
                        <li>• Keyboard shortcuts</li>
                        <li>• Download and sharing</li>
                        <li>• Picture-in-picture mode</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Integration Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Integration with Test Results</CardTitle>
          <CardDescription>
            How browser automation videos enhance your testing workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Individual Test Cases</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <Play className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">User Registration Flow</div>
                    <div className="text-sm text-gray-500">
                      5:30 duration • Passed
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Each test case gets its own recording, allowing you to see
                  exactly how specific features were tested.
                </p>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Play className="w-3 h-3 mr-1" />
                    Watch
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Sequential Playback</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <Video className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">Complete Test Suite</div>
                    <div className="text-sm text-gray-500">
                      15:45 duration • 3 tests
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Watch all tests in a suite sequentially, or jump to specific
                  test cases that failed for quick debugging.
                </p>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Play className="w-3 h-3 mr-1" />
                    Play All
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    Failed Only
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Live Monitoring</h3>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Wifi className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">
                    Real-time Test Execution Monitoring
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Watch tests execute live with real-time browser automation
                    streams. Perfect for monitoring long-running test suites or
                    debugging flaky tests.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />

                        <span className="text-sm font-medium">Live Stream</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Real-time browser view with &lt; 500ms latency
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-3 h-3 text-blue-500" />

                        <span className="text-sm font-medium">
                          Progress Tracking
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Step-by-step execution progress and timing
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="flex items-center space-x-2 mb-2">
                        <Settings className="w-3 h-3 text-purple-500" />

                        <span className="text-sm font-medium">
                          Control Options
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Pause, stop, or adjust execution parameters
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Requirements & Setup</CardTitle>
          <CardDescription>
            System requirements and configuration for optimal browser automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Backend Requirements</h3>
              <Alert>
                <Info className="h-4 w-4" />

                <AlertTitle>Automation Framework</AlertTitle>
                <AlertDescription>
                  Requires Playwright or Selenium WebDriver with screen
                  recording capabilities enabled.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    Playwright Setup:
                  </h4>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono">
                    <div>
                      const browser = await playwright.chromium.launch({`{`}
                    </div>
                    <div className="ml-2">headless: false,</div>
                    <div className="ml-2">recordVideo: {`{`}</div>
                    <div className="ml-4">dir: './recordings',</div>
                    <div className="ml-4">
                      size: {`{`} width: 1920, height: 1080 {`}`}
                    </div>
                    <div className="ml-2">{`}`}</div>
                    <div>{`}`});</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    Video Processing:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• FFmpeg for video compression and streaming</li>
                    <li>• WebRTC for real-time streaming</li>
                    <li>• Cloud storage integration (AWS S3, etc.)</li>
                    <li>• CDN for global video delivery</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Frontend Integration</h3>
              <Alert>
                <Shield className="h-4 w-4" />

                <AlertTitle>Security Considerations</AlertTitle>
                <AlertDescription>
                  All video streams are encrypted and access-controlled based on
                  user permissions.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">API Endpoints:</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div className="font-mono text-xs space-y-1">
                      <div>
                        <span className="text-green-600">GET</span>{" "}
                        /api/executions/{`{id}`}/video
                      </div>
                      <div>
                        <span className="text-blue-600">GET</span>{" "}
                        /api/executions/{`{id}`}/stream
                      </div>
                      <div>
                        <span className="text-purple-600">POST</span>{" "}
                        /api/executions/{`{id}`}/control
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Browser Support:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Chrome/Chromium (recommended)</li>
                    <li>• Firefox with WebRTC support</li>
                    <li>• Safari 14+ (limited features)</li>
                    <li>• Edge Chromium-based</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices & Tips</CardTitle>
          <CardDescription>
            Maximize the value of browser automation recordings in your testing
            workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-green-700">✓ Do's</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />

                  <div>
                    <div className="font-medium">
                      Use for debugging failed tests
                    </div>
                    <div className="text-sm text-gray-600">
                      Videos show exactly where and why tests failed, making
                      debugging much faster.
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />

                  <div>
                    <div className="font-medium">
                      Monitor long-running suites
                    </div>
                    <div className="text-sm text-gray-600">
                      Use live streaming to keep an eye on lengthy test
                      executions.
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />

                  <div>
                    <div className="font-medium">Share with stakeholders</div>
                    <div className="text-sm text-gray-600">
                      Videos provide clear evidence of test results for
                      non-technical team members.
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-red-700">⚠ Don'ts</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

                  <div>
                    <div className="font-medium">
                      Don't record sensitive data
                    </div>
                    <div className="text-sm text-gray-600">
                      Avoid recording tests that handle sensitive information
                      like passwords or PII.
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

                  <div>
                    <div className="font-medium">
                      Don't ignore storage costs
                    </div>
                    <div className="text-sm text-gray-600">
                      Set appropriate retention policies to manage storage costs
                      for video files.
                    </div>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

                  <div>
                    <div className="font-medium">
                      Don't rely solely on videos
                    </div>
                    <div className="text-sm text-gray-600">
                      Use videos alongside logs, screenshots, and metrics for
                      complete analysis.
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Ready to See Your Tests in Action?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Experience the power of browser automation playback. Watch your
            tests execute with crystal-clear video quality and comprehensive
            controls.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button size="lg">
              <Play className="w-5 h-5 mr-2" />
              Start Recording Tests
            </Button>
            <Button size="lg" variant="outline">
              <Eye className="w-5 h-5 mr-2" />
              View Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
