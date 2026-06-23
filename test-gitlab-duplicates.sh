#!/bin/bash
# Test GitLab Push Fix - Full Flow

set -e

BFF="http://localhost:8081"
TOKEN="Bearer dev-test"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          GitLab Push Feature - Fix Verification               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check initial state (should be empty)
echo "1️⃣  Initial state - checking credentials list..."
INITIAL=$(curl -s "$BFF/api/gitlab/credentials" -H "Authorization: $TOKEN" 2>&1)
COUNT=$(echo "$INITIAL" | grep -o "https://gitlab.com" | wc -l)
echo "   Initial credentials: $COUNT"
if [ "$COUNT" -eq 0 ]; then
    echo "   ✅ Good: Database is clean"
else
    echo "   ⚠️  Warning: Found $COUNT existing credentials"
fi
echo ""

# Step 2: First Connect
echo "2️⃣  First 'Connect to GitLab' click..."
RESPONSE1=$(curl -s "$BFF/api/gitlab/auth/authorize?gitlabUrl=https://gitlab.com" -H "Authorization: $TOKEN")
echo "   Response: $RESPONSE1"
if echo "$RESPONSE1" | grep -q "gitlabUrl\|authorizationUrl"; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Failed"
fi
echo ""

# Step 3: Check credentials after first click
echo "3️⃣  After first click - checking credentials..."
AFTER_FIRST=$(curl -s "$BFF/api/gitlab/credentials" -H "Authorization: $TOKEN")
COUNT_AFTER_1=$(echo "$AFTER_FIRST" | grep -o "https://gitlab.com" | wc -l)
echo "   Credentials after 1st click: $COUNT_AFTER_1"
if [ "$COUNT_AFTER_1" -eq 1 ]; then
    echo "   ✅ Exactly 1 credential (as expected)"
else
    echo "   ❌ ERROR: Expected 1, got $COUNT_AFTER_1"
fi
echo ""

# Step 4: Second Connect (should reuse)
echo "4️⃣  Second 'Connect to GitLab' click (should reuse)..."
RESPONSE2=$(curl -s "$BFF/api/gitlab/auth/authorize?gitlabUrl=https://gitlab.com" -H "Authorization: $TOKEN")
echo "   Response: $RESPONSE2"
if echo "$RESPONSE2" | grep -q "gitlabUrl\|authorizationUrl"; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Failed"
fi
echo ""

# Step 5: Check credentials after second click (CRITICAL TEST)
echo "5️⃣  After second click - checking for duplicates..."
AFTER_SECOND=$(curl -s "$BFF/api/gitlab/credentials" -H "Authorization: $TOKEN")
COUNT_AFTER_2=$(echo "$AFTER_SECOND" | grep -o "https://gitlab.com" | wc -l)
echo "   Credentials after 2nd click: $COUNT_AFTER_2"
if [ "$COUNT_AFTER_2" -eq 1 ]; then
    echo "   ✅ PASS - Still 1 credential (no duplicate created!)"
elif [ "$COUNT_AFTER_2" -gt 1 ]; then
    echo "   ❌ FAIL - Duplicate detected! Got $COUNT_AFTER_2"
fi
echo ""

# Step 6: Check backend logs for messages
echo "6️⃣  Backend logs verification..."
echo "   Looking for 'Reusing existing' message..."
if docker-compose logs spring-bff 2>&1 | grep -q "Reusing existing mock GitLab credential"; then
    echo "   ✅ Found 'Reusing existing' - Fix is working!"
else
    echo "   ⚠️  'Reusing existing' not found in logs"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                               ║"
echo "╠════════════════════════════════════════════════════════════════╣"
if [ "$COUNT_AFTER_2" -eq 1 ]; then
    echo "║  ✅ ALL TESTS PASSED - No duplicates!                          ║"
else
    echo "║  ❌ DUPLICATE BUG STILL EXISTS - Got $COUNT_AFTER_2 credentials             ║"
fi
echo "╚════════════════════════════════════════════════════════════════╝"
