Run API locally (PowerShell):
1) Set environment for free local AI (Ollama):
   $env:AI_PROVIDER="ollama"
   $env:OLLAMA_BASE_URL="http://localhost:11434"
   $env:OLLAMA_MODEL="llama3.1:8b"
   $env:APP_AUTH_SECRET="change-this-secret"
   # Optional free local STT (whisper.cpp command path)
   # $env:WHISPER_CPP_CMD="C:\whisper\main.exe -m C:\whisper\models\ggml-base.bin -l ko"
2) Start PHP server from this folder (router 필수 — /api 가 index.php 로 들어감):
   php -S 127.0.0.1:8080 -t public public/router.php

Endpoints:
- GET  /health
- POST /api/auth/login
- POST /api/auth/register
- GET  /api/auth/me
- POST /api/auth/change-password
- POST /api/ai/proofread
- POST /api/ai/doc-draft
- POST /api/rag/documents  (본문: title, content — 등록 시 줄/제N조 힌트로 청크 분할·ref_hint 저장)
- GET  /api/rag/documents
- POST /api/rag/ask      (응답: answer, citations[{document_title, ref_hint, snippet, ...}])
- POST /api/meeting/transcribe
- POST /api/meeting/summarize
- GET  /api/meeting/logs
- GET/POST /api/hr/employees
- GET /api/hr/alerts
- GET/POST /api/budget/items
- GET /api/budget/summary
- GET/POST /api/board/items
- GET/POST /api/org/nodes
- GET  /api/compliance/workflows
- POST /api/compliance/workflows
- GET  /api/compliance/workflows/{id}
- POST /api/compliance/workflows/{id}/steps
- GET  /api/compliance/runs?workflow_id=
- POST /api/compliance/runs
- GET  /api/compliance/runs/{id}
- GET  /api/compliance/dashboard?days=
- PATCH /api/compliance/run-steps/{id}
- POST /api/compliance/suggest-steps
- GET /api/system/backup
- POST /api/system/restore
