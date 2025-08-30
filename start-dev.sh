#!/bin/bash

# TestBro Development Startup Script
# This script starts both frontend and backend in development mode

set -e

echo "🚀 Starting TestBro Development Environment..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check ports
BACKEND_PORT=3001
FRONTEND_PORT=5173

if check_port $BACKEND_PORT; then
    print_warning "Port $BACKEND_PORT is already in use. Backend might already be running."
fi

if check_port $FRONTEND_PORT; then
    print_warning "Port $FRONTEND_PORT is already in use. Frontend might already be running."
fi

# Install dependencies if node_modules doesn't exist
print_status "Checking dependencies..."

# Backend dependencies
if [ ! -d "testbro-backend/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd testbro-backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

# Frontend dependencies
if [ ! -d "testbro-frontend/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd testbro-frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

# Check for environment files
print_status "Checking environment configuration..."

if [ ! -f "testbro-backend/.env" ]; then
    print_warning "Backend .env file not found. Using default development configuration."
    print_warning "Please configure your environment variables in testbro-backend/.env"
fi

if [ ! -f "testbro-frontend/.env" ]; then
    print_warning "Frontend .env file not found. Using default development configuration."
    print_warning "Please configure your environment variables in testbro-frontend/.env"
fi

# Create log directory
mkdir -p logs

# Function to start backend
start_backend() {
    print_status "Starting backend server..."
    cd testbro-backend
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    echo $BACKEND_PID > logs/backend.pid
    print_success "Backend started (PID: $BACKEND_PID)"
}

# Function to start frontend
start_frontend() {
    print_status "Starting frontend development server..."
    cd testbro-frontend
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    echo $FRONTEND_PID > logs/frontend.pid
    print_success "Frontend started (PID: $FRONTEND_PID)"
}

# Start services
start_backend
sleep 3  # Give backend time to start
start_frontend

print_status "Waiting for services to be ready..."
sleep 5

# Check if services are running
if check_port $BACKEND_PORT; then
    print_success "Backend is running on http://localhost:$BACKEND_PORT"
else
    print_error "Backend failed to start on port $BACKEND_PORT"
    print_error "Check logs/backend.log for details"
fi

if check_port $FRONTEND_PORT; then
    print_success "Frontend is running on http://localhost:$FRONTEND_PORT"
else
    print_error "Frontend failed to start on port $FRONTEND_PORT"
    print_error "Check logs/frontend.log for details"
fi

echo ""
echo "========================================"
echo "🎉 TestBro Development Environment Ready!"
echo "========================================"
echo ""
echo "Frontend:  http://localhost:$FRONTEND_PORT"
echo "Backend:   http://localhost:$BACKEND_PORT"
echo "Health:    http://localhost:$BACKEND_PORT/health"
echo ""
echo "Logs:"
echo "  Backend:  tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""
echo "To stop all services:"
echo "  ./stop-dev.sh"
echo ""

# Wait for user input to stop
echo "Press Ctrl+C to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "Stopping services..."
    
    if [ -f logs/backend.pid ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm logs/backend.pid
        print_success "Backend stopped"
    fi
    
    if [ -f logs/frontend.pid ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm logs/frontend.pid
        print_success "Frontend stopped"
    fi
    
    print_success "All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait indefinitely
while true; do
    sleep 1
done