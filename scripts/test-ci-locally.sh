#!/bin/bash
# Local CI testing script - simulates GitHub Actions behavior

set -e

echo "🚀 Running Local CI Pipeline..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

run_test() {
  local test_name=$1
  local command=$2

  echo -n "📋 $test_name ... "
  TOTAL=$((TOTAL + 1))

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC}"
    FAILED=$((FAILED + 1))
  fi
}

echo "========================================="
echo "Frontend CI"
echo "========================================="
run_test "Lint TypeScript" "cd frontend && npm run build"
run_test "Type checking" "cd frontend && npx tsc --noEmit"

echo ""
echo "========================================="
echo "Backend CI"
echo "========================================="
run_test "Maven build" "cd spring-bff && mvn clean package -DskipTests"
run_test "Maven tests" "cd spring-bff && mvn test" || true

echo ""
echo "========================================="
echo "FastAPI CI"
echo "========================================="
run_test "Python lint" "cd fastapi-ai && pip install ruff && ruff check app/" || true
run_test "Python type check" "cd fastapi-ai && pip install mypy && mypy app/ --ignore-missing-imports" || true

echo ""
echo "========================================="
echo "📊 Summary"
echo "========================================="
echo "Total: $TOTAL | $GREEN✓ Passed: $PASSED$NC | $RED✗ Failed: $FAILED$NC"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  exit 1
fi
