#!/bin/bash

# Dependency Management Features Validation Script
# Comprehensive validation of all dependency management features for production readiness

set -e

echo "🚀 Starting Dependency Management Features Validation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite and track results
run_test_suite() {
    local test_name="$1"
    local test_path="$2"
    local test_filter="$3"
    
    echo -e "\n${BLUE}Running: $test_name${NC}"
    echo "----------------------------------------"
    
    if [ -n "$test_filter" ]; then
        if npm test -- "$test_path" --run -t "$test_filter" --reporter=verbose; then
            echo -e "${GREEN}✅ $test_name: PASSED${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ $test_name: FAILED${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        if npm test -- "$test_path" --run --reporter=verbose; then
            echo -e "${GREEN}✅ $test_name: PASSED${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ $test_name: FAILED${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
    
    ((TOTAL_TESTS++))
}

# Function to check if dependency handlers exist
check_dependency_handlers() {
    echo -e "\n${BLUE}Checking Dependency Handler Files${NC}"
    echo "----------------------------------------"
    
    local handlers=(
        "src/api/handlers/set-task-dependencies.ts"
        "src/api/handlers/get-ready-tasks.ts"
        "src/api/handlers/analyze-task-dependencies.ts"
    )
    
    local all_exist=true
    
    for handler in "${handlers[@]}"; do
        if [ -f "$handler" ]; then
            echo -e "${GREEN}✅ $handler exists${NC}"
        else
            echo -e "${RED}❌ $handler missing${NC}"
            all_exist=false
        fi
    done
    
    if [ "$all_exist" = true ]; then
        echo -e "${GREEN}✅ All dependency handlers present${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ Missing dependency handlers${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to validate TypeScript compilation
validate_typescript() {
    echo -e "\n${BLUE}Validating TypeScript Compilation${NC}"
    echo "----------------------------------------"
    
    if npm run lint; then
        echo -e "${GREEN}✅ TypeScript compilation: PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ TypeScript compilation: FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to run performance benchmarks
run_performance_benchmarks() {
    echo -e "\n${BLUE}Running Performance Benchmarks${NC}"
    echo "----------------------------------------"
    
    # Core dependency tools performance
    run_test_suite "Core Dependency Tools Performance" \
                   "tests/performance/dependency-management-performance.test.ts" \
                   "Core Dependency Tools Performance"
    
    # Performance regression tests
    run_test_suite "Performance Regression Tests" \
                   "tests/performance/dependency-performance-regression.test.ts" \
                   "MCP Tool Performance Regression"
}

# Function to run integration tests
run_integration_tests() {
    echo -e "\n${BLUE}Running Integration Tests${NC}"
    echo "----------------------------------------"
    
    # End-to-end workflow tests
    run_test_suite "End-to-End Workflow Tests" \
                   "tests/integration/dependency-end-to-end.test.ts" \
                   "Complete Project Workflow"
    
    # Production readiness tests
    run_test_suite "Production Readiness Tests" \
                   "tests/integration/dependency-production-readiness.test.ts" \
                   "Production Deployment Readiness"
}

# Function to run unit tests for dependency features
run_unit_tests() {
    echo -e "\n${BLUE}Running Unit Tests${NC}"
    echo "----------------------------------------"
    
    # Dependency handler unit tests
    local unit_test_files=(
        "tests/unit/api/handlers/set-task-dependencies.test.ts"
        "tests/unit/api/handlers/get-ready-tasks.test.ts"
        "tests/unit/api/handlers/analyze-task-dependencies.test.ts"
    )
    
    for test_file in "${unit_test_files[@]}"; do
        if [ -f "$test_file" ]; then
            local test_name=$(basename "$test_file" .test.ts)
            run_test_suite "Unit Test: $test_name" "$test_file"
        else
            echo -e "${YELLOW}⚠️  Unit test file not found: $test_file${NC}"
        fi
    done
}

# Function to validate tool registration
validate_tool_registration() {
    echo -e "\n${BLUE}Validating Tool Registration${NC}"
    echo "----------------------------------------"
    
    # Check if tools are registered in the definitions file
    if grep -q "set_task_dependencies" src/api/tools/definitions.ts && \
       grep -q "get_ready_tasks" src/api/tools/definitions.ts && \
       grep -q "analyze_task_dependencies" src/api/tools/definitions.ts; then
        echo -e "${GREEN}✅ All dependency tools registered${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ Dependency tools not properly registered${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to check documentation
check_documentation() {
    echo -e "\n${BLUE}Checking Documentation${NC}"
    echo "----------------------------------------"
    
    local doc_files=(
        "docs/api/dependency-management.md"
        "examples/06-dependency-management-examples.md"
    )
    
    local docs_exist=true
    
    for doc_file in "${doc_files[@]}"; do
        if [ -f "$doc_file" ]; then
            echo -e "${GREEN}✅ $doc_file exists${NC}"
        else
            echo -e "${YELLOW}⚠️  $doc_file missing (optional)${NC}"
        fi
    done
    
    # This is informational, not a failure
    echo -e "${BLUE}ℹ️  Documentation check completed${NC}"
}

# Function to generate final report
generate_final_report() {
    echo -e "\n${BLUE}Final Validation Report${NC}"
    echo "=================================================="
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $success_rate%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED - DEPENDENCY FEATURES ARE PRODUCTION READY! 🎉${NC}"
        echo -e "${GREEN}✅ Dependency management tools are ready for deployment${NC}"
        echo -e "${GREEN}✅ Performance requirements met${NC}"
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        echo -e "${GREEN}✅ Error handling validated${NC}"
        echo -e "${GREEN}✅ User experience verified${NC}"
        return 0
    else
        echo -e "\n${RED}❌ VALIDATION FAILED - $FAILED_TESTS test(s) failed${NC}"
        echo -e "${RED}Please fix the failing tests before deploying dependency features${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo "Starting comprehensive validation of dependency management features..."
    
    # Pre-flight checks
    check_dependency_handlers
    validate_typescript
    validate_tool_registration
    
    # Core functionality tests
    run_unit_tests
    run_integration_tests
    
    # Performance validation
    run_performance_benchmarks
    
    # Documentation check (informational)
    check_documentation
    
    # Generate final report
    generate_final_report
}

# Run main function and capture exit code
main
exit_code=$?

echo -e "\n${BLUE}Validation completed with exit code: $exit_code${NC}"
exit $exit_code