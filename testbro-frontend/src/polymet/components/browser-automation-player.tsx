import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Monitor,
  Clock,
  Eye,
  Download,
  Share,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface BrowserAutomationData {
  videoUrl?: string;
  liveStreamUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  recordingStartTime: string;
  recordingEndTime?: string;
  playbackControls: {
    canPlay: boolean;
    canPause: boolean;
    canSeek: boolean;
    availableSpeeds: number[];
  };
}

interface BrowserAutomationPlayerProps {
  automationData: BrowserAutomationData;
  testCaseName: string;
  isLive?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export default function BrowserAutomationPlayer({
  automationData,
  testCaseName,
  isLive = false,
  onTimeUpdate,
  className = "",
}: BrowserAutomationPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(automationData.duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        setBuffered(bufferedPercent);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !automationData.playbackControls.canPlay) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video || !automationData.playbackControls.canSeek) return;

    const newTime = (value[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0] / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const changePlaybackSpeed = (speed: string) => {
    const video = videoRef.current;
    if (!video) return;

    const newSpeed = parseFloat(speed);
    video.playbackRate = newSpeed;
    setPlaybackSpeed(newSpeed);
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !automationData.playbackControls.canSeek) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getVideoSource = () => {
    if (isLive && automationData.liveStreamUrl) {
      return automationData.liveStreamUrl;
    }
    return automationData.videoUrl;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <TooltipProvider>
      <Card className={`overflow-hidden ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-blue-600" />

                <span>Browser Automation</span>
                {isLive && (
                  <Badge variant="destructive" className="animate-pulse">
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{testCaseName}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download Recording</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share Recording</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Video Player */}
          <div
            className="relative bg-black aspect-video group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />

                  <p className="text-sm">Loading automation recording...</p>
                </div>
              </div>
            )}

            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              poster={automationData.thumbnailUrl}
              preload="metadata"
              onClick={togglePlay}
            >
              {getVideoSource() && (
                <source src={getVideoSource()} type="video/mp4" />
              )}
              Your browser does not support the video tag.
            </video>

            {/* Video Overlay - No Video Available */}
            {!getVideoSource() && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />

                  <h3 className="text-lg font-medium mb-2">
                    Recording Not Available
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Browser automation recording is being processed or not
                    available for this test run.
                  </p>
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />

                        <span>
                          Started:{" "}
                          {new Date(
                            automationData.recordingStartTime
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      {automationData.recordingEndTime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />

                          <span>
                            Duration: {formatTime(automationData.duration)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            {showControls && getVideoSource() && !isLoading && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                {/* Play/Pause Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 text-white"
                    onClick={togglePlay}
                    disabled={!automationData.playbackControls.canPlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="relative">
                      {/* Buffer Progress */}
                      <div className="absolute inset-0 bg-white/20 rounded-full h-1">
                        <div
                          className="bg-white/40 h-full rounded-full transition-all duration-300"
                          style={{ width: `${buffered}%` }}
                        />
                      </div>
                      {/* Playback Progress */}
                      <Slider
                        value={[progressPercentage]}
                        onValueChange={handleSeek}
                        max={100}
                        step={0.1}
                        className="relative"
                        disabled={!automationData.playbackControls.canSeek}
                      />
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Play/Pause */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={togglePlay}
                        disabled={!automationData.playbackControls.canPlay}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Skip Controls */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={() => skipTime(-10)}
                        disabled={!automationData.playbackControls.canSeek}
                      >
                        <SkipBack className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={() => skipTime(10)}
                        disabled={!automationData.playbackControls.canSeek}
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>

                      {/* Volume */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={toggleMute}
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="w-20">
                          <Slider
                            value={[isMuted ? 0 : volume * 100]}
                            onValueChange={handleVolumeChange}
                            max={100}
                            step={1}
                          />
                        </div>
                      </div>

                      {/* Time Display */}
                      <div className="text-white text-sm font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Playback Speed */}
                      <Select
                        value={playbackSpeed.toString()}
                        onValueChange={changePlaybackSpeed}
                      >
                        <SelectTrigger className="w-16 h-8 text-white border-white/20 bg-black/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {automationData.playbackControls.availableSpeeds.map(
                            (speed) => (
                              <SelectItem key={speed} value={speed.toString()}>
                                {speed}x
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>

                      {/* Fullscreen */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? (
                          <Minimize className="w-4 h-4" />
                        ) : (
                          <Maximize className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Stream Indicator */}
            {isLive && (
              <div className="absolute top-4 right-4">
                <Badge variant="destructive" className="animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                  LIVE
                </Badge>
              </div>
            )}
          </div>

          {/* Video Information */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />

                <span className="text-gray-600">Recording Started:</span>
                <span className="font-medium">
                  {new Date(automationData.recordingStartTime).toLocaleString()}
                </span>
              </div>

              {automationData.recordingEndTime && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />

                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {formatTime(automationData.duration)}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-gray-500" />

                <span className="text-gray-600">Quality:</span>
                <span className="font-medium">1080p HD</span>
              </div>
            </div>

            {/* Playback Features */}
            <Separator className="my-3" />

            <div className="flex flex-wrap gap-2">
              {automationData.playbackControls.canPlay && (
                <Badge variant="outline" className="text-xs">
                  Playback Available
                </Badge>
              )}
              {automationData.playbackControls.canSeek && (
                <Badge variant="outline" className="text-xs">
                  Seekable
                </Badge>
              )}
              {automationData.playbackControls.availableSpeeds.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  Variable Speed
                </Badge>
              )}
              {isLive && (
                <Badge variant="outline" className="text-xs">
                  Live Stream
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
