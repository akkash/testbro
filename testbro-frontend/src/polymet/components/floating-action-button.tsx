import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  TestTube,
  Target,
  Play,
  Brain,
  FolderOpen,
  Zap,
  X,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    id: "new-test-case",
    label: "New Test Case",
    icon: TestTube,
    href: "/test-cases/new",
    color: "bg-blue-500 hover:bg-blue-600",
    description: "Create a new test case with AI assistance",
  },
  {
    id: "add-target",
    label: "Add Target",
    icon: Target,
    href: "/test-targets",
    color: "bg-green-500 hover:bg-green-600",
    description: "Add a new application or website to test",
  },
  {
    id: "new-project",
    label: "New Project",
    icon: FolderOpen,
    href: "/projects",
    color: "bg-purple-500 hover:bg-purple-600",
    description: "Create a new project to organize your tests",
  },
  {
    id: "run-simulation",
    label: "AI Simulation",
    icon: Brain,
    href: "/ai-simulation",
    color: "bg-orange-500 hover:bg-orange-600",
    description: "Run AI-powered user behavior simulation",
  },
  {
    id: "quick-execution",
    label: "Quick Run",
    icon: Play,
    href: "/executions",
    color: "bg-red-500 hover:bg-red-600",
    description: "Execute tests immediately",
  },
];

interface FloatingActionButtonProps {
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size?: "sm" | "md" | "lg";
}

export default function FloatingActionButton({
  className,
  position = "bottom-right",
  size = "md",
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-14 h-14",
    lg: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleActionClick = () => {
    setIsOpen(false);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed z-50 flex flex-col items-end space-y-3",
          positionClasses[position],
          className
        )}
      >
        {/* Quick Action Buttons */}
        {isOpen && (
          <div className="flex flex-col space-y-3 animate-in slide-in-from-bottom-2 duration-200">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="sm"
                      className={cn(
                        "w-12 h-12 rounded-full shadow-lg border-0 text-white transition-all duration-200 hover:scale-110",
                        action.color,
                        "animate-in slide-in-from-bottom-1 duration-200"
                      )}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: "both",
                      }}
                      onClick={handleActionClick}
                    >
                      <Link to={action.href}>
                        <Icon className="w-5 h-5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="text-center">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {action.description}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Main FAB Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              className={cn(
                "rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-200 hover:scale-110 active:scale-95",
                sizeClasses[size]
              )}
            >
              {isOpen ? (
                <X
                  className={cn(
                    iconSizeClasses[size],
                    "transition-transform duration-200"
                  )}
                />
              ) : (
                <Plus
                  className={cn(
                    iconSizeClasses[size],
                    "transition-transform duration-200"
                  )}
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isOpen ? "Close quick actions" : "Quick actions"}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </TooltipProvider>
  );
}

// Speed Dial variant for more compact display
export function SpeedDialFAB({
  className,
  position = "bottom-right",
}: Omit<FloatingActionButtonProps, "size">) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed z-50 flex flex-col items-end",
          positionClasses[position],
          className
        )}
      >
        {/* Speed Dial Menu */}
        {isOpen && (
          <div className="mb-4 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-10 px-3 hover:bg-gray-50"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link
                      to={action.href}
                      className="flex items-center space-x-3"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white",
                          action.color.split(" ")[0]
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {action.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {action.description}
                        </p>
                      </div>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Button */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-200 hover:scale-110"
        >
          {isOpen ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-transparent z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </TooltipProvider>
  );
}
