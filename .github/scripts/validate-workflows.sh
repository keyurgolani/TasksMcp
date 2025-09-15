#!/bin/bash

echo "🔍 Validating GitHub workflows..."

# Check if all required workflows exist
workflows=(
  ".github/workflows/ci.yml"
  ".github/workflows/auto-release.yml"
  ".github/workflows/dependency-update.yml"
  ".github/workflows/performance-benchmark.yml"
  ".github/workflows/publish.yml"
)

for workflow in "${workflows[@]}"; do
  if [[ -f "$workflow" ]]; then
    echo "✅ Found: $workflow"
  else
    echo "❌ Missing: $workflow"
    exit 1
  fi
done

# Check if all required scripts exist
scripts=(
  ".github/scripts/test-cli.mjs"
  ".github/scripts/check-memory.mjs"
  ".github/scripts/validate-mcp.mjs"
  ".github/scripts/validate-package.mjs"
)

for script in "${scripts[@]}"; do
  if [[ -f "$script" ]]; then
    echo "✅ Found: $script"
  else
    echo "❌ Missing: $script"
    exit 1
  fi
done

echo "🎉 All workflows and scripts are present!"

# Test CLI functionality
echo "🧪 Testing CLI functionality..."
if node .github/scripts/test-cli.mjs > /dev/null 2>&1; then
  echo "✅ CLI test passed"
else
  echo "❌ CLI test failed"
  exit 1
fi

echo "✅ All validations passed!"