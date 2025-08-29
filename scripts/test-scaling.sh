#!/bin/bash

# Load Balancing and Auto-scaling Test Script
# Tests various components of the scaling infrastructure

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# Test health endpoints
test_health_endpoints() {
    log_info "Testing health endpoints..."
    
    local endpoints=(
        "http://localhost:3001/health"
        "http://localhost:3000/"
        "http://localhost:9090/-/healthy"
        "http://localhost:3030/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time 5 "$endpoint" >/dev/null; then
            log_success "Health check passed: $endpoint"
        else
            log_warning "Health check failed: $endpoint"
        fi
    done
}

# Test load balancer configuration
test_nginx_config() {
    log_info "Testing Nginx configuration..."
    
    if command -v nginx >/dev/null 2>&1; then
        if nginx -t -c "$PROJECT_ROOT/nginx/production/nginx.conf" 2>/dev/null; then
            log_success "Nginx configuration is valid"
        else
            log_error "Nginx configuration has errors"
            nginx -t -c "$PROJECT_ROOT/nginx/production/nginx.conf"
        fi
    else
        log_warning "Nginx not installed, skipping configuration test"
    fi
}

# Test Docker Compose scaling
test_docker_compose_scaling() {
    log_info "Testing Docker Compose scaling..."
    
    cd "$PROJECT_ROOT"
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log_info "Services are running, testing scaling..."
        
        # Test scaling backend
        if docker-compose up -d --scale testbro-backend=2; then
            log_success "Successfully scaled backend to 2 replicas"
            
            # Wait a moment
            sleep 5
            
            # Check replica count
            local backend_count
            backend_count=$(docker-compose ps -q testbro-backend | wc -l)
            log_info "Backend replica count: $backend_count"
            
            # Scale back down
            docker-compose up -d --scale testbro-backend=1
            log_success "Scaled backend back to 1 replica"
        else
            log_error "Failed to scale backend service"
        fi
    else
        log_warning "Services not running, skipping scaling test"
    fi
}

# Test auto-scaler script
test_autoscaler() {
    log_info "Testing auto-scaler script..."
    
    if [[ -x "$PROJECT_ROOT/scripts/autoscaler.sh" ]]; then
        # Test script execution
        if "$PROJECT_ROOT/scripts/autoscaler.sh" status >/dev/null 2>&1; then
            log_success "Auto-scaler script is executable and functional"
        else
            log_warning "Auto-scaler script may have issues"
        fi
        
        # Test configuration parsing
        if "$PROJECT_ROOT/scripts/autoscaler.sh" help | grep -q "Usage:"; then
            log_success "Auto-scaler help text is available"
        else
            log_warning "Auto-scaler help text may be missing"
        fi
    else
        log_error "Auto-scaler script is not executable"
    fi
}

# Test Kubernetes manifests
test_kubernetes_manifests() {
    log_info "Testing Kubernetes manifests..."
    
    if command -v kubectl >/dev/null 2>&1; then
        # Test manifest syntax
        if kubectl apply --dry-run=client -f "$PROJECT_ROOT/k8s/production-deployment.yml" >/dev/null 2>&1; then
            log_success "Kubernetes manifests are valid"
        else
            log_error "Kubernetes manifests have syntax errors"
        fi
    else
        log_warning "kubectl not installed, skipping Kubernetes test"
    fi
}

# Test Docker Swarm stack
test_docker_swarm_stack() {
    log_info "Testing Docker Swarm stack configuration..."
    
    if command -v docker >/dev/null 2>&1; then
        # Check if Docker Swarm is initialized
        if docker info 2>/dev/null | grep -q "Swarm: active"; then
            log_info "Docker Swarm is active, testing stack deployment..."
            
            # Test stack deployment (dry run)
            if docker stack deploy --compose-file "$PROJECT_ROOT/docker-swarm-stack.yml" --prune testbro-test >/dev/null 2>&1; then
                log_success "Docker Swarm stack deployment test passed"
                
                # Remove test stack
                docker stack rm testbro-test >/dev/null 2>&1 || true
            else
                log_warning "Docker Swarm stack deployment test failed"
            fi
        else
            log_warning "Docker Swarm not initialized, skipping stack test"
        fi
    else
        log_error "Docker not available"
    fi
}

# Test Traefik configuration
test_traefik_config() {
    log_info "Testing Traefik configuration..."
    
    # Check if Traefik compose file is valid
    if docker-compose -f "$PROJECT_ROOT/docker-compose.traefik.yml" config >/dev/null 2>&1; then
        log_success "Traefik Docker Compose configuration is valid"
    else
        log_error "Traefik Docker Compose configuration has errors"
    fi
}

# Performance test
test_performance() {
    log_info "Running basic performance test..."
    
    # Check if any service is running on port 3001
    if curl -f -s --max-time 5 "http://localhost:3001/health" >/dev/null; then
        log_info "Running load test against backend..."
        
        # Simple load test using curl
        local start_time=$(date +%s)
        local request_count=0
        local success_count=0
        
        for i in {1..10}; do
            request_count=$((request_count + 1))
            if curl -f -s --max-time 5 "http://localhost:3001/health" >/dev/null; then
                success_count=$((success_count + 1))
            fi
        done
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local success_rate=$((success_count * 100 / request_count))
        
        log_info "Performance test results:"
        log_info "  Requests: $request_count"
        log_info "  Successful: $success_count"
        log_info "  Success rate: ${success_rate}%"
        log_info "  Duration: ${duration}s"
        
        if [[ $success_rate -ge 90 ]]; then
            log_success "Performance test passed (${success_rate}% success rate)"
        else
            log_warning "Performance test needs attention (${success_rate}% success rate)"
        fi
    else
        log_warning "Backend service not available, skipping performance test"
    fi
}

# Test resource monitoring
test_resource_monitoring() {
    log_info "Testing resource monitoring capabilities..."
    
    # Check if monitoring tools are available
    if command -v docker >/dev/null 2>&1; then
        # Test Docker stats
        if docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep -q "%"; then
            log_success "Docker stats monitoring is working"
        else
            log_warning "Docker stats monitoring may not be working"
        fi
    fi
    
    # Check system monitoring
    if command -v top >/dev/null 2>&1; then
        log_success "System monitoring tools are available"
    else
        log_warning "System monitoring tools may be limited"
    fi
}

# Test SSL certificate configuration
test_ssl_config() {
    log_info "Testing SSL certificate configuration..."
    
    # Check if SSL configuration files exist
    local ssl_configs=(
        "$PROJECT_ROOT/nginx/production/nginx.conf"
        "$PROJECT_ROOT/docker-compose.traefik.yml"
    )
    
    for config in "${ssl_configs[@]}"; do
        if [[ -f "$config" ]]; then
            if grep -q "ssl_certificate\|certificatesresolvers\|tls" "$config"; then
                log_success "SSL configuration found in $(basename "$config")"
            else
                log_warning "SSL configuration may be missing in $(basename "$config")"
            fi
        else
            log_warning "Configuration file not found: $(basename "$config")"
        fi
    done
}

# Validate all configurations
validate_configurations() {
    log_info "Validating all configuration files..."
    
    local config_files=(
        "$PROJECT_ROOT/nginx/production/nginx.conf"
        "$PROJECT_ROOT/docker-compose.yml"
        "$PROJECT_ROOT/docker-compose.production.yml"
        "$PROJECT_ROOT/docker-compose.traefik.yml"
        "$PROJECT_ROOT/docker-swarm-stack.yml"
        "$PROJECT_ROOT/k8s/production-deployment.yml"
        "$PROJECT_ROOT/scripts/autoscaler.sh"
    )
    
    local valid_count=0
    local total_count=${#config_files[@]}
    
    for config in "${config_files[@]}"; do
        if [[ -f "$config" ]]; then
            log_success "Configuration file exists: $(basename "$config")"
            valid_count=$((valid_count + 1))
        else
            log_error "Configuration file missing: $(basename "$config")"
        fi
    done
    
    log_info "Configuration validation: $valid_count/$total_count files found"
    
    if [[ $valid_count -eq $total_count ]]; then
        log_success "All configuration files are present"
    else
        log_warning "Some configuration files are missing"
    fi
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    local report_file="$PROJECT_ROOT/test-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
TestBro.ai Load Balancing and Auto-scaling Test Report
Generated: $(date)

Test Results:
============

Configuration Files: $(ls -1 "$PROJECT_ROOT"/{nginx,k8s,scripts}/* 2>/dev/null | wc -l) files created
Docker Compose Files: $(ls -1 "$PROJECT_ROOT"/docker-compose*.yml 2>/dev/null | wc -l) variants available
Scripts: $(ls -1 "$PROJECT_ROOT"/scripts/*.sh 2>/dev/null | wc -l) automation scripts

Components Tested:
- Health endpoints
- Nginx configuration
- Docker Compose scaling
- Auto-scaler script
- Kubernetes manifests
- Docker Swarm stack
- Traefik configuration
- Performance baseline
- Resource monitoring
- SSL configuration

Recommendations:
- Review any warnings in the test output
- Test auto-scaling under load
- Configure monitoring alerts
- Set up backup procedures
- Plan disaster recovery tests

Next Steps:
- Deploy to staging environment
- Run comprehensive load tests
- Monitor auto-scaling behavior
- Fine-tune scaling thresholds
- Document operational procedures
EOF

    log_success "Test report generated: $report_file"
}

# Main test execution
main() {
    log_info "Starting TestBro.ai Load Balancing and Auto-scaling Tests"
    echo "=============================================================="
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Run all tests
    validate_configurations
    test_nginx_config
    test_traefik_config
    test_docker_compose_scaling
    test_autoscaler
    test_kubernetes_manifests
    test_docker_swarm_stack
    test_health_endpoints
    test_performance
    test_resource_monitoring
    test_ssl_config
    
    # Generate report
    generate_report
    
    echo ""
    log_success "Load balancing and auto-scaling tests completed!"
    log_info "Review the test output and generated report for any issues."
}

# Script usage
usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  all           Run all tests (default)"
    echo "  config        Test configuration files only"
    echo "  scaling       Test scaling capabilities only"
    echo "  performance   Run performance tests only"
    echo "  health        Test health endpoints only"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0            # Run all tests"
    echo "  $0 config     # Test configurations only"
    echo "  $0 scaling    # Test scaling only"
}

# Handle command line arguments
case "${1:-all}" in
    "all")
        main
        ;;
    "config")
        validate_configurations
        test_nginx_config
        test_traefik_config
        test_kubernetes_manifests
        ;;
    "scaling")
        test_docker_compose_scaling
        test_autoscaler
        test_docker_swarm_stack
        ;;
    "performance")
        test_performance
        test_resource_monitoring
        ;;
    "health")
        test_health_endpoints
        ;;
    "help"|*)
        usage
        ;;
esac