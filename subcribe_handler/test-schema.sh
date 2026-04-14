#!/bin/bash

# 배포된 사이트 URL (변경 필요)
DEPLOYED_URL="${1:-https://subscribe-handler.vercel.app}"

echo "🧪 스키마 확인 테스트 시작: $DEPLOYED_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1️⃣ 스키마 확인 API 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s "$DEPLOYED_URL/api/check-schema")

if [ $? -eq 0 ]; then
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  
  # 성공 여부 확인
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ 모든 스키마 업데이트가 완료되었습니다!"
  else
    echo ""
    echo "⚠️ 일부 스키마 업데이트가 필요합니다."
  fi
else
  echo "❌ API 호출 실패"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 사용법: ./test-schema.sh [배포된_URL]"
echo "예: ./test-schema.sh https://subscribe-handler.vercel.app"

