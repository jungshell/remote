-- 1인 1투표 보장: Vote 테이블에 (userId, voteSessionId) 유니크 제약 추가
CREATE UNIQUE INDEX "Vote_userId_voteSessionId_key" ON "Vote"("userId", "voteSessionId");
