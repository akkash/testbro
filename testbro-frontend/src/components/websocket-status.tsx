import React from "react";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWebSocket } from "@/hooks/useWebSocket";

interface WebSocketStatusProps {
  showDetails?: boolean;
  showRetryButton?: boolean;
  variant?: "badge" | "alert" | "inline";
  className?: string;
}

export function WebSocketStatus({ 
  showDetails = false, 
  showRetryButton = false,
  variant = "badge",
  className = ""
}: WebSocketStatusProps) {
  const { connectionState, connect } = useWebSocket();

  const handleRetry = () => {
    if (!connectionState.connecting) {
      connect().catch(console.error);
    }
  };

  if (variant === "alert") {
    if (!connectionState.connected) {
      return (
        <Alert variant={connectionState.error ? "destructive" : "default"} className={className}>
          <div className="flex items-center space-x-2">
            {connectionState.connecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="flex items-center justify-between w-full">
                <span>
                  {connectionState.connecting 
                    ? "Connecting to real-time service..." 
                    : connectionState.error 
                    ? `Connection failed: ${connectionState.error}`
                    : "Real-time updates unavailable"
                  }
                </span>
                {showRetryButton && !connectionState.connecting && (
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    Retry
                  </Button>
                )}
              </div>
            </AlertDescription>
          </div>
        </Alert>
      );
    }
    return null;
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {connectionState.connected ? (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Real-time Connected</span>
          </>
        ) : connectionState.connecting ? (
          <>
            <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
            <span className="text-sm text-yellow-700">Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">Disconnected</span>
            {showRetryButton && (
              <Button variant="ghost" size="sm" onClick={handleRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {connectionState.connected ? (
        <Badge variant="outline" className="text-green-700 border-green-300">
          <Wifi className="w-3 h-3 mr-1" />
          Live Connected
          {showDetails && connectionState.connectionId && (
            <span className="ml-1 text-xs opacity-75">
              ({connectionState.connectionId.slice(-4)})
            </span>
          )}
        </Badge>
      ) : connectionState.connecting ? (
        <Badge variant="outline" className="text-yellow-700 border-yellow-300">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Connecting...
        </Badge>
      ) : (
        <Badge variant="outline" className="text-red-700 border-red-300">
          <WifiOff className="w-3 h-3 mr-1" />
          Disconnected
        </Badge>
      )}
      {showRetryButton && !connectionState.connected && !connectionState.connecting && (
        <Button variant="ghost" size="sm" onClick={handleRetry}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

export default WebSocketStatus;