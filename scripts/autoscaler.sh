#!/bin/bash

# Auto-scaling Script for TestBro.ai Docker Compose Environment
# Monitors resource usage and automatically scales services

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/var/log/testbro-autoscaler.log"
PID_FILE="/var/run/testbro-autoscaler.pid"

# Default configuration
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROJECT="testbro"
CHECK_INTERVAL=60
MIN_REPLICAS=2
MAX_REPLICAS=10
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80
SCALE_UP_COOLDOWN=300    # 5 minutes
SCALE_DOWN_COOLDOWN=600  # 10 minutes
SCALE_FACTOR=2

# Service configuration
declare -A SERVICE_CONFIG
SERVICE_CONFIG[testbro-backend]="min:2,max:10,cpu:70,memory:80"
SERVICE_CONFIG[testbro-frontend]="min:2,max:5,cpu:60,memory:70"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$*"
}

log_warn() {
    log "WARN" "$*"
}

log_error() {
    log "ERROR" "$*"
}

# Check if script is already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_error "Auto-scaler is already running with PID $pid"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi
}

# Create PID file
create_pid_file() {
    echo $$ > "$PID_FILE"
    trap cleanup EXIT
}

# Cleanup function
cleanup() {
    log_info "Auto-scaler shutting down..."
    rm -f "$PID_FILE"
    exit 0
}

# Parse service configuration
parse_service_config() {
    local service="$1"
    local config="${SERVICE_CONFIG[$service]:-}"
    
    if [[ -z "$config" ]]; then
        echo "min:$MIN_REPLICAS,max:$MAX_REPLICAS,cpu:$CPU_THRESHOLD,memory:$MEMORY_THRESHOLD"
        return
    fi
    
    echo "$config"
}

# Get current replica count for a service
get_replica_count() {
    local service="$1"
    docker-compose -f "$COMPOSE_FILE" ps -q "$service" | wc -l
}

# Get service metrics
get_service_metrics() {
    local service="$1"
    local container_ids
    container_ids=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service")
    
    if [[ -z "$container_ids" ]]; then
        echo "0,0"
        return
    fi
    
    local total_cpu=0
    local total_memory=0
    local container_count=0
    
    for container_id in $container_ids; do
        if [[ -n "$container_id" ]]; then
            local stats
            stats=$(docker stats --no-stream --format "{{.CPUPerc}},{{.MemPerc}}" "$container_id" 2>/dev/null | head -1)
            
            if [[ -n "$stats" ]]; then
                local cpu_perc=$(echo "$stats" | cut -d',' -f1 | sed 's/%//')
                local mem_perc=$(echo "$stats" | cut -d',' -f2 | sed 's/%//')
                
                # Handle empty or invalid values
                if [[ "$cpu_perc" =~ ^[0-9]+\.?[0-9]*$ ]]; then
                    total_cpu=$(echo "$total_cpu + $cpu_perc" | bc -l)
                fi
                
                if [[ "$mem_perc" =~ ^[0-9]+\.?[0-9]*$ ]]; then
                    total_memory=$(echo "$total_memory + $mem_perc" | bc -l)
                fi
                
                container_count=$((container_count + 1))
            fi
        fi
    done
    
    if [[ $container_count -eq 0 ]]; then
        echo "0,0"
        return
    fi
    
    local avg_cpu=$(echo "scale=2; $total_cpu / $container_count" | bc -l)
    local avg_memory=$(echo "scale=2; $total_memory / $container_count" | bc -l)
    
    echo "$avg_cpu,$avg_memory"
}

# Check if service is healthy
is_service_healthy() {
    local service="$1"
    local health_endpoint=""
    
    case "$service" in
        "testbro-backend")
            health_endpoint="http://localhost:3001/health"
            ;;
        "testbro-frontend")
            health_endpoint="http://localhost:3000/"
            ;;
        *)
            return 0  # Assume healthy if no specific check
            ;;
    esac
    
    if [[ -n "$health_endpoint" ]]; then
        curl -f -s --max-time 5 "$health_endpoint" >/dev/null 2>&1
    else
        return 0
    fi
}

# Scale service up
scale_up() {
    local service="$1"
    local current_replicas="$2"
    local max_replicas="$3"
    
    if [[ $current_replicas -ge $max_replicas ]]; then
        log_warn "Service $service already at maximum replicas ($max_replicas)"
        return 1
    fi
    
    local new_replicas=$((current_replicas + 1))
    if [[ $new_replicas -gt $max_replicas ]]; then
        new_replicas=$max_replicas
    fi
    
    log_info "Scaling up $service from $current_replicas to $new_replicas replicas"
    
    if docker-compose -f "$COMPOSE_FILE" up -d --scale "$service=$new_replicas" "$service"; then
        log_info "Successfully scaled up $service to $new_replicas replicas"
        
        # Wait for new instances to be healthy
        sleep 30
        if is_service_healthy "$service"; then
            log_info "Service $service is healthy after scaling up"
            echo "$new_replicas" > "/tmp/testbro-autoscaler-${service}-last-scale"
            echo "$(date +%s)" > "/tmp/testbro-autoscaler-${service}-last-scale-time"
            return 0
        else
            log_warn "Service $service appears unhealthy after scaling up"
            return 1
        fi
    else
        log_error "Failed to scale up $service"
        return 1
    fi
}

# Scale service down
scale_down() {
    local service="$1"
    local current_replicas="$2"
    local min_replicas="$3"
    
    if [[ $current_replicas -le $min_replicas ]]; then
        log_warn "Service $service already at minimum replicas ($min_replicas)"
        return 1
    fi
    
    local new_replicas=$((current_replicas - 1))
    if [[ $new_replicas -lt $min_replicas ]]; then
        new_replicas=$min_replicas
    fi
    
    log_info "Scaling down $service from $current_replicas to $new_replicas replicas"
    
    if docker-compose -f "$COMPOSE_FILE" up -d --scale "$service=$new_replicas" "$service"; then
        log_info "Successfully scaled down $service to $new_replicas replicas"
        echo "$new_replicas" > "/tmp/testbro-autoscaler-${service}-last-scale"
        echo "$(date +%s)" > "/tmp/testbro-autoscaler-${service}-last-scale-time"
        return 0
    else
        log_error "Failed to scale down $service"
        return 1
    fi
}

# Check if cooldown period has passed
check_cooldown() {
    local service="$1"
    local action="$2"  # "up" or "down"
    local cooldown_file="/tmp/testbro-autoscaler-${service}-last-scale-time"
    
    if [[ ! -f "$cooldown_file" ]]; then
        return 0  # No previous scaling, cooldown passed
    fi
    
    local last_scale_time=$(cat "$cooldown_file")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_scale_time))
    
    local cooldown_period
    if [[ "$action" == "up" ]]; then
        cooldown_period=$SCALE_UP_COOLDOWN
    else
        cooldown_period=$SCALE_DOWN_COOLDOWN
    fi
    
    if [[ $time_diff -ge $cooldown_period ]]; then
        return 0  # Cooldown passed
    else
        local remaining=$((cooldown_period - time_diff))
        log_info "Service $service scaling $action cooldown active. $remaining seconds remaining."
        return 1  # Cooldown active
    fi
}

# Make scaling decision for a service
make_scaling_decision() {
    local service="$1"
    
    # Parse service configuration
    local config
    config=$(parse_service_config "$service")
    local min_replicas=$(echo "$config" | grep -o 'min:[0-9]*' | cut -d':' -f2)
    local max_replicas=$(echo "$config" | grep -o 'max:[0-9]*' | cut -d':' -f2)
    local cpu_threshold=$(echo "$config" | grep -o 'cpu:[0-9]*' | cut -d':' -f2)
    local memory_threshold=$(echo "$config" | grep -o 'memory:[0-9]*' | cut -d':' -f2)
    
    # Get current metrics
    local current_replicas
    current_replicas=$(get_replica_count "$service")
    
    if [[ $current_replicas -eq 0 ]]; then
        log_warn "Service $service has no running containers"
        return
    fi
    
    local metrics
    metrics=$(get_service_metrics "$service")
    local cpu_usage=$(echo "$metrics" | cut -d',' -f1)
    local memory_usage=$(echo "$metrics" | cut -d',' -f2)
    
    # Convert to integers for comparison
    cpu_usage=${cpu_usage%.*}
    memory_usage=${memory_usage%.*}
    
    log_info "Service $service: replicas=$current_replicas, CPU=${cpu_usage}%, Memory=${memory_usage}%"
    
    # Make scaling decision
    if [[ $cpu_usage -gt $cpu_threshold ]] || [[ $memory_usage -gt $memory_threshold ]]; then
        if [[ $current_replicas -lt $max_replicas ]] && check_cooldown "$service" "up"; then
            scale_up "$service" "$current_replicas" "$max_replicas"
        fi
    elif [[ $cpu_usage -lt $((cpu_threshold - 20)) ]] && [[ $memory_usage -lt $((memory_threshold - 20)) ]]; then
        if [[ $current_replicas -gt $min_replicas ]] && check_cooldown "$service" "down"; then
            scale_down "$service" "$current_replicas" "$min_replicas"
        fi
    fi
}

# Send alert notification
send_alert() {
    local message="$1"
    local severity="${2:-info}"
    
    log_info "ALERT [$severity]: $message"
    
    # Send to Slack if webhook is configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        case "$severity" in
            "error"|"critical") color="danger" ;;
            "warn"|"warning") color="warning" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔧 TestBro Auto-scaler Alert\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# Monitor and scale services
monitor_and_scale() {
    log_info "Starting auto-scaling monitoring (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        # Check if Docker and Docker Compose are available
        if ! docker version >/dev/null 2>&1; then
            log_error "Docker is not available"
            send_alert "Auto-scaler error: Docker is not available" "error"
            sleep "$CHECK_INTERVAL"
            continue
        fi
        
        if ! docker-compose version >/dev/null 2>&1; then
            log_error "Docker Compose is not available"
            send_alert "Auto-scaler error: Docker Compose is not available" "error"
            sleep "$CHECK_INTERVAL"
            continue
        fi
        
        # Monitor each configured service
        for service in "${!SERVICE_CONFIG[@]}"; do
            if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
                make_scaling_decision "$service"
            else
                log_warn "Service $service is not running"
            fi
        done
        
        sleep "$CHECK_INTERVAL"
    done
}

# Show current status
show_status() {
    echo "TestBro Auto-scaler Status"
    echo "=========================="
    echo "Check Interval: ${CHECK_INTERVAL}s"
    echo "Scale Up Cooldown: ${SCALE_UP_COOLDOWN}s"
    echo "Scale Down Cooldown: ${SCALE_DOWN_COOLDOWN}s"
    echo ""
    
    for service in "${!SERVICE_CONFIG[@]}"; do
        local config
        config=$(parse_service_config "$service")
        local min_replicas=$(echo "$config" | grep -o 'min:[0-9]*' | cut -d':' -f2)
        local max_replicas=$(echo "$config" | grep -o 'max:[0-9]*' | cut -d':' -f2)
        local cpu_threshold=$(echo "$config" | grep -o 'cpu:[0-9]*' | cut -d':' -f2)
        local memory_threshold=$(echo "$config" | grep -o 'memory:[0-9]*' | cut -d':' -f2)
        
        local current_replicas
        current_replicas=$(get_replica_count "$service")
        
        local metrics
        metrics=$(get_service_metrics "$service")
        local cpu_usage=$(echo "$metrics" | cut -d',' -f1)
        local memory_usage=$(echo "$metrics" | cut -d',' -f2)
        
        echo "Service: $service"
        echo "  Current Replicas: $current_replicas (min: $min_replicas, max: $max_replicas)"
        echo "  Current Usage: CPU ${cpu_usage}%, Memory ${memory_usage}%"
        echo "  Thresholds: CPU ${cpu_threshold}%, Memory ${memory_threshold}%"
        echo ""
    done
}

# Usage information
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start          Start the auto-scaler daemon"
    echo "  stop           Stop the auto-scaler daemon"
    echo "  status         Show current auto-scaler status"
    echo "  test           Test scaling for a specific service"
    echo "  help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  CHECK_INTERVAL          Monitoring interval in seconds (default: 60)"
    echo "  MIN_REPLICAS           Minimum replicas per service (default: 2)"
    echo "  MAX_REPLICAS           Maximum replicas per service (default: 10)"
    echo "  CPU_THRESHOLD          CPU threshold percentage (default: 70)"
    echo "  MEMORY_THRESHOLD       Memory threshold percentage (default: 80)"
    echo "  SCALE_UP_COOLDOWN      Scale up cooldown in seconds (default: 300)"
    echo "  SCALE_DOWN_COOLDOWN    Scale down cooldown in seconds (default: 600)"
    echo "  SLACK_WEBHOOK_URL      Slack webhook for alerts"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start auto-scaler"
    echo "  $0 stop                     # Stop auto-scaler"
    echo "  $0 status                   # Show status"
    echo "  CHECK_INTERVAL=30 $0 start  # Start with 30s interval"
}

# Stop the auto-scaler
stop_autoscaler() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping auto-scaler (PID: $pid)"
            kill "$pid"
            rm -f "$PID_FILE"
            log_info "Auto-scaler stopped"
        else
            log_warn "Auto-scaler is not running"
            rm -f "$PID_FILE"
        fi
    else
        log_warn "Auto-scaler is not running"
    fi
}

# Test scaling for a service
test_scaling() {
    local service="${1:-testbro-backend}"
    echo "Testing scaling for service: $service"
    make_scaling_decision "$service"
}

# Main script logic
case "${1:-help}" in
    "start")
        check_running
        create_pid_file
        log_info "Starting TestBro Auto-scaler (PID: $$)"
        send_alert "Auto-scaler started" "info"
        monitor_and_scale
        ;;
    "stop")
        stop_autoscaler
        ;;
    "status")
        show_status
        ;;
    "test")
        test_scaling "$2"
        ;;
    "help"|*)
        usage
        ;;
esac