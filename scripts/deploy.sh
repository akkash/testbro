#!/bin/bash

# Blue-Green Deployment Script for TestBro.ai
# This script performs zero-downtime deployment using blue-green strategy

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="docker-compose.yml"
BLUE_GREEN_COMPOSE="docker-compose.blue-green.yml"
NGINX_CONFIG_DIR="/etc/nginx/conf.d"
HEALTH_CHECK_URL="http://localhost:3001/health"
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
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

# Check if running as root or with sudo
check_privileges() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Consider using a non-root user with Docker permissions."
    fi
}

# Backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    local backup_dir="./backups/deployment_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U testbro testbro > "$backup_dir/database_backup.sql"
        log_success "Database backed up to $backup_dir/database_backup.sql"
    fi
    
    # Backup current environment
    cp .env "$backup_dir/env_backup" 2>/dev/null || log_warning "No .env file to backup"
    cp docker-compose.yml "$backup_dir/" 2>/dev/null || true
    
    # Backup current images
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | grep testbro > "$backup_dir/images_backup.txt"
    
    echo "$backup_dir" > .last_backup_path
    log_success "Backup completed: $backup_dir"
}

# Health check function
health_check() {
    local url="${1:-$HEALTH_CHECK_URL}"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    local interval="${3:-$HEALTH_CHECK_INTERVAL}"
    
    log_info "Performing health check on $url"
    
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            log_success "Health check passed for $url"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    echo
    log_error "Health check failed for $url after ${timeout}s"
    return 1
}

# Get current active environment (blue or green)
get_active_environment() {
    if docker-compose -f "$COMPOSE_FILE" ps testbro-backend | grep -q "Up"; then
        echo "blue"
    elif docker-compose -f "$BLUE_GREEN_COMPOSE" ps testbro-backend-green | grep -q "Up"; then
        echo "green"
    else
        echo "none"
    fi
}

# Switch traffic between blue and green
switch_traffic() {
    local target_env="$1"
    
    log_info "Switching traffic to $target_env environment"
    
    if [ "$target_env" == "green" ]; then
        # Switch to green environment
        cat > /tmp/nginx_upstream.conf << EOF
upstream testbro_backend {
    server testbro-backend-green:3001;
}

upstream testbro_frontend {
    server testbro-frontend-green:80;
}
EOF
    else
        # Switch to blue environment (default)
        cat > /tmp/nginx_upstream.conf << EOF
upstream testbro_backend {
    server testbro-backend:3001;
}

upstream testbro_frontend {
    server testbro-frontend:80;
}
EOF
    fi
    
    # Update nginx configuration
    if [ -f "$NGINX_CONFIG_DIR/upstream.conf" ]; then
        sudo cp /tmp/nginx_upstream.conf "$NGINX_CONFIG_DIR/upstream.conf"
        sudo nginx -t && sudo nginx -s reload
        log_success "Traffic switched to $target_env environment"
    else
        log_warning "Nginx upstream configuration not found. Manual configuration required."
    fi
    
    rm -f /tmp/nginx_upstream.conf
}

# Deploy new version
deploy_new_version() {
    local target_env="$1"
    local current_env
    current_env=$(get_active_environment)
    
    log_info "Deploying new version to $target_env environment (current: $current_env)"
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    if [ "$target_env" == "green" ]; then
        docker-compose -f "$BLUE_GREEN_COMPOSE" pull
    else
        docker-compose -f "$COMPOSE_FILE" pull
    fi
    
    # Start new environment
    log_info "Starting $target_env environment..."
    if [ "$target_env" == "green" ]; then
        docker-compose -f "$BLUE_GREEN_COMPOSE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health check on new environment
    local health_url
    if [ "$target_env" == "green" ]; then
        health_url="http://localhost:3002/health"  # Green environment uses different port
    else
        health_url="http://localhost:3001/health"
    fi
    
    if health_check "$health_url"; then
        log_success "New $target_env environment is healthy"
        return 0
    else
        log_error "New $target_env environment failed health check"
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    local current_env
    current_env=$(get_active_environment)
    
    log_warning "Rolling back deployment..."
    
    if [ "$current_env" == "green" ]; then
        # Rollback to blue
        switch_traffic "blue"
        docker-compose -f "$BLUE_GREEN_COMPOSE" down
    else
        # Rollback to previous version (restore from backup if available)
        if [ -f ".last_backup_path" ]; then
            local backup_path
            backup_path=$(cat .last_backup_path)
            
            if [ -d "$backup_path" ]; then
                log_info "Restoring from backup: $backup_path"
                
                # Restore database if backup exists
                if [ -f "$backup_path/database_backup.sql" ]; then
                    docker-compose exec -T postgres psql -U testbro -d testbro < "$backup_path/database_backup.sql"
                fi
                
                # Restore environment
                if [ -f "$backup_path/env_backup" ]; then
                    cp "$backup_path/env_backup" .env
                fi
            fi
        fi
        
        # Restart current environment
        docker-compose -f "$COMPOSE_FILE" restart
    fi
    
    log_success "Rollback completed"
}

# Cleanup old environment
cleanup_old_environment() {
    local old_env="$1"
    
    log_info "Cleaning up $old_env environment..."
    
    if [ "$old_env" == "green" ]; then
        docker-compose -f "$BLUE_GREEN_COMPOSE" down
    else
        # Don't completely remove blue environment, just stop it
        docker-compose -f "$COMPOSE_FILE" stop
    fi
    
    # Clean up unused images
    docker image prune -f
    
    log_success "Cleanup of $old_env environment completed"
}

# Main deployment function
deploy() {
    local force_env="$1"
    
    log_info "Starting blue-green deployment for TestBro.ai"
    
    # Pre-deployment checks
    check_privileges
    
    if ! docker --version >/dev/null 2>&1; then
        log_error "Docker is not installed or not running"
        exit 1
    fi
    
    if ! docker-compose --version >/dev/null 2>&1; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Backup current deployment
    backup_current_deployment
    
    # Determine target environment
    local current_env
    current_env=$(get_active_environment)
    local target_env
    
    if [ -n "$force_env" ]; then
        target_env="$force_env"
    elif [ "$current_env" == "blue" ] || [ "$current_env" == "none" ]; then
        target_env="green"
    else
        target_env="blue"
    fi
    
    log_info "Current environment: $current_env, Target environment: $target_env"
    
    # Deploy to target environment
    if deploy_new_version "$target_env"; then
        # Switch traffic to new environment
        switch_traffic "$target_env"
        
        # Verify the switch worked
        sleep 10
        if health_check "$HEALTH_CHECK_URL"; then
            log_success "Traffic successfully switched to $target_env"
            
            # Cleanup old environment after successful deployment
            if [ "$current_env" != "none" ] && [ "$current_env" != "$target_env" ]; then
                cleanup_old_environment "$current_env"
            fi
            
            log_success "Blue-green deployment completed successfully!"
        else
            log_error "Health check failed after traffic switch. Rolling back..."
            rollback_deployment
            exit 1
        fi
    else
        log_error "Deployment to $target_env failed. Rolling back..."
        rollback_deployment
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy [blue|green]    Deploy to specific environment (auto-detects if not specified)"
    echo "  rollback              Rollback to previous deployment"
    echo "  status                Show current deployment status"
    echo "  health                Perform health check"
    echo "  switch [blue|green]   Switch traffic between environments"
    echo "  cleanup               Clean up old images and containers"
    echo "  help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy             # Auto-detect target environment and deploy"
    echo "  $0 deploy green       # Force deploy to green environment"
    echo "  $0 rollback           # Rollback current deployment"
    echo "  $0 status             # Show current environment status"
}

# Show deployment status
show_status() {
    local current_env
    current_env=$(get_active_environment)
    
    echo "Deployment Status:"
    echo "  Current Environment: $current_env"
    echo ""
    
    echo "Blue Environment:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    echo "Green Environment:"
    docker-compose -f "$BLUE_GREEN_COMPOSE" ps 2>/dev/null || echo "  Not running"
    echo ""
    
    echo "Health Status:"
    if health_check "$HEALTH_CHECK_URL" 5 1; then
        echo "  ✅ Application is healthy"
    else
        echo "  ❌ Application is unhealthy"
    fi
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy "$2"
        ;;
    "rollback")
        rollback_deployment
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check "$HEALTH_CHECK_URL"
        ;;
    "switch")
        if [ -z "$2" ]; then
            log_error "Please specify target environment (blue|green)"
            exit 1
        fi
        switch_traffic "$2"
        ;;
    "cleanup")
        docker system prune -f
        log_success "Cleanup completed"
        ;;
    "help"|*)
        usage
        ;;
esac