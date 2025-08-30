#!/bin/bash

# TestBro Development Stop Script
# This script stops all development services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🛑 Stopping TestBro Development Environment..."

# Stop backend
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        print_success "Backend stopped (PID: $BACKEND_PID)"
    else
        print_error "Backend process not found"
    fi
    rm logs/backend.pid
else
    print_status "No backend PID file found"
fi

# Stop frontend
if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        print_success "Frontend stopped (PID: $FRONTEND_PID)"
    else
        print_error "Frontend process not found"
    fi
    rm logs/frontend.pid
else
    print_status "No frontend PID file found"
fi

# Kill any remaining processes on the ports
print_status "Cleaning up any remaining processes..."

# Kill processes on port 3001 (backend)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:3001 | xargs kill 2>/dev/null || true
    print_success "Cleaned up processes on port 3001"
fi

# Kill processes on port 5173 (frontend)
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:5173 | xargs kill 2>/dev/null || true
    print_success "Cleaned up processes on port 5173"
fi

print_success "All TestBro development services stopped"