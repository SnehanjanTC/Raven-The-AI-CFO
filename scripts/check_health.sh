#!/bin/bash

###############################################################################
# Raven Backend Health Check Script
#
# Usage: ./check_health.sh [BACKEND_URL] [TIMEOUT]
# Example: ./check_health.sh https://api.raven.com 5
#
# This script can be used with:
# - Cron for periodic monitoring: 0 */5 * * * /path/to/check_health.sh
# - External uptime monitoring services: UptimeRobot, StatusCake, etc.
###############################################################################

set -euo pipefail

# Configuration
BACKEND_URL="${1:-http://localhost:8000}"
TIMEOUT="${2:-5}"
HEALTH_ENDPOINT="/api/v1/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        INFO)
            echo -e "${GREEN}[INFO]${NC} [$timestamp] $message"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} [$timestamp] $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} [$timestamp] $message" >&2
            ;;
    esac
}

# Main health check
health_check() {
    local url="${BACKEND_URL}${HEALTH_ENDPOINT}"

    log INFO "Checking health: $url"

    # Perform the health check
    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "CONNECTION_ERROR")

    # Parse response
    if [ "$response" = "CONNECTION_ERROR" ]; then
        log ERROR "Failed to connect to backend at $BACKEND_URL"
        return 1
    fi

    # Extract HTTP code and body
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # Check HTTP status
    if [ "$http_code" != "200" ]; then
        log ERROR "Received HTTP $http_code from health endpoint"
        log ERROR "Response: $body"
        return 1
    fi

    # Validate JSON response contains 'status': 'healthy'
    if echo "$body" | grep -q '"status":\s*"healthy"'; then
        log INFO "Health check passed: Backend is healthy"

        # Optional: Extract and log additional status info
        if echo "$body" | grep -q '"version"'; then
            version=$(echo "$body" | grep -o '"version":\s*"[^"]*"' | cut -d'"' -f4)
            log INFO "Backend version: $version"
        fi

        return 0
    else
        log WARN "Backend returned 200 but status is not 'healthy'"
        log WARN "Response: $body"
        return 1
    fi
}

# Entrypoint
main() {
    log INFO "Raven Backend Health Check"
    log INFO "Backend URL: $BACKEND_URL"
    log INFO "Timeout: ${TIMEOUT}s"

    if health_check; then
        exit 0
    else
        exit 1
    fi
}

# Run main
main "$@"
