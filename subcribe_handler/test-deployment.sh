#!/bin/bash

# 배포된 Vercel 사이트 테스트 스크립트
# 사용법: ./test-deployment.sh https://your-project.vercel.app

if [ -z "$1" ]; then
    echo "❌ 사용법: ./test-deployment.sh <배포된_URL>"
    echo "예: ./test-deployment.sh https://subscribe-handler.vercel.app"
    exit 1
fi

BASE_URL="$1"
echo "🧪 배포된 사이트 테스트 시작: $BASE_URL"
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 함수
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -n "테스트: $name ... "
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 성공 (HTTP $http_code)${NC}"
        if [ -n "$body" ] && [ "$(echo "$body" | head -c 1)" = "{" ]; then
            echo "$body" | jq . 2>/dev/null || echo "$body" | head -c 200
            echo ""
        fi
        return 0
    else
        echo -e "${RED}❌ 실패 (HTTP $http_code)${NC}"
        echo "$body" | head -c 200
        echo ""
        return 1
    fi
}

# 결과 카운터
PASSED=0
FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ 메인 페이지 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if test_endpoint "메인 페이지" "$BASE_URL" 200; then
    ((PASSED++))
else
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ API 엔드포인트 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 연결 테스트 API
if test_endpoint "연결 테스트 API" "$BASE_URL/api/test-connection" 200; then
    ((PASSED++))
    # JSON 응답 파싱
    response=$(curl -s "$BASE_URL/api/test-connection")
    echo "   환경 변수 상태:"
    echo "$response" | jq -r '.env_variables | to_entries[] | "   - \(.key): \(.value)"' 2>/dev/null || echo "   (JSON 파싱 실패)"
    echo ""
    echo "   Supabase 연결:"
    echo "$response" | jq -r '.supabase_connection.status' 2>/dev/null || echo "   (확인 불가)"
    echo ""
    echo "   테이블 상태:"
    echo "$response" | jq -r '.tables | to_entries[] | "   - \(.key): \(.value)"' 2>/dev/null || echo "   (확인 불가)"
    echo ""
    echo "   전체 상태:"
    echo "$response" | jq -r '.summary.status' 2>/dev/null || echo "   (확인 불가)"
else
    ((FAILED++))
fi

# Gemini API 테스트
if test_endpoint "Gemini API 테스트" "$BASE_URL/api/test-gemini" 200; then
    ((PASSED++))
else
    ((FAILED++))
fi

# 모델 목록 API
if test_endpoint "모델 목록 API" "$BASE_URL/api/list-models" 200; then
    ((PASSED++))
else
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ Cron Job 엔드포인트 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Cron 엔드포인트는 인증이 필요할 수 있으므로 401/403도 정상일 수 있음
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/cron/check-notifications")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ] || [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo -e "${GREEN}✅ Cron 엔드포인트 접근 가능 (HTTP $http_code)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Cron 엔드포인트 오류 (HTTP $http_code)${NC}"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 테스트 결과 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 성공: $PASSED${NC}"
echo -e "${RED}❌ 실패: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 테스트 통과!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ 일부 테스트 실패. 위의 결과를 확인하세요.${NC}"
    exit 1
fi

