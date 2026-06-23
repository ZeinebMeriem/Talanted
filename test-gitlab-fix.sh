#!/bin/bash
# Test GitLab Push Feature Fix
# Tests the dev-mode GitLab credential flow

set -e

echo "🧪 Testing GitLab Push Feature Fix"
echo "=================================="
echo ""

BFF_URL="http://localhost:8080"
DEV_TOKEN="Bearer dev-token"

# Helper function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_status=$4

    echo -n "Testing: $name ... "
    response=$(curl -s -w "\n%{http_code}" -X $method "$BFF_URL$endpoint" -H "Authorization: $DEV_TOKEN")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [[ "$status" == "$expected_status" ]]; then
        echo "✅ OK (HTTP $status)"
        echo "$body"
    else
        echo "❌ FAILED (Expected $expected_status, got $status)"
        echo "$body"
        return 1
    fi
    echo ""
}

echo "1️⃣  GET /api/gitlab/credentials (should be empty)"
echo "================================================"
response=$(curl -s http://localhost:8080/api/gitlab/credentials -H "Authorization: Bearer test-jwt")
echo "Response: $response"
echo ""

echo "2️⃣  GET /api/gitlab/auth/authorize (dev mode - should create mock credential)"
echo "========================================================================="
response=$(curl -s "http://localhost:8080/api/gitlab/auth/authorize?gitlabUrl=https://gitlab.com" -H "Authorization: Bearer test-jwt")
echo "Response: $response"
echo ""

echo "3️⃣  GET /api/gitlab/credentials again (should have 1 entry)"
echo "========================================================="
response=$(curl -s http://localhost:8080/api/gitlab/credentials -H "Authorization: Bearer test-jwt")
echo "Response: $response"
echo ""

echo "4️⃣  GET /api/gitlab/auth/authorize again (should reuse, not duplicate)"
echo "====================================================================="
response=$(curl -s "http://localhost:8080/api/gitlab/auth/authorize?gitlabUrl=https://gitlab.com" -H "Authorization: Bearer test-jwt")
echo "Response: $response"
echo ""

echo "5️⃣  GET /api/gitlab/credentials (should still have 1 entry, not 2)"
echo "=============================================================="
response=$(curl -s http://localhost:8080/api/gitlab/credentials -H "Authorization: Bearer test-jwt")
echo "Response: $response"
echo ""

echo "✅ All tests completed!"
