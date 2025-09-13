/**
 * Test Flow Canvas
 * The main workspace where users design their test flows visually
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlusIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { TestStep, StepConnection } from '../index';

interface TestFlowCanvasProps {
  steps: TestStep[];
  connections: StepConnection[];
  onAddStep: (stepType: TestStep['type'], position: { x: number; y: number }) => void;
  onUpdateStepPosition: (stepId: string, position: { x: number; y: number }) => void;
  onSelectStep: (stepId: string | null) => void;
  onCreateConnection: (sourceId: string, targetId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  selectedStepId: string | null;
  readonly?: boolean;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  stepId?: string;
}

interface ConnectionDragState {
  isConnecting: boolean;
  sourceId: string | null;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
}

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDraggingCanvas: boolean;
  startX: number;
  startY: number;
}

export default function TestFlowCanvas({
  steps,
  connections,
  onAddStep,
  onUpdateStepPosition,
  onSelectStep,
  onCreateConnection,
  onDeleteConnection,
  selectedStepId,
  readonly = false
}: TestFlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState>({
    isConnecting: false,
    sourceId: null,
    sourceX: 0,
    sourceY: 0,
    currentX: 0,
    currentY: 0
  });
  
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDraggingCanvas: false,
    startX: 0,
    startY: 0
  });
  
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    stepId?: string;
    connectionId?: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0
  });

  // Close context menu when clicked outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuState.isOpen) {
        setContextMenuState(prev => ({ ...prev, isOpen: false }));
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuState.isOpen]);

  // Handle drop from component palette
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      // Calculate canvas-relative coordinates
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      // Adjust for current view transformations
      const canvasX = (e.clientX - canvasRect.left - viewState.offsetX) / viewState.scale;
      const canvasY = (e.clientY - canvasRect.top - viewState.offsetY) / viewState.scale;
      
      // Parse dropped item data
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.type) {
        onAddStep(data.type, { x: canvasX, y: canvasY });
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  // Allow drops by preventing default
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle step mouse down for dragging
  const handleStepMouseDown = (e: React.MouseEvent, stepId: string) => {
    if (readonly) return;
    if (e.button !== 0) return; // Only left-click
    
    e.stopPropagation(); // Prevent canvas drag
    
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    setDragState({
      isDragging: true,
      stepId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    });
    
    // Select the step
    onSelectStep(stepId);
  };

  // Handle step connection point mouse down
  const handleConnectionStart = (e: React.MouseEvent, stepId: string) => {
    if (readonly) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Get connection starting position
    const stepElement = document.getElementById(`step-${stepId}`);
    if (!stepElement) return;
    
    const rect = stepElement.getBoundingClientRect();
    const sourceX = rect.right;
    const sourceY = rect.top + rect.height / 2;
    
    setConnectionDrag({
      isConnecting: true,
      sourceId: stepId,
      sourceX,
      sourceY,
      currentX: e.clientX,
      currentY: e.clientY
    });
  };

  // Handle mouse move for dragging steps
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Handle step dragging
    if (dragState.isDragging && dragState.stepId) {
      setDragState(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY
      }));
      
      const step = steps.find(s => s.id === dragState.stepId);
      if (!step) return;
      
      // Calculate the new position with the drag delta and scale
      const deltaX = (e.clientX - dragState.startX) / viewState.scale;
      const deltaY = (e.clientY - dragState.startY) / viewState.scale;
      
      // Update step position in real-time
      onUpdateStepPosition(dragState.stepId, {
        x: step.position.x + deltaX,
        y: step.position.y + deltaY
      });
      
      // Reset start position for next move calculation
      setDragState(prev => ({
        ...prev,
        startX: e.clientX,
        startY: e.clientY
      }));
    }
    
    // Handle connection dragging
    if (connectionDrag.isConnecting) {
      setConnectionDrag(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY
      }));
    }
    
    // Handle canvas dragging
    if (viewState.isDraggingCanvas) {
      const deltaX = e.clientX - viewState.startX;
      const deltaY = e.clientY - viewState.startY;
      
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
        startX: e.clientX,
        startY: e.clientY
      }));
    }
  }, [
    dragState, 
    steps, 
    viewState.scale, 
    viewState.isDraggingCanvas, 
    viewState.startX, 
    viewState.startY, 
    connectionDrag.isConnecting, 
    onUpdateStepPosition
  ]);

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    // End step dragging
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
    }
    
    // End canvas dragging
    if (viewState.isDraggingCanvas) {
      setViewState(prev => ({
        ...prev,
        isDraggingCanvas: false
      }));
    }
    
    // End connection dragging - check if we're over a valid target
    if (connectionDrag.isConnecting && connectionDrag.sourceId && hoveredStepId) {
      // Don't connect to self
      if (connectionDrag.sourceId !== hoveredStepId) {
        onCreateConnection(connectionDrag.sourceId, hoveredStepId);
      }
      
      // Reset connection drag
      setConnectionDrag({
        isConnecting: false,
        sourceId: null,
        sourceX: 0,
        sourceY: 0,
        currentX: 0,
        currentY: 0
      });
    } else if (connectionDrag.isConnecting) {
      // Just reset if not over a target
      setConnectionDrag({
        isConnecting: false,
        sourceId: null,
        sourceX: 0,
        sourceY: 0,
        currentX: 0,
        currentY: 0
      });
    }
  }, [
    dragState.isDragging, 
    viewState.isDraggingCanvas, 
    connectionDrag, 
    hoveredStepId, 
    onCreateConnection
  ]);

  // Add global event listeners for mouse move and up
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    
    // Start canvas drag if not dragging a step or connection
    if (!dragState.isDragging && !connectionDrag.isConnecting && !contextMenuState.isOpen) {
      setViewState(prev => ({
        ...prev,
        isDraggingCanvas: true,
        startX: e.clientX,
        startY: e.clientY
      }));
      
      // Deselect any selected step
      onSelectStep(null);
    }
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Calculate zoom factor based on scroll direction
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newScale = Math.max(0.1, Math.min(3, viewState.scale + delta));
    
    // Calculate the point to zoom around (cursor position)
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    // Calculate new offsets to zoom around cursor
    const newOffsetX = mouseX - (mouseX - viewState.offsetX) * (newScale / viewState.scale);
    const newOffsetY = mouseY - (mouseY - viewState.offsetY) * (newScale / viewState.scale);
    
    setViewState(prev => ({
      ...prev,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  };

  // Reset view to fit all steps
  const resetView = () => {
    if (steps.length === 0 || !canvasRef.current) {
      setViewState({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDraggingCanvas: false,
        startX: 0,
        startY: 0
      });
      return;
    }
    
    // Find the bounds of all steps
    const minX = Math.min(...steps.map(s => s.position.x)) - 50;
    const minY = Math.min(...steps.map(s => s.position.y)) - 50;
    const maxX = Math.max(...steps.map(s => s.position.x + 200)) + 50; // assuming step width is 200px
    const maxY = Math.max(...steps.map(s => s.position.y + 100)) + 50; // assuming step height is 100px
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Calculate scale to fit
    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;
    
    const scaleX = canvasWidth / width;
    const scaleY = canvasHeight / height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 100%
    
    // Calculate center position
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate offsets to center
    const offsetX = (canvasWidth / 2) - (centerX * scale);
    const offsetY = (canvasHeight / 2) - (centerY * scale);
    
    setViewState({
      scale,
      offsetX,
      offsetY,
      isDraggingCanvas: false,
      startX: 0,
      startY: 0
    });
  };

  // Handle right-click context menu
  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'canvas' | 'step' | 'connection',
    id?: string
  ) => {
    e.preventDefault();
    
    setContextMenuState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      stepId: type === 'step' ? id : undefined,
      connectionId: type === 'connection' ? id : undefined
    });
  };

  // Calculate step position adjusted for view transforms
  const getAdjustedStepPosition = (step: TestStep) => {
    const x = step.position.x * viewState.scale + viewState.offsetX;
    const y = step.position.y * viewState.scale + viewState.offsetY;
    return { x, y };
  };

  // Calculate connection paths
  const getConnectionPath = (connection: StepConnection) => {
    const sourceStep = steps.find(s => s.id === connection.source);
    const targetStep = steps.find(s => s.id === connection.target);
    
    if (!sourceStep || !targetStep) return '';
    
    const sourcePos = getAdjustedStepPosition(sourceStep);
    const targetPos = getAdjustedStepPosition(targetStep);
    
    // Right center of source
    const sourceX = sourcePos.x + 200; // assuming step width
    const sourceY = sourcePos.y + 50; // assuming step height / 2
    
    // Left center of target
    const targetX = targetPos.x;
    const targetY = targetPos.y + 50; // assuming step height / 2
    
    // Control points for bezier curve
    const controlX1 = sourceX + 50;
    const controlY1 = sourceY;
    const controlX2 = targetX - 50;
    const controlY2 = targetY;
    
    return `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
  };

  // Render connection being dragged
  const renderConnectionDrag = () => {
    if (!connectionDrag.isConnecting) return null;
    
    // Calculate source position in canvas coordinates
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;
    
    const sourceX = connectionDrag.sourceX - canvasRect.left;
    const sourceY = connectionDrag.sourceY - canvasRect.top;
    const currentX = connectionDrag.currentX - canvasRect.left;
    const currentY = connectionDrag.currentY - canvasRect.top;
    
    // Control points for bezier curve
    const controlX1 = sourceX + 50;
    const controlY1 = sourceY;
    const controlX2 = currentX - 50;
    const controlY2 = currentY;
    
    return (
      <path
        d={`M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${currentX} ${currentY}`}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
    );
  };

  // Render a step
  const renderStep = (step: TestStep) => {
    const { x, y } = getAdjustedStepPosition(step);
    const isSelected = step.id === selectedStepId;
    const isHovered = step.id === hoveredStepId;
    
    // Determine step color based on type
    const typeColors = {
      navigation: 'border-blue-500 bg-blue-50',
      action: 'border-green-500 bg-green-50',
      assertion: 'border-yellow-500 bg-yellow-50',
      wait: 'border-purple-500 bg-purple-50',
      data: 'border-gray-500 bg-gray-50'
    };
    
    const colorClass = typeColors[step.type] || 'border-gray-300 bg-white';
    
    return (
      <div
        id={`step-${step.id}`}
        key={step.id}
        className={`absolute rounded-lg border-2 ${colorClass} p-3 w-48 shadow-sm transition-all
          ${isSelected ? 'ring-2 ring-blue-400 border-blue-400' : ''}
          ${isHovered ? 'shadow-md' : ''}
          ${readonly ? 'cursor-default' : 'cursor-move'}`
        }
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: '200px',
          transform: `scale(${viewState.scale})`,
          transformOrigin: 'top left',
        }}
        onMouseDown={(e) => handleStepMouseDown(e, step.id)}
        onMouseEnter={() => setHoveredStepId(step.id)}
        onMouseLeave={() => setHoveredStepId(null)}
        onContextMenu={(e) => handleContextMenu(e, 'step', step.id)}
      >
        {/* Step header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              step.type === 'navigation' ? 'bg-blue-500' :
              step.type === 'action' ? 'bg-green-500' :
              step.type === 'assertion' ? 'bg-yellow-500' :
              step.type === 'wait' ? 'bg-purple-500' :
              'bg-gray-500'
            }`} />
            <span className="font-medium text-sm truncate">
              {step.name || `${step.type} Step`}
            </span>
          </div>
          <span className="text-xs text-gray-500 uppercase">
            {step.type}
          </span>
        </div>
        
        {/* Step content */}
        <div className="text-xs text-gray-600 mb-2">
          {step.action || 'No action defined'}
        </div>
        
        {/* Step description */}
        {step.description && (
          <div className="text-xs text-gray-500 italic truncate">
            {step.description}
          </div>
        )}
        
        {/* Connection points */}
        {!readonly && (
          <>
            {/* Input connector (left) */}
            <div
              className="absolute w-3 h-3 rounded-full bg-white border-2 border-gray-400 cursor-pointer hover:border-blue-500"
              style={{ left: '-6px', top: 'calc(50% - 6px)' }}
            />
            
            {/* Output connector (right) */}
            <div
              className="absolute w-3 h-3 rounded-full bg-white border-2 border-gray-400 cursor-pointer hover:border-blue-500"
              style={{ right: '-6px', top: 'calc(50% - 6px)' }}
              onMouseDown={(e) => handleConnectionStart(e, step.id)}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Canvas toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={resetView}
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          title="Reset view"
        >
          <ArrowsPointingOutIcon className="w-4 h-4 text-gray-700" />
        </button>
        
        {!readonly && (
          <button
            onClick={() => onAddStep('action', { x: 200, y: 200 })}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
            title="Add step"
          >
            <PlusIcon className="w-4 h-4 text-gray-700" />
          </button>
        )}
      </div>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 bg-white px-2 py-1 rounded-md shadow-md text-xs text-gray-600">
        {Math.round(viewState.scale * 100)}%
      </div>
      
      {/* Main canvas */}
      <div
        ref={canvasRef}
        className={`h-full w-full bg-white ${
          viewState.isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={(e) => handleContextMenu(e, 'canvas')}
      >
        {/* Grid background (visual only) */}
        <div
          className="absolute inset-0 bg-grid-pattern"
          style={{
            backgroundSize: `${40 * viewState.scale}px ${40 * viewState.scale}px`,
            backgroundPosition: `${viewState.offsetX % (40 * viewState.scale)}px ${viewState.offsetY % (40 * viewState.scale)}px`,
          }}
        />
        
        {/* SVG layer for connections */}
        <svg className="absolute inset-0 pointer-events-none">
          {/* Render all connections */}
          {connections.map(connection => {
            const isHovered = connection.id === hoveredConnectionId;
            
            return (
              <g key={connection.id}>
                <path
                  d={getConnectionPath(connection)}
                  fill="none"
                  stroke={isHovered ? '#3b82f6' : '#94a3b8'}
                  strokeWidth={isHovered ? '3' : '2'}
                  className="pointer-events-auto"
                  onMouseEnter={() => setHoveredConnectionId(connection.id)}
                  onMouseLeave={() => setHoveredConnectionId(null)}
                  onClick={(e) => {
                    if (!readonly) {
                      e.stopPropagation();
                      onDeleteConnection(connection.id);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, 'connection', connection.id)}
                />
                
                {/* Arrow head */}
                <polygon
                  points="0,-5 10,0 0,5"
                  fill={isHovered ? '#3b82f6' : '#94a3b8'}
                  className="pointer-events-none"
                  transform={(() => {
                    // Calculate arrow position at the end of the path
                    const sourceStep = steps.find(s => s.id === connection.source);
                    const targetStep = steps.find(s => s.id === connection.target);
                    
                    if (!sourceStep || !targetStep) return '';
                    
                    const sourcePos = getAdjustedStepPosition(sourceStep);
                    const targetPos = getAdjustedStepPosition(targetStep);
                    
                    // Right center of source
                    const sourceX = sourcePos.x + 200;
                    const sourceY = sourcePos.y + 50;
                    
                    // Left center of target
                    const targetX = targetPos.x;
                    const targetY = targetPos.y + 50;
                    
                    // Calculate angle for arrow rotation
                    const dx = targetX - sourceX;
                    const dy = targetY - sourceY;
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    
                    return `translate(${targetX}, ${targetY}) rotate(${angle})`;
                  })()}
                />
              </g>
            );
          })}
          
          {/* Render connection being dragged */}
          {renderConnectionDrag()}
        </svg>
        
        {/* Render all steps */}
        {steps.map(step => renderStep(step))}
        
        {/* Context menu */}
        {contextMenuState.isOpen && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-40"
            style={{
              left: `${contextMenuState.x}px`,
              top: `${contextMenuState.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenuState.stepId && (
              <>
                <button
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    onSelectStep(contextMenuState.stepId!);
                    setContextMenuState(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  Configure Step
                </button>
                <button
                  className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                  onClick={() => {
                    // Delete step function would go here
                    setContextMenuState(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  Delete Step
                </button>
              </>
            )}
            
            {contextMenuState.connectionId && (
              <button
                className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                onClick={() => {
                  onDeleteConnection(contextMenuState.connectionId!);
                  setContextMenuState(prev => ({ ...prev, isOpen: false }));
                }}
              >
                Delete Connection
              </button>
            )}
            
            {!contextMenuState.stepId && !contextMenuState.connectionId && (
              <>
                <button
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    // Calculate canvas-relative position
                    const canvasRect = canvasRef.current?.getBoundingClientRect();
                    if (!canvasRect) return;
                    
                    const canvasX = (contextMenuState.x - canvasRect.left - viewState.offsetX) / viewState.scale;
                    const canvasY = (contextMenuState.y - canvasRect.top - viewState.offsetY) / viewState.scale;
                    
                    onAddStep('action', { x: canvasX, y: canvasY });
                    setContextMenuState(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  Add Step Here
                </button>
                <button
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    resetView();
                    setContextMenuState(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  Reset View
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
