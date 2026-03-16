#!/bin/bash

# 설정: 테스트할 기본 URL
URL="http://localhost:3000/healthCheck"

echo "=========================================================="
echo "1단계: 로컬 IP 임계치 초과 차단 테스트 (/healthCheck)"
echo "=========================================================="

for i in {1..6}; do
  echo "요청 $i:"
  # curl 응답의 HTTP 상태 코드와 첫 번째 헤더 라인만 출력
  curl -s -i $URL | grep -E "HTTP/1.1"
done

echo ""
echo "=========================================================="
echo "2단계: 다중 IP 프록시 식별 테스트 (새로운 클라이언트 시뮬레이션)"
echo "=========================================================="
echo "명령어: curl -i -H \"X-Forwarded-For: 198.51.100.1\" $URL"
curl -s -i -H "X-Forwarded-For: 198.51.100.1" $URL | grep -E "HTTP/1.1|RateLimit"
echo ""
echo "전체 결과 출력 (응답 본문 포함):"
curl -s -i -H "X-Forwarded-For: 198.51.100.1" $URL
echo ""
