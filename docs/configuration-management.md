# Configuration Management Domain

The Configuration Management domain provides centralized configuration handling for the Task MCP Unified system, supporting multiple deployment scenarios and data store backends.

## Overview

The configuration system supports:

- Environment variable configuration for MCP server startup
- JSON/YAML configuration files for REST API and UI servers
- Default directory configuration with environment-specific fallbacks
- Multiple backing data store configurations
- Feature gating capabilities for future enhancements

## Configuration Sources

### Environment Variables (MCP Server)

The MCP server is configured primarily through environment variables:

```bash
# MCP Server Configuration
MCP_PORT=8080
MCP_HOST=localhost

# Data Store Configuration
DATA_STORE_TYPE=filesystem|database|memory
DATA_STORE_LOCATION=/custom/path
DATA_STORE_OPTIONS='{"maxConnections": 10}'

# Feature Flags
FEATURE_AGENT_PROMPT_TEMPLATES=true
FEATURE_DEPENDENCY_VALIDATION=true
FEATURE_CIRCULAR_DEPENDENCY_DETECTION=true

# Performance Configuration
TEMPLATE_RENDER_TIMEOUT=50
SEARCH_RESULT_LIMIT=100
DEPENDENCY_GRAPH_MAX_SIZE=10000

# Logging Configuration
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|text
```

### JSON/YAML Configuration Files (REST API & UI)

REST API and UI servers can be configured using JSON or YAML files:

#### JSON Configuration Example

```json
{
  "environment": "production",
  "version": "2.5.0",
  "rest": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": true,
    "middleware": {
      "compression": true,
      "helmet": true,
      "rateLimit": {
        "enabled": true,
        "windowMs": 60000,
        "maxRequests": 100
      }
    },
    "ssl": {
      "enabled": false,
      "keyPath": "./ssl/server.key",
      "certPath": "./ssl/server.crt"
    }
  },
  "ui": {
    "port": 3001,
    "host": "0.0.0.0",
    "publicPath": "/ui",
    "staticFiles": {
      "enabled": true,
      "path": "./public",
      "maxAge": 86400
    },
    "proxy": {
      "enabled": false,
      "target": "http://localhost:3000"
    }
  }
}
```

#### YAML Configuration Example

```yaml
environment: production
version: '2.5.0'

rest:
  port: 3000
  host: '0.0.0.0'
  cors: true
  middleware:
    compression: true
    helmet: true
    rateLimit:
      enabled: true
      windowMs: 60000
      maxRequests: 100
  ssl:
    enabled: false
    keyPath: './ssl/server.key'
    certPath: './ssl/server.crt'

ui:
  port: 3001
  host: '0.0.0.0'
  publicPath: '/ui'
  staticFiles:
    enabled: true
    path: './public'
    maxAge: 86400
  proxy:
    enabled: false
    target: 'http://localhost:3000'
```

## Configuration File Locations

The system searches for configuration files in the following order:

1. `CONFIG_FILE` environment variable (explicit path)
2. `./config/server.json`
3. `./config/server.yaml`
4. `./config/server.yml`
5. `./server.json`
6. `./server.yaml`
7. `./server.yml`

## Default Directories

The system uses environment-specific default directories:

- **Production**: `/tmp/tasks-server`
- **Test**: `/tmp/tasks-server-tests` (when `NODE_ENV=test` or `VITEST=true`)

These defaults can be overridden using the `DATA_STORE_LOCATION` environment variable.

## Data Store Configuration

### Supported Data Store Types

#### Filesystem Storage

```bash
DATA_STORE_TYPE=filesystem
DATA_STORE_LOCATION=/path/to/data
```

#### Database Storage

```bash
DATA_STORE_TYPE=database
DATA_STORE_LOCATION=postgresql://user:pass@host:port/db
```

#### Memory Storage

```bash
DATA_STORE_TYPE=memory
```

### Data Store Options

Additional options can be provided as JSON:

```bash
DATA_STORE_OPTIONS='{"maxConnections": 10, "timeout": 5000}'
```

## Feature Gating

Features can be enabled or disabled using environment variables:

```bash
# Enable/disable features (true/false or 1/0)
FEATURE_AGENT_PROMPT_TEMPLATES=true
FEATURE_DEPENDENCY_VALIDATION=true
FEATURE_CIRCULAR_DEPENDENCY_DETECTION=true
```

## Configuration Precedence

Configuration values are resolved in the following order (highest to lowest precedence):

1. Environment variables
2. Configuration files (JSON/YAML)
3. Default values

## Usage Examples

### Basic MCP Server Configuration

```bash
export MCP_PORT=8080
export DATA_STORE_LOCATION=/app/data
export FEATURE_AGENT_PROMPT_TEMPLATES=true
node dist/mcp.js
```

### REST API Server with Configuration File

Create `config/server.json`:

```json
{
  "rest": {
    "port": 4000,
    "host": "0.0.0.0",
    "cors": true
  }
}
```

Start server:

```bash
node dist/rest.js
```

### Custom Configuration File

```bash
export CONFIG_FILE=/path/to/custom-config.yaml
node dist/rest.js
```

## API Reference

### ConfigurationManager

Main configuration management class:

```typescript
import { ConfigurationManager } from './infrastructure/config/system-configuration.js';

const configManager = new ConfigurationManager();

// Get complete configuration
const config = configManager.getConfiguration();

// Get specific configuration sections
const dataStoreConfig = configManager.getDataStoreConfig();
const serverConfig = configManager.getServerConfig();
const featuresConfig = configManager.getFeaturesConfig();
const performanceConfig = configManager.getPerformanceConfig();
```

### FileConfigLoader

File-based configuration loader:

```typescript
import { FileConfigLoader } from './infrastructure/config/file-config-loader.js';

// Load configuration from file
const config = FileConfigLoader.loadConfig({
  configPath: './config/server.json',
  fallbackPaths: ['./server.yaml'],
  required: false,
});

// Validate configuration
const validatedConfig = FileConfigLoader.validateConfig(config);

// Merge with defaults
const mergedConfig = FileConfigLoader.mergeWithDefaults(config, defaults);
```

## Error Handling

The configuration system provides detailed error messages for common issues:

- Invalid JSON/YAML syntax
- Missing required configuration files
- Invalid port numbers or host values
- Invalid environment variable values
- Unsupported configuration file formats

## Testing

The configuration system includes comprehensive unit tests covering:

- Environment variable reading
- JSON/YAML file loading
- Default fallbacks
- Feature gating
- Error handling
- Configuration precedence
- Integration scenarios

Run configuration tests:

```bash
npm test -- tests/unit/infrastructure/config/ --run
```

## Migration Guide

### From Environment-Only Configuration

If you're currently using only environment variables, you can gradually migrate to file-based configuration:

1. Create a configuration file with your current settings
2. Remove environment variables one by one
3. Test that the file configuration is working correctly

### Adding New Configuration Options

1. Add the option to the appropriate interface (`SystemConfiguration`, `RestApiConfig`, or `UiConfig`)
2. Update the loading logic in `ConfigurationManager`
3. Add validation if needed
4. Update documentation and examples
5. Add unit tests for the new option

## Best Practices

1. **Use environment variables for secrets and deployment-specific values**
2. **Use configuration files for complex, structured configuration**
3. **Provide sensible defaults for all configuration options**
4. **Validate configuration values at startup**
5. **Document all configuration options with examples**
6. **Use feature flags for experimental or optional features**
7. **Test configuration loading in different environments**
