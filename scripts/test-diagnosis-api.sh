#!/bin/bash

# Diagnosis API Testing Script
# Usage: ./test-diagnosis-api.sh [BASE_URL] [AUTH_TOKEN]

BASE_URL=${1:-"http://localhost:3000"}
AUTH_TOKEN=${2:-"YOUR_TOKEN_HERE"}

echo "================================================="
echo "     Diagnosis API Testing Script"
echo "================================================="
echo "Base URL: $BASE_URL"
echo "Auth Token: ${AUTH_TOKEN:0:20}..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo -e "${YELLOW}Test 1: Create Order with Diagnosis from SIMRS${NC}"
echo "================================================="

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/orders/simrs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @docs/examples/create-order-with-diagnosis.json)

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Create order with diagnosis"
    
    # Extract order ID and detail ID (adjust based on your response structure)
    ORDER_ID=$(echo "$RESPONSE_BODY" | jq -r '.order.id // .id // empty' 2>/dev/null)
    DETAIL_ID=$(echo "$RESPONSE_BODY" | jq -r '.order.details[0].id // .details[0].id // empty' 2>/dev/null)
    
    echo "Order ID: $ORDER_ID"
    echo "Detail ID: $DETAIL_ID"
else
    print_result 1 "Create order with diagnosis"
    ORDER_ID=""
    DETAIL_ID=""
fi

echo ""

# Only continue if we have order and detail IDs
if [ -n "$ORDER_ID" ] && [ -n "$DETAIL_ID" ]; then
    echo -e "${YELLOW}Test 2: Get Order and Verify Diagnosis Format${NC}"
    echo "================================================="
    
    GET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/orders/$ORDER_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN")
    
    HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n 1)
    RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_CODE"
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        DIAGNOSIS=$(echo "$RESPONSE_BODY" | jq '.details[0].diagnosis' 2>/dev/null)
        echo "Diagnosis Format: $DIAGNOSIS"
        
        # Check if diagnosis is an object with code and display
        CODE=$(echo "$DIAGNOSIS" | jq -r '.code // empty' 2>/dev/null)
        DISPLAY=$(echo "$DIAGNOSIS" | jq -r '.display // empty' 2>/dev/null)
        
        if [ -n "$CODE" ] && [ -n "$DISPLAY" ]; then
            print_result 0 "Diagnosis format is correct (object with code and display)"
        else
            print_result 1 "Diagnosis format is incorrect"
        fi
    else
        print_result 1 "Get order"
    fi
    
    echo ""
    
    echo -e "${YELLOW}Test 3: Update Diagnosis from RIS${NC}"
    echo "================================================="
    
    UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/orders/$ORDER_ID/details/$DETAIL_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d @docs/examples/update-diagnosis-from-ris.json)
    
    HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n 1)
    RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_CODE"
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        NEW_DIAGNOSIS=$(echo "$RESPONSE_BODY" | jq '.diagnosis' 2>/dev/null)
        echo "New Diagnosis: $NEW_DIAGNOSIS"
        
        NEW_CODE=$(echo "$NEW_DIAGNOSIS" | jq -r '.code // empty' 2>/dev/null)
        
        if [ "$NEW_CODE" = "J18.0" ]; then
            print_result 0 "Diagnosis updated successfully"
        else
            print_result 1 "Diagnosis not updated correctly"
        fi
    else
        print_result 1 "Update diagnosis"
    fi
    
    echo ""
    
    echo -e "${YELLOW}Test 4: Update Status Without Changing Diagnosis${NC}"
    echo "================================================="
    
    UPDATE_STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/orders/$ORDER_ID/details/$DETAIL_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d @docs/examples/update-status-without-diagnosis.json)
    
    HTTP_CODE=$(echo "$UPDATE_STATUS_RESPONSE" | tail -n 1)
    RESPONSE_BODY=$(echo "$UPDATE_STATUS_RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_CODE"
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        DIAGNOSIS_CHECK=$(echo "$RESPONSE_BODY" | jq '.diagnosis.code' 2>/dev/null)
        echo "Diagnosis Code: $DIAGNOSIS_CHECK"
        
        if [ "$DIAGNOSIS_CHECK" = '"J18.0"' ]; then
            print_result 0 "Diagnosis preserved when updating status"
        else
            print_result 1 "Diagnosis changed unexpectedly"
        fi
    else
        print_result 1 "Update status"
    fi
else
    echo -e "${RED}Cannot proceed with remaining tests - missing order/detail ID${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure the server is running at $BASE_URL"
    echo "2. Check if your AUTH_TOKEN is valid"
    echo "3. Verify you have proper permissions (create:order, read:order, update:order)"
    echo "4. Check the response above for error messages"
fi

echo ""
echo "================================================="
echo "               TEST SUMMARY"
echo "================================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED ✅${NC}"
echo -e "${RED}Failed: $FAILED ❌${NC}"
echo "================================================="

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
