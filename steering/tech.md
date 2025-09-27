# Technology Stack

## Core Technologies

- **Runtime**: Node.js 18.0.0+ (ESM modules)
- **Language**: TypeScript 5.3.3+ with strict mode enabled
- **Protocol**: Model Context Protocol (MCP) SDK 1.0.0+
- **Build System**: TypeScript compiler with Terser minification
- **Testing**: Vitest with Node.js environment
- **Package Manager**: npm with package-lock.json

## Key Dependencies

### Production Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `uuid` - Unique identifier generation
- `winston` - Structured logging
- `zod` - Runtime type validation and schema definition

### Development Dependencies
- `@types/node` - Node.js type definitions
- `@types/uuid` - UUID type definitions
- `terser` - JavaScript minification
- `vitest` - Testing framework with UI support

## Build System

### Common Commands

```bash
# Development build (faster, includes source maps)
npm run build:dev

# Production build (optimized, minified)
npm run build:prod
npm run build  # alias for build:prod

# Start the server
npm start

# Development workflow
npm run dev  # build:dev + start

# Testing
npm test        # watch mode
npm run test:run # single run

# Linting and validation
npm run lint     # TypeScript type checking
npm run validate # full project validation

# Cleanup
npm run clean       # basic cleanup
npm run clean:deep  # remove node_modules
npm run clean:build # remove dist/
```

### Build Process

1. **TypeScript compilation** - Strict mode with comprehensive type checking
2. **Minification** - Terser optimization for production builds
3. **Executable permissions** - CLI script made executable
4. **Source maps** - Generated for debugging (dev builds)
5. **Declaration files** - TypeScript definitions generated

## Architecture Patterns

### TypeScript Configuration
- **Strict mode enabled** - No `any` types allowed
- **ESM modules** - Modern JavaScript module system
- **Incremental compilation** - Faster rebuilds
- **Exact optional properties** - Strict object typing
- **No unchecked indexed access** - Safe array/object access

### Code Quality Standards
- **Zero TypeScript errors** - Strict compilation requirements
- **No implicit any** - All types must be explicit
- **Unused code detection** - Automatic detection of unused variables/parameters
- **Consistent casing** - Enforced file name casing
- **Source maps** - Full debugging support

### Performance Optimizations
- **Terser minification** - Compressed production builds
- **Tree shaking** - Unused code elimination
- **Incremental builds** - Faster development cycles
- **Skip lib check** - Faster compilation for dependencies