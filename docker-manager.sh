#!/bin/bash

# TestBro.ai Docker Management Script
# This script provides easy commands for managing the TestBro Docker stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
COMPOSE_DEV_FILE="docker-compose.dev.yml"
ENV_FILE=".env"
ENV_TEMPLATE=".env.template"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Requirements check passed"
}

setup_environment() {
    log_info "Setting up environment..."
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_TEMPLATE" ]; then
            cp "$ENV_TEMPLATE" "$ENV_FILE"
            log_warning "Created $ENV_FILE from template. Please update the values before running the application."
            log_info "Edit $ENV_FILE and update the following required values:"
            echo "  - SUPABASE_URL"
            echo "  - SUPABASE_SERVICE_ROLE_KEY"
            echo "  - OPENROUTER_KEY"
            echo "  - JWT_SECRET (change the default!)"
            echo "  - JWT_REFRESH_SECRET (change the default!)"
            echo "  - REDIS_PASSWORD (change the default!)"
            echo "  - POSTGRES_PASSWORD (change the default!)"
            return 1
        else
            log_error "Environment template file $ENV_TEMPLATE not found"
            exit 1
        fi
    fi
    
    log_success "Environment setup complete"
}

build_images() {
    local mode=${1:-production}
    log_info "Building Docker images for $mode mode..."
    
    if [ "$mode" == "development" ]; then
        docker-compose -f "$COMPOSE_DEV_FILE" build --no-cache
    else
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    fi
    
    log_success "Docker images built successfully"
}

start_services() {
    local mode=${1:-production}
    local profile=${2:-""}
    
    log_info "Starting TestBro services in $mode mode..."
    
    if [ "$mode" == "development" ]; then
        docker-compose -f "$COMPOSE_DEV_FILE" up -d
    else
        if [ -n "$profile" ]; then
            docker-compose -f "$COMPOSE_FILE" --profile "$profile" up -d
        else
            docker-compose -f "$COMPOSE_FILE" up -d
        fi
    fi
    
    log_success "Services started successfully"
    show_status
}

stop_services() {
    local mode=${1:-production}
    
    log_info "Stopping TestBro services..."
    
    if [ "$mode" == "development" ]; then
        docker-compose -f "$COMPOSE_DEV_FILE" down
    else
        docker-compose -f "$COMPOSE_FILE" down
    fi
    
    log_success "Services stopped successfully"
}

restart_services() {
    local mode=${1:-production}
    log_info "Restarting TestBro services..."
    
    stop_services "$mode"
    start_services "$mode"
}

show_logs() {
    local service=${1:-""}
    local mode=${2:-production}
    
    if [ -n "$service" ]; then
        log_info "Showing logs for service: $service"
        if [ "$mode" == "development" ]; then
            docker-compose -f "$COMPOSE_DEV_FILE" logs -f "$service"
        else
            docker-compose -f "$COMPOSE_FILE" logs -f "$service"
        fi
    else
        log_info "Showing logs for all services"
        if [ "$mode" == "development" ]; then
            docker-compose -f "$COMPOSE_DEV_FILE" logs -f
        else
            docker-compose -f "$COMPOSE_FILE" logs -f
        fi
    fi
}

show_status() {
    log_info "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Service URLs:"
    echo "  Frontend:  http://localhost:3000"
    echo "  Backend:   http://localhost:3001"
    echo "  Health:    http://localhost:3001/health"
    echo "  Metrics:   http://localhost:3001/api/metrics"
    echo "  Redis:     localhost:6379"
    echo "  Postgres:  localhost:5432"
}

cleanup() {
    log_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Cleaning up Docker resources..."
        
        # Stop and remove containers
        docker-compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
        docker-compose -f "$COMPOSE_DEV_FILE" down --volumes --remove-orphans 2>/dev/null || true
        
        # Remove images
        docker rmi $(docker images testbro* -q) 2>/dev/null || true
        
        # Remove unused volumes
        docker volume prune -f
        
        log_success "Cleanup complete"
    else
        log_info "Cleanup cancelled"
    fi
}

run_migrations() {
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec testbro-backend npm run migrate
    log_success "Migrations completed"
}

backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    log_info "Creating data backup in $backup_dir..."
    
    # Backup PostgreSQL
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U testbro testbro > "$backup_dir/postgres_backup.sql"
    
    # Backup Redis (if needed)
    docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli --rdb - > "$backup_dir/redis_backup.rdb"
    
    log_success "Backup created in $backup_dir"
}

restore_data() {
    local backup_dir=${1}
    
    if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
        log_error "Please provide a valid backup directory"
        exit 1
    fi
    
    log_warning "This will restore data from $backup_dir. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Restoring data from $backup_dir..."
        
        # Restore PostgreSQL
        if [ -f "$backup_dir/postgres_backup.sql" ]; then
            docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U testbro -d testbro < "$backup_dir/postgres_backup.sql"
        fi
        
        log_success "Data restored from $backup_dir"
    else
        log_info "Restore cancelled"
    fi
}

show_help() {
    echo "TestBro.ai Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup                    Setup environment files"
    echo "  build [dev|prod]         Build Docker images"
    echo "  start [dev|prod] [profile] Start all services"
    echo "  stop [dev|prod]          Stop all services"
    echo "  restart [dev|prod]       Restart all services"
    echo "  logs [service] [dev|prod] Show logs (optional: specific service)"
    echo "  status                   Show service status"
    echo "  cleanup                  Remove all containers, volumes, and images"
    echo "  migrate                  Run database migrations"
    echo "  backup                   Create data backup"
    echo "  restore [backup_dir]     Restore data from backup"
    echo "  shell [service]          Open shell in container"
    echo "  help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup                 # Setup environment"
    echo "  $0 start dev             # Start in development mode"
    echo "  $0 start prod monitoring # Start production with monitoring"
    echo "  $0 logs testbro-backend  # Show backend logs"
    echo "  $0 shell testbro-backend # Open shell in backend container"
}

open_shell() {
    local service=${1:-testbro-backend}
    log_info "Opening shell in $service container..."
    docker-compose -f "$COMPOSE_FILE" exec "$service" /bin/sh
}

# Main script logic
case "$1" in
    "setup")
        check_requirements
        setup_environment
        ;;
    "build")
        check_requirements
        build_images "$2"
        ;;
    "start")
        check_requirements
        setup_environment
        start_services "$2" "$3"
        ;;
    "stop")
        stop_services "$2"
        ;;
    "restart")
        restart_services "$2"
        ;;
    "logs")
        show_logs "$2" "$3"
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "migrate")
        run_migrations
        ;;
    "backup")
        backup_data
        ;;
    "restore")
        restore_data "$2"
        ;;
    "shell")
        open_shell "$2"
        ;;
    "help"|*)
        show_help
        ;;
esac