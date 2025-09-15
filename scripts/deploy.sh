#!/bin/bash

# MCP Task Manager Deployment Script
# This script handles deployment of the enhanced task management features

set -e  # Exit on any error

# Configuration
VERSION=${1:-"2.0.0"}
ENVIRONMENT=${2:-"production"}
DATA_BACKUP_DIR=${3:-"./backups"}
LOG_FILE="./logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log "Starting MCP Task Manager deployment v$VERSION to $ENVIRONMENT"

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
fi

NODE_VERSION=$(node --version)
log "Node.js version: $NODE_VERSION"

# Check npm version
if ! command -v npm &> /dev/null; then
    error "npm is not installed"
fi

NPM_VERSION=$(npm --version)
log "npm version: $NPM_VERSION"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    error "package.json not found. Are you in the correct directory?"
fi

# Verify current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log "Current package version: $CURRENT_VERSION"

# Create backup directory
log "Creating backup directory..."
mkdir -p "$DATA_BACKUP_DIR"

# Backup existing data
log "Backing up existing data..."
if [ -d "./data" ]; then
    BACKUP_NAME="data-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "./data" "$DATA_BACKUP_DIR/$BACKUP_NAME"
    success "Data backed up to $DATA_BACKUP_DIR/$BACKUP_NAME"
else
    warning "No existing data directory found"
fi

# Install dependencies
log "Installing dependencies..."
npm ci --production
success "Dependencies installed"

# Build the project
log "Building project..."
npm run build
success "Project built successfully"

# Run tests (if not in production)
if [ "$ENVIRONMENT" != "production" ]; then
    log "Running tests..."
    npm run test:run
    success "Tests passed"
else
    log "Skipping tests in production environment"
fi

# Set environment variables for deployment
export NODE_ENV="$ENVIRONMENT"

log "Environment variables set for deployment"

# Run data migration if needed
log "Checking for data migration requirements..."
if [ -f "./dist/scripts/migrate-data.js" ]; then
    log "Running data migration..."
    node ./dist/scripts/migrate-data.js
    success "Data migration completed"
else
    log "No migration script found, skipping data migration"
fi

# Validate deployment
log "Validating deployment..."

# Check if the server can start
timeout 30s node ./dist/index.js --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    success "Server validation passed"
else
    error "Server validation failed"
fi

# Update version in package.json if specified
if [ "$VERSION" != "$CURRENT_VERSION" ]; then
    log "Updating version from $CURRENT_VERSION to $VERSION"
    npm version "$VERSION" --no-git-tag-version
    success "Version updated"
fi

# Create deployment manifest
MANIFEST_FILE="./deployment-manifest-$(date +%Y%m%d-%H%M%S).json"
cat > "$MANIFEST_FILE" << EOF
{
  "deploymentId": "$(uuidgen 2>/dev/null || echo "deploy-$(date +%s)")",
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "nodeVersion": "$NODE_VERSION",
  "npmVersion": "$NPM_VERSION",
  "features": {
    "enhancedFeatures": true,
    "actionPlans": true,
    "implementationNotes": true,
    "prettyPrint": true,
    "cleanupSuggestions": true,
    "projectOrganization": true
  },
  "backupLocation": "$DATA_BACKUP_DIR",
  "logFile": "$LOG_FILE"
}
EOF

success "Deployment manifest created: $MANIFEST_FILE"

# Post-deployment tasks
log "Running post-deployment tasks..."

# Set appropriate permissions
chmod +x ./dist/cli.js
log "Executable permissions set"

# Create systemd service file (if on Linux)
if command -v systemctl &> /dev/null && [ "$ENVIRONMENT" = "production" ]; then
    log "Creating systemd service file..."
    
    SERVICE_FILE="/tmp/mcp-task-manager.service"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=MCP Task Manager Server
After=network.target

[Service]
Type=simple
User=\${USER}
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    log "Systemd service file created at $SERVICE_FILE"
    log "To install: sudo cp $SERVICE_FILE /etc/systemd/system/ && sudo systemctl enable mcp-task-manager"
fi

# Health check
log "Performing health check..."
if timeout 10s node -e "
const { McpTaskManagerServer } = require('./dist/index.js');
const server = new McpTaskManagerServer();
console.log('Health check passed');
process.exit(0);
" > /dev/null 2>&1; then
    success "Health check passed"
else
    warning "Health check failed - server may need manual verification"
fi

# Deployment summary
log "Deployment Summary:"
log "=================="
log "Version: $VERSION"
log "Environment: $ENVIRONMENT"
log "Timestamp: $(date)"
log "Features Enabled: Enhanced Task Management v2"
log "Backup Location: $DATA_BACKUP_DIR"
log "Log File: $LOG_FILE"
log "Manifest: $MANIFEST_FILE"

success "Deployment completed successfully!"

# Instructions for starting the server
log ""
log "To start the server:"
log "==================="
log "Development: npm start"
log "Production: node dist/index.js"
log "With systemd: sudo systemctl start mcp-task-manager"
log ""
log "To verify deployment:"
log "===================="
log "node dist/cli.js --version"
log "node dist/cli.js --help"

exit 0