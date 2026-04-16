#!/bin/bash
# Test CI/CD Pipeline Locally - Simulates GitHub Actions

set -e

echo "🚀 Testing CI/CD Pipeline Locally"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to run a test
run_step() {
  local step_name=$1
  local command=$2

  echo -e "${BLUE}→${NC} $step_name"

  if eval "$command"; then
    echo -e "${GREEN}✓ PASSED${NC}\n"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC}\n"
    FAILED=$((FAILED + 1))
  fi
}

# ============================================================================
# FRONTEND TESTS
# ============================================================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}FRONTEND CI${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cd frontend

run_step "1. Install dependencies" \
  "npm ci --silent"

run_step "2. TypeScript type check" \
  "npx tsc --noEmit"

run_step "3. Build frontend" \
  "npm run build > /dev/null 2>&1"

cd ..

# ============================================================================
# BACKEND TESTS
# ============================================================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}BACKEND (SPRING BFF) CI${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cd spring-bff

run_step "1. Maven clean build (skip tests)" \
  "mvn clean package -DskipTests -q"

run_step "2. Run unit tests" \
  "mvn test -q" || echo -e "${YELLOW}⚠ Tests may need Docker services${NC}"

cd ..

# ============================================================================
# FASTAPI TESTS
# ============================================================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}FASTAPI CI${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cd fastapi-ai

run_step "1. Install Python dependencies" \
  "pip install -q -r requirements.txt 2>/dev/null || pip install -r requirements.txt"

run_step "2. Python syntax check" \
  "python -m py_compile app/main.py app/exceptions.py"

run_step "3. Run FastAPI tests" \
  "pytest tests/ -v --tb=short 2>/dev/null" || echo -e "${YELLOW}⚠ Tests completed${NC}"

cd ..

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}SUMMARY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed locally!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Commit your changes"
  echo "2. Push to GitHub (git push origin main)"
  echo "3. Go to GitHub Actions to see full pipeline"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  exit 1
fi
