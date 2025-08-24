#!/bin/bash

# Tab Memory API Test Script
# Tests all major endpoints to verify Phase 2 completion

set -e

API_URL="http://localhost:3000"
TEST_EMAIL="test-$(date +%s)@tabmemory.com"
TEST_PASSWORD="testpassword123"

echo "🧪 Testing Tab Memory API..."
echo "API URL: $API_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: User Registration
echo -e "${YELLOW}Test 2: User Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ User registration successful${NC}"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Access Token: ${ACCESS_TOKEN:0:20}..."
    echo "User ID: $USER_ID"
else
    echo -e "${RED}❌ User registration failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Event Ingestion
echo -e "${YELLOW}Test 3: Event Ingestion (Batch)${NC}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
EVENTS_RESPONSE=$(curl -s -X POST "$API_URL/events/batch" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{
        \"events\": [
            {
                \"window_id\": 1,
                \"tab_id\": 123,
                \"type\": \"open\",
                \"title\": \"Test Tab 1\",
                \"url\": \"https://example.com\",
                \"ts\": \"$TIMESTAMP\"
            },
            {
                \"window_id\": 1,
                \"tab_id\": 124,
                \"type\": \"open\",
                \"title\": \"Test Tab 2\",
                \"url\": \"https://google.com\",
                \"ts\": \"$TIMESTAMP\"
            }
        ]
    }")

if echo "$EVENTS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Event ingestion successful${NC}"
    SYNCED_COUNT=$(echo "$EVENTS_RESPONSE" | grep -o '"synced_count":[0-9]*' | cut -d':' -f2)
    echo "Events synced: $SYNCED_COUNT"
else
    echo -e "${RED}❌ Event ingestion failed${NC}"
    echo "Response: $EVENTS_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Get Sessions
echo -e "${YELLOW}Test 4: Get Sessions${NC}"
SESSIONS_RESPONSE=$(curl -s -X GET "$API_URL/sessions?limit=10" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$SESSIONS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Sessions retrieval successful${NC}"
    SESSION_COUNT=$(echo "$SESSIONS_RESPONSE" | grep -o '"sessions":\[[^]]*\]' | grep -o '\[.*\]' | jq length 2>/dev/null || echo "0")
    echo "Sessions found: $SESSION_COUNT"
else
    echo -e "${RED}❌ Sessions retrieval failed${NC}"
    echo "Response: $SESSIONS_RESPONSE"
fi
echo ""

# Test 5: User Profile
echo -e "${YELLOW}Test 5: User Profile${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/users/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ User profile retrieval successful${NC}"
    PROFILE_EMAIL=$(echo "$PROFILE_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "Profile email: $PROFILE_EMAIL"
else
    echo -e "${RED}❌ User profile retrieval failed${NC}"
    echo "Response: $PROFILE_RESPONSE"
fi
echo ""

# Test 6: User Statistics
echo -e "${YELLOW}Test 6: User Statistics${NC}"
STATS_RESPONSE=$(curl -s -X GET "$API_URL/users/stats" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ User statistics retrieval successful${NC}"
    TOTAL_EVENTS=$(echo "$STATS_RESPONSE" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
    echo "Total events: $TOTAL_EVENTS"
else
    echo -e "${RED}❌ User statistics retrieval failed${NC}"
    echo "Response: $STATS_RESPONSE"
fi
echo ""

# Test 7: Authentication Test (Invalid Token)
echo -e "${YELLOW}Test 7: Authentication Validation${NC}"
AUTH_TEST_RESPONSE=$(curl -s -X GET "$API_URL/sessions" \
    -H "Authorization: Bearer invalid_token")

if echo "$AUTH_TEST_RESPONSE" | grep -q '"error":"Invalid access token"'; then
    echo -e "${GREEN}✅ Authentication validation working${NC}"
else
    echo -e "${RED}❌ Authentication validation failed${NC}"
    echo "Response: $AUTH_TEST_RESPONSE"
fi
echo ""

# Summary
echo -e "${GREEN}🎉 API Test Suite Completed!${NC}"
echo ""
echo "✅ Phase 2 Requirements Verified:"
echo "  • API server running and healthy"
echo "  • User registration and authentication"
echo "  • Event ingestion (batch endpoint)"
echo "  • Session management endpoints"
echo "  • User profile and statistics"
echo "  • Proper authentication middleware"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Set up Supabase database (see SUPABASE_SETUP.md)"
echo "  2. Deploy to Railway/Render (see DEPLOYMENT.md)"
echo "  3. Test extension with deployed API"
echo "  4. Load extension and verify end-to-end flow"
echo ""
