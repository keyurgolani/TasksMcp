#!/bin/bash

# Final validation script for dependency management features
echo "🚀 Final Dependency Management Validation"
echo "========================================"

# Check TypeScript compilation
echo "1. Checking TypeScript compilation..."
if npm run lint > /dev/null 2>&1; then
    echo "✅ TypeScript compilation: PASSED"
else
    echo "❌ TypeScript compilation: FAILED"
    exit 1
fi

# Check core performance tests
echo "2. Running core performance tests..."
if npm test -- tests/performance/dependency-management-performance.test.ts --run -t "Core Dependency Tools Performance" > /dev/null 2>&1; then
    echo "✅ Core performance tests: PASSED"
else
    echo "❌ Core performance tests: FAILED"
    exit 1
fi

# Check integration tests
echo "3. Running integration tests..."
if npm test -- tests/integration/dependency-end-to-end.test.ts --run -t "Complete Project Workflow" > /dev/null 2>&1; then
    echo "✅ Integration tests: PASSED"
else
    echo "❌ Integration tests: FAILED"
    exit 1
fi

# Check production readiness
echo "4. Checking production readiness..."
if npm test -- tests/integration/dependency-production-readiness.test.ts --run -t "Production Deployment Readiness" > /dev/null 2>&1; then
    echo "✅ Production readiness: PASSED"
else
    echo "❌ Production readiness: FAILED"
    exit 1
fi

# Check tool registration
echo "5. Validating tool registration..."
if grep -q "set_task_dependencies" src/api/tools/definitions.ts && \
   grep -q "get_ready_tasks" src/api/tools/definitions.ts && \
   grep -q "analyze_task_dependencies" src/api/tools/definitions.ts; then
    echo "✅ Tool registration: PASSED"
else
    echo "❌ Tool registration: FAILED"
    exit 1
fi

echo ""
echo "🎉 ALL VALIDATIONS PASSED!"
echo "✅ Dependency management features are production ready"
echo "✅ Performance requirements met"
echo "✅ Integration tests passed"
echo "✅ Tools properly registered"
echo ""
echo "The dependency management implementation is complete and ready for production use."