<?php

declare(strict_types=1);

if (function_exists('ini_set')) {
    @ini_set('display_errors', '0');
}

require_once __DIR__ . "/../src/bootstrap.php";
require_once __DIR__ . "/../src/openai_client.php";

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];
$pdo = db();

if ($method === "GET" && $path === "/health") {
    json_response(["ok" => true, "service" => "cnci-api"]);
    exit;
}

if ($method === "POST" && $path === "/api/auth/login") {
    $body = json_body();
    $email = trim((string)($body["email"] ?? ""));
    $password = (string)($body["password"] ?? "");
    $stmt = $pdo->prepare("SELECT id, email, name, password_hash FROM users WHERE email = :email");
    $stmt->execute([":email" => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($password, $user["password_hash"])) {
        json_response(["error" => "이메일 또는 비밀번호가 올바르지 않습니다."], 401);
        exit;
    }
    json_response([
        "token" => issue_token((int)$user["id"]),
        "user" => ["id" => (int)$user["id"], "email" => $user["email"], "name" => $user["name"]],
    ]);
    exit;
}

if ($method === "POST" && $path === "/api/auth/register") {
    $body = json_body();
    $email = trim((string)($body["email"] ?? ""));
    $password = (string)($body["password"] ?? "");
    $name = trim((string)($body["name"] ?? "사용자"));
    if ($email === "" || $password === "") {
        json_response(["error" => "email, password are required"], 400);
        exit;
    }
    $insert = $pdo->prepare("INSERT INTO users (email, password_hash, name, created_at) VALUES (:email, :password_hash, :name, :created_at)");
    try {
        $insert->execute([
            ":email" => $email,
            ":password_hash" => password_hash($password, PASSWORD_DEFAULT),
            ":name" => $name,
            ":created_at" => date("c"),
        ]);
    } catch (Throwable $e) {
        json_response(["error" => "이미 존재하는 이메일입니다."], 409);
        exit;
    }
    json_response(["ok" => true], 201);
    exit;
}

if ($method === "GET" && $path === "/api/auth/me") {
    $user = require_user();
    json_response(["user" => $user]);
    exit;
}

if ($method === "POST" && $path === "/api/auth/change-password") {
    $user = require_user();
    $body = json_body();
    $currentPassword = (string)($body["currentPassword"] ?? "");
    $newPassword = (string)($body["newPassword"] ?? "");
    if ($currentPassword === "" || $newPassword === "") {
        json_response(["error" => "currentPassword and newPassword are required"], 400);
        exit;
    }
    if (strlen($newPassword) < 8) {
        json_response(["error" => "새 비밀번호는 8자 이상이어야 합니다."], 400);
        exit;
    }
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = :id");
    $stmt->execute([":id" => (int)$user["id"]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !password_verify($currentPassword, $row["password_hash"])) {
        json_response(["error" => "현재 비밀번호가 일치하지 않습니다."], 401);
        exit;
    }
    $update = $pdo->prepare("UPDATE users SET password_hash = :password_hash WHERE id = :id");
    $update->execute([
        ":password_hash" => password_hash($newPassword, PASSWORD_DEFAULT),
        ":id" => (int)$user["id"],
    ]);
    json_response(["ok" => true]);
    exit;
}

$authRequiredPrefixes = ["/api/ai/", "/api/rag/", "/api/meeting/", "/api/hr/", "/api/budget/", "/api/board/", "/api/org/", "/api/compliance/"];
foreach ($authRequiredPrefixes as $prefix) {
    if (str_starts_with($path, $prefix)) {
        $user = require_user();
        break;
    }
}

if (!isset($user)) {
    $user = null;
}

if ($method === "POST" && $path === "/api/ai/proofread") {
    $body = json_body();
    $text = trim((string)($body["text"] ?? ""));
    $tone = trim((string)($body["tone"] ?? "공문"));
    if ($text === "") {
        json_response(["error" => "text is required"], 400);
        exit;
    }
    $result = ask_ai(
        "당신은 공공기관 대외 문서 교정 비서입니다. 한국어 문장을 자연스럽고 정중하게 다듬고, 문맥 오류를 바로잡으세요.",
        "톤: {$tone}\n원문:\n{$text}\n\n출력:\n1) 교정본\n2) 수정 이유 3가지"
    );
    json_response(["result" => $result]);
    exit;
}

if ($method === "POST" && $path === "/api/ai/doc-draft") {
    $body = json_body();
    $sourceText = trim((string)($body["sourceText"] ?? ""));
    $template = trim((string)($body["template"] ?? ""));
    if ($sourceText === "" || $template === "") {
        json_response(["error" => "sourceText and template are required"], 400);
        exit;
    }
    $result = ask_ai(
        "당신은 공공기관 보고서 초안 작성 비서입니다. 주어진 템플릿 구조를 절대 유지하고 내용만 채워주세요.",
        "참고 자료:\n{$sourceText}\n\n템플릿:\n{$template}\n\n출력: 템플릿 순서 그대로 초안 작성"
    );
    json_response(["result" => $result]);
    exit;
}

if ($method === "POST" && $path === "/api/rag/documents/dedupe") {
    $userId = (int)$user["id"];
    $stmt = $pdo->prepare("SELECT id, title FROM documents WHERE user_id = :uid AND kind = 'regulation' ORDER BY id ASC");
    $stmt->execute([":uid" => $userId]);
    $seenKeys = [];
    $toDelete = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $id = (int)$row["id"];
        $key = mb_strtolower(trim((string)($row["title"] ?? "")), "UTF-8");
        if ($key === "") {
            $key = "__empty_" . $id;
        }
        if (!isset($seenKeys[$key])) {
            $seenKeys[$key] = $id;
        } else {
            $toDelete[] = $id;
        }
    }
    if (count($toDelete) > 0) {
        $in = implode(",", array_fill(0, count($toDelete), "?"));
        $pdo->prepare("UPDATE compliance_workflow_steps SET document_id = NULL WHERE document_id IN ($in)")->execute($toDelete);
        $pdo->prepare("DELETE FROM doc_chunks WHERE document_id IN ($in)")->execute($toDelete);
        $merge = array_merge([$userId], $toDelete);
        $pdo->prepare("DELETE FROM documents WHERE user_id = ? AND id IN ($in)")->execute($merge);
    }
    json_response([
        "ok" => true,
        "removed" => count($toDelete),
        "unique_titles" => count($seenKeys),
    ]);
    exit;
}

if ($method === "POST" && $path === "/api/rag/documents") {
    $body = json_body();
    $title = sanitize_utf8(trim((string)($body["title"] ?? "")));
    $content = sanitize_utf8(trim((string)($body["content"] ?? "")));
    $overwrite = filter_var($body["overwrite"] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($title === "" || $content === "") {
        json_response([
            "error" => "문서명과 본문이 필요합니다. PDF에서 텍스트가 비었거나(스캔 PDF), PHP post_max_size 등으로 요청 본문이 잘렸을 수 있습니다.",
        ], 400);
        exit;
    }
    $userId = (int)$user["id"];
    $find = $pdo->prepare("SELECT id FROM documents WHERE user_id = :uid AND kind = 'regulation' AND title = :title LIMIT 1");
    $find->execute([":uid" => $userId, ":title" => $title]);
    $existing = $find->fetch(PDO::FETCH_ASSOC);
    if ($existing && !$overwrite) {
        json_response([
            "error" => "같은 문서 제목(파일명)으로 이미 등록된 규정이 있습니다. 덮어쓰면 본문과 검색용 조각이 모두 새 내용으로 바뀝니다.",
            "code" => "duplicate_title",
            "existing_document_id" => (int)$existing["id"],
        ], 409);
        exit;
    }
    try {
        if ($existing && $overwrite) {
            $docId = (int)$existing["id"];
            $pdo->beginTransaction();
            $upd = $pdo->prepare("UPDATE documents SET content = :content, created_at = :created_at WHERE id = :id AND user_id = :uid");
            $upd->execute([
                ":content" => $content,
                ":created_at" => date("c"),
                ":id" => $docId,
                ":uid" => $userId,
            ]);
            $pdo->prepare("DELETE FROM doc_chunks WHERE document_id = :id")->execute([":id" => $docId]);
            rag_save_chunks($pdo, $docId, $content);
            $pdo->commit();
        } else {
            $insertDoc = $pdo->prepare("INSERT INTO documents (user_id, title, kind, content, created_at) VALUES (:user_id, :title, :kind, :content, :created_at)");
            $insertDoc->execute([
                ":user_id" => $userId,
                ":title" => $title,
                ":kind" => "regulation",
                ":content" => $content,
                ":created_at" => date("c"),
            ]);
            $docId = (int)$pdo->lastInsertId();
            rag_save_chunks($pdo, $docId, $content);
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(["error" => "문서 저장 오류: " . $e->getMessage()], 500);
        exit;
    }
    json_response(["ok" => true, "documentId" => $docId], $existing && $overwrite ? 200 : 201);
    exit;
}

if ($method === "GET" && $path === "/api/rag/documents") {
    $stmt = $pdo->prepare("SELECT id, title, created_at FROM documents WHERE user_id = :user_id AND kind = 'regulation' ORDER BY id DESC");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    json_response(["documents" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/rag/ask") {
    $body = json_body();
    $question = trim((string)($body["question"] ?? ""));
    if ($question === "") {
        json_response(["error" => "question is required"], 400);
        exit;
    }
    $keys = array_values(array_filter(explode(" ", keywords($question)), fn($k) => $k !== ""));
    $seen = [];
    foreach ($keys as $k) {
        $seen[mb_strtolower($k, "UTF-8")] = true;
    }
    foreach (preg_split("/\s+/u", $question, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $tok) {
        $t = trim($tok);
        if (mb_strlen($t, "UTF-8") < 2) {
            continue;
        }
        $low = mb_strtolower($t, "UTF-8");
        if (isset($seen[$low])) {
            continue;
        }
        $seen[$low] = true;
        $keys[] = $t;
        if (count($keys) >= 8) {
            break;
        }
    }
    $params = [":user_id" => (int)$user["id"]];
    $likeParts = [];
    foreach ($keys as $i => $k) {
        $pk = ":kw" . $i;
        $pc = ":kc" . $i;
        $params[$pk] = "%" . $k . "%";
        $params[$pc] = "%" . $k . "%";
        $likeParts[] = "(dc.keywords LIKE {$pk} OR dc.content LIKE {$pc})";
    }
    if (count($likeParts) === 0) {
        $fallback = mb_substr(trim(preg_replace("/[^\p{L}\p{N}]+/u", " ", $question) ?? ""), 0, 120, "UTF-8");
        if ($fallback !== "") {
            $params[":qfall"] = "%" . $fallback . "%";
            $likeParts[] = "dc.content LIKE :qfall";
        }
    }
    if (count($likeParts) === 0) {
        $likeParts[] = "1=1";
    }
    $where = implode(" OR ", $likeParts);
    $sql = "
        SELECT d.id AS document_id, d.title, dc.chunk_index, dc.content, IFNULL(dc.ref_hint, '') AS ref_hint
        FROM doc_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE d.user_id = :user_id AND d.kind = 'regulation' AND ({$where})
        ORDER BY d.id DESC, dc.chunk_index ASC
        LIMIT 12
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $contextLines = [];
    $citationObjs = [];
    foreach ($rows as $row) {
        $title = $row["title"] ?? "";
        $ref = trim((string)($row["ref_hint"] ?? ""));
        $refTag = $ref !== "" ? " [위치: {$ref}]" : "";
        $contextLines[] = "[출처 문서: {$title}{$refTag}]\n" . $row["content"];
        $snip = $row["content"] ?? "";
        if (mb_strlen($snip, "UTF-8") > 400) {
            $snip = mb_substr($snip, 0, 400, "UTF-8") . "…";
        }
        $citationObjs[] = [
            "document_id" => (int)($row["document_id"] ?? 0),
            "document_title" => $title,
            "ref_hint" => $ref,
            "chunk_index" => (int)($row["chunk_index"] ?? 0),
            "snippet" => $snip,
        ];
    }
    $contextText = implode("\n\n---\n\n", $contextLines);
    $instr = <<<SYS
당신은 지방의회·공공기관 규정 질의 응답 도우미입니다.
규칙:
- 아래 "검색된 근거"에 없는 법령·조문·숫자·절차는 지어내지 말고, 근거가 부족하면 "등록된 자료만으로는 확인 불가"라고 쓰세요.
- 답변에 반드시 근거로 사용한 문서 제목과, 근거 블록에 표시된 [위치: …] (있을 때만)를 명시하세요.
- 조문 번호는 검색 근거에 실제로 나타난 것만 인용하세요.
SYS;
    $userBlock = <<<USR
질문:
{$question}

검색된 근거:
{$contextText}

출력 형식(한국어):
【결론】 한 단락으로 요약

【근거】 번호 목록. 각 항목에 (문서명) (위치 힌트가 있으면 제○조 등) + 요지 한 줄

【추가 확인】 자료 밖의 사항이나 판단이 필요하면 여기에
USR;
    try {
        $answer = ask_ai($instr, $userBlock);
    } catch (Throwable $e) {
        json_response([
            "error" => $e->getMessage(),
        ], 502);
        exit;
    }
    json_response([
        "answer" => $answer,
        "citations" => $citationObjs,
        "citation_strings" => $contextLines,
    ]);
    exit;
}

if ($method === "POST" && $path === "/api/meeting/transcribe") {
    if (!isset($_FILES["audio"])) {
        json_response(["error" => "audio file is required"], 400);
        exit;
    }
    $audio = $_FILES["audio"];
    if (($audio["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_response(["error" => "audio upload failed"], 400);
        exit;
    }
    $text = transcribe_audio_file($audio["tmp_name"], (string)($audio["type"] ?? "audio/mpeg"));
    json_response(["transcript" => $text]);
    exit;
}

if ($method === "POST" && $path === "/api/meeting/summarize") {
    $body = json_body();
    $transcript = trim((string)($body["transcript"] ?? ""));
    $title = trim((string)($body["title"] ?? "회의"));
    if ($transcript === "") {
        json_response(["error" => "transcript is required"], 400);
        exit;
    }
    $summary = ask_ai(
        "당신은 회의록 전문 정리 비서입니다. 한국어로 간결하고 실행 중심으로 요약하세요.",
        "다음 회의 대화록을 요약해 주세요.\n\n" . $transcript . "\n\n출력 형식:\n- 핵심 요약(5줄 이내)\n- 결정사항\n- TODO(담당/기한 없으면 미정)\n- 리스크/쟁점"
    );
    $insert = $pdo->prepare("INSERT INTO meeting_logs (user_id, title, transcript, summary, created_at) VALUES (:user_id, :title, :transcript, :summary, :created_at)");
    $insert->execute([
        ":user_id" => (int)$user["id"],
        ":title" => $title,
        ":transcript" => $transcript,
        ":summary" => $summary,
        ":created_at" => date("c"),
    ]);
    json_response(["summary" => $summary]);
    exit;
}

if ($method === "GET" && $path === "/api/meeting/logs") {
    $stmt = $pdo->prepare("SELECT id, title, summary, created_at FROM meeting_logs WHERE user_id = :user_id ORDER BY id DESC LIMIT 20");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    json_response(["logs" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "GET" && $path === "/api/hr/employees") {
    $stmt = $pdo->prepare("SELECT * FROM employees WHERE user_id = :user_id ORDER BY contract_end ASC");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    json_response(["employees" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/hr/employees") {
    $body = json_body();
    $insert = $pdo->prepare("INSERT INTO employees (user_id, name, phone, contract_end, promotion_due, notes) VALUES (:user_id, :name, :phone, :contract_end, :promotion_due, :notes)");
    $insert->execute([
        ":user_id" => (int)$user["id"],
        ":name" => (string)($body["name"] ?? ""),
        ":phone" => (string)($body["phone"] ?? ""),
        ":contract_end" => (string)($body["contract_end"] ?? ""),
        ":promotion_due" => (string)($body["promotion_due"] ?? ""),
        ":notes" => (string)($body["notes"] ?? ""),
    ]);
    json_response(["ok" => true], 201);
    exit;
}

if ($method === "GET" && $path === "/api/hr/alerts") {
    $today = new DateTimeImmutable("today");
    $limit = $today->modify("+30 days")->format("Y-m-d");
    $stmt = $pdo->prepare("SELECT id, name, contract_end, promotion_due FROM employees WHERE user_id = :user_id AND (contract_end <= :limit OR promotion_due <= :limit)");
    $stmt->execute([":user_id" => (int)$user["id"], ":limit" => $limit]);
    json_response(["alerts" => $stmt->fetchAll(PDO::FETCH_ASSOC), "limitDate" => $limit]);
    exit;
}

if ($method === "GET" && $path === "/api/budget/items") {
    $stmt = $pdo->prepare("SELECT * FROM budget_items WHERE user_id = :user_id ORDER BY id DESC");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    json_response(["items" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/budget/items") {
    $body = json_body();
    $insert = $pdo->prepare("INSERT INTO budget_items (user_id, type, category, title, amount, meeting_date, notes) VALUES (:user_id, :type, :category, :title, :amount, :meeting_date, :notes)");
    $insert->execute([
        ":user_id" => (int)$user["id"],
        ":type" => (string)($body["type"] ?? "expense"),
        ":category" => (string)($body["category"] ?? ""),
        ":title" => (string)($body["title"] ?? ""),
        ":amount" => (float)($body["amount"] ?? 0),
        ":meeting_date" => (string)($body["meeting_date"] ?? ""),
        ":notes" => (string)($body["notes"] ?? ""),
    ]);
    json_response(["ok" => true], 201);
    exit;
}

if ($method === "GET" && $path === "/api/budget/summary") {
    $stmt = $pdo->prepare("
        SELECT
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
        FROM budget_items
        WHERE user_id = :user_id
    ");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ["total_income" => 0, "total_expense" => 0];
    $income = (float)($row["total_income"] ?? 0);
    $expense = (float)($row["total_expense"] ?? 0);
    json_response(["income" => $income, "expense" => $expense, "balance" => $income - $expense]);
    exit;
}

if ($method === "GET" && $path === "/api/board/items") {
    $stmt = $pdo->prepare("SELECT * FROM board_items WHERE user_id = :user_id ORDER BY id DESC");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    json_response(["items" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/board/items") {
    $body = json_body();
    $insert = $pdo->prepare("INSERT INTO board_items (user_id, title, status, due_date, notes) VALUES (:user_id, :title, :status, :due_date, :notes)");
    $insert->execute([
        ":user_id" => (int)$user["id"],
        ":title" => (string)($body["title"] ?? ""),
        ":status" => (string)($body["status"] ?? "todo"),
        ":due_date" => (string)($body["due_date"] ?? ""),
        ":notes" => (string)($body["notes"] ?? ""),
    ]);
    json_response(["ok" => true], 201);
    exit;
}

if ($method === "GET" && $path === "/api/org/nodes") {
    $stmt = $pdo->prepare("SELECT * FROM org_nodes WHERE user_id = :user_id ORDER BY sort_order ASC, id ASC");
    $stmt->execute([":user_id" => (int)$user["id"]]);
    json_response(["nodes" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/org/nodes") {
    $body = json_body();
    $insert = $pdo->prepare("INSERT INTO org_nodes (user_id, name, role, parent_id, phone, sort_order) VALUES (:user_id, :name, :role, :parent_id, :phone, :sort_order)");
    $parent = $body["parent_id"] ?? null;
    $insert->execute([
        ":user_id" => (int)$user["id"],
        ":name" => (string)($body["name"] ?? ""),
        ":role" => (string)($body["role"] ?? ""),
        ":parent_id" => $parent === "" ? null : $parent,
        ":phone" => (string)($body["phone"] ?? ""),
        ":sort_order" => (int)($body["sort_order"] ?? 0),
    ]);
    json_response(["ok" => true], 201);
    exit;
}

$userId = $user ? (int)$user["id"] : 0;

if ($method === "GET" && $path === "/api/compliance/workflows") {
    $stmt = $pdo->prepare("
        SELECT w.*, (SELECT COUNT(*) FROM compliance_workflow_steps s WHERE s.workflow_id = w.id) AS step_count
        FROM compliance_workflows w
        WHERE w.user_id = :user_id
        ORDER BY w.id DESC
    ");
    $stmt->execute([":user_id" => $userId]);
    json_response(["workflows" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/compliance/workflows") {
    $body = json_body();
    $name = trim((string)($body["name"] ?? ""));
    if ($name === "") {
        json_response(["error" => "name is required"], 400);
        exit;
    }
    $description = trim((string)($body["description"] ?? ""));
    $category = trim((string)($body["category"] ?? ""));
    $stepsIn = $body["steps"] ?? null;
    $pdo->beginTransaction();
    try {
        $insW = $pdo->prepare("INSERT INTO compliance_workflows (user_id, name, description, category, created_at) VALUES (:user_id, :name, :description, :category, :created_at)");
        $insW->execute([
            ":user_id" => $userId,
            ":name" => $name,
            ":description" => $description,
            ":category" => $category,
            ":created_at" => date("c"),
        ]);
        $workflowId = (int)$pdo->lastInsertId();
        if (is_array($stepsIn)) {
            compliance_insert_steps($pdo, $workflowId, $stepsIn);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_response(["error" => "저장 실패: " . $e->getMessage()], 500);
        exit;
    }
    json_response(["ok" => true, "id" => $workflowId], 201);
    exit;
}

if ($method === "GET" && preg_match("#^/api/compliance/workflows/(\\d+)$#", $path, $m)) {
    $workflowId = (int)$m[1];
    $stmt = $pdo->prepare("SELECT * FROM compliance_workflows WHERE id = :id AND user_id = :user_id");
    $stmt->execute([":id" => $workflowId, ":user_id" => $userId]);
    $wf = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$wf) {
        json_response(["error" => "Not found"], 404);
        exit;
    }
    $st = $pdo->prepare("SELECT * FROM compliance_workflow_steps WHERE workflow_id = :wid ORDER BY sort_order ASC, id ASC");
    $st->execute([":wid" => $workflowId]);
    json_response(["workflow" => $wf, "steps" => $st->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && preg_match("#^/api/compliance/workflows/(\\d+)/steps$#", $path, $m)) {
    $workflowId = (int)$m[1];
    $stmt = $pdo->prepare("SELECT id FROM compliance_workflows WHERE id = :id AND user_id = :user_id");
    $stmt->execute([":id" => $workflowId, ":user_id" => $userId]);
    if (!$stmt->fetch()) {
        json_response(["error" => "Not found"], 404);
        exit;
    }
    $body = json_body();
    $stepsIn = $body["steps"] ?? null;
    if (is_array($stepsIn) && count($stepsIn) > 0) {
        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM compliance_workflow_steps WHERE workflow_id = :wid")->execute([":wid" => $workflowId]);
            compliance_insert_steps($pdo, $workflowId, $stepsIn);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_response(["error" => "저장 실패: " . $e->getMessage()], 500);
            exit;
        }
        json_response(["ok" => true]);
        exit;
    }
    $title = trim((string)($body["title"] ?? ""));
    if ($title === "") {
        json_response(["error" => "title or steps[] is required"], 400);
        exit;
    }
    $max = $pdo->prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM compliance_workflow_steps WHERE workflow_id = :wid");
    $max->execute([":wid" => $workflowId]);
    $row = $max->fetch(PDO::FETCH_ASSOC);
    $sort = (int)($row["m"]) + 1;
    compliance_insert_single_step($pdo, $workflowId, $sort, $body);
    json_response(["ok" => true, "id" => (int)$pdo->lastInsertId()], 201);
    exit;
}

if ($method === "GET" && $path === "/api/compliance/runs") {
    $wfFilter = isset($_GET["workflow_id"]) ? (int)$_GET["workflow_id"] : 0;
    if ($wfFilter > 0) {
        $stmt = $pdo->prepare("
            SELECT r.*, w.name AS workflow_name
            FROM compliance_workflow_runs r
            JOIN compliance_workflows w ON w.id = r.workflow_id
            WHERE r.user_id = :user_id AND r.workflow_id = :wid
            ORDER BY r.id DESC
        ");
        $stmt->execute([":user_id" => $userId, ":wid" => $wfFilter]);
    } else {
        $stmt = $pdo->prepare("
            SELECT r.*, w.name AS workflow_name
            FROM compliance_workflow_runs r
            JOIN compliance_workflows w ON w.id = r.workflow_id
            WHERE r.user_id = :user_id
            ORDER BY r.id DESC
        ");
        $stmt->execute([":user_id" => $userId]);
    }
    json_response(["runs" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "POST" && $path === "/api/compliance/runs") {
    $body = json_body();
    $workflowId = (int)($body["workflow_id"] ?? 0);
    $anchorDate = trim((string)($body["anchor_date"] ?? ""));
    $runLabel = trim((string)($body["run_label"] ?? ""));
    if ($workflowId < 1 || $anchorDate === "") {
        json_response(["error" => "workflow_id and anchor_date are required"], 400);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id FROM compliance_workflows WHERE id = :id AND user_id = :user_id");
    $stmt->execute([":id" => $workflowId, ":user_id" => $userId]);
    if (!$stmt->fetch()) {
        json_response(["error" => "workflow not found"], 404);
        exit;
    }
    $st = $pdo->prepare("SELECT * FROM compliance_workflow_steps WHERE workflow_id = :wid ORDER BY sort_order ASC, id ASC");
    $st->execute([":wid" => $workflowId]);
    $steps = $st->fetchAll(PDO::FETCH_ASSOC);
    if (count($steps) === 0) {
        json_response(["error" => "워크플로에 단계가 없습니다."], 400);
        exit;
    }
    $pdo->beginTransaction();
    try {
        $insR = $pdo->prepare("INSERT INTO compliance_workflow_runs (user_id, workflow_id, anchor_date, run_label, created_at) VALUES (:user_id, :workflow_id, :anchor_date, :run_label, :created_at)");
        $insR->execute([
            ":user_id" => $userId,
            ":workflow_id" => $workflowId,
            ":anchor_date" => $anchorDate,
            ":run_label" => $runLabel,
            ":created_at" => date("c"),
        ]);
        $runId = (int)$pdo->lastInsertId();
        $insRs = $pdo->prepare("INSERT INTO compliance_run_steps (run_id, workflow_step_id, title_snapshot, due_date, completed_at, notes) VALUES (:run_id, :workflow_step_id, :title_snapshot, :due_date, :completed_at, :notes)");
        foreach ($steps as $step) {
            $due = compliance_due_date_for_step($anchorDate, $step);
            $insRs->execute([
                ":run_id" => $runId,
                ":workflow_step_id" => (int)$step["id"],
                ":title_snapshot" => (string)$step["title"],
                ":due_date" => $due,
                ":completed_at" => null,
                ":notes" => "",
            ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_response(["error" => "실행 생성 실패: " . $e->getMessage()], 500);
        exit;
    }
    json_response(["ok" => true, "runId" => $runId], 201);
    exit;
}

if ($method === "GET" && preg_match("#^/api/compliance/runs/(\\d+)$#", $path, $m)) {
    $runId = (int)$m[1];
    $stmt = $pdo->prepare("
        SELECT r.*, w.name AS workflow_name
        FROM compliance_workflow_runs r
        JOIN compliance_workflows w ON w.id = r.workflow_id
        WHERE r.id = :rid AND r.user_id = :user_id
    ");
    $stmt->execute([":rid" => $runId, ":user_id" => $userId]);
    $run = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$run) {
        json_response(["error" => "Not found"], 404);
        exit;
    }
    $st = $pdo->prepare("SELECT * FROM compliance_run_steps WHERE run_id = :rid ORDER BY id ASC");
    $st->execute([":rid" => $runId]);
    json_response(["run" => $run, "steps" => $st->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($method === "GET" && $path === "/api/compliance/dashboard") {
    $days = max(1, min(90, (int)($_GET["days"] ?? 7)));
    $today = new DateTimeImmutable("today");
    $end = $today->modify("+{$days} days")->format("Y-m-d");
    $stmt = $pdo->prepare("
        SELECT
            rs.id,
            rs.title_snapshot,
            rs.due_date,
            rs.completed_at,
            rs.notes,
            r.id AS run_id,
            r.run_label,
            r.anchor_date,
            w.name AS workflow_name
        FROM compliance_run_steps rs
        JOIN compliance_workflow_runs r ON r.id = rs.run_id
        JOIN compliance_workflows w ON w.id = r.workflow_id
        WHERE r.user_id = :user_id
          AND rs.completed_at IS NULL
          AND (rs.due_date IS NULL OR rs.due_date <= :end_limit)
        ORDER BY
            CASE WHEN rs.due_date IS NULL THEN 1 ELSE 0 END,
            rs.due_date ASC,
            rs.id ASC
    ");
    $stmt->execute([":user_id" => $userId, ":end_limit" => $end]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $todayStr = $today->format("Y-m-d");
    foreach ($items as &$row) {
        $d = $row["due_date"] ?? null;
        $row["status"] = "open";
        if ($d !== null && $d !== "" && $d < $todayStr) {
            $row["status"] = "overdue";
        } elseif ($d === $todayStr) {
            $row["status"] = "due_today";
        }
    }
    unset($row);
    json_response(["items" => $items, "today" => $todayStr, "windowEnd" => $end]);
    exit;
}

if (($method === "PATCH" || $method === "POST") && preg_match("#^/api/compliance/run-steps/(\\d+)$#", $path, $m)) {
    $rsId = (int)$m[1];
    $body = json_body();
    $stmt = $pdo->prepare("
        SELECT rs.id
        FROM compliance_run_steps rs
        JOIN compliance_workflow_runs r ON r.id = rs.run_id
        WHERE rs.id = :id AND r.user_id = :user_id
    ");
    $stmt->execute([":id" => $rsId, ":user_id" => $userId]);
    if (!$stmt->fetch()) {
        json_response(["error" => "Not found"], 404);
        exit;
    }
    $completed = $body["completed"] ?? null;
    $notes = array_key_exists("notes", $body) ? (string)$body["notes"] : null;
    if ($completed === null && $notes === null) {
        json_response(["error" => "completed or notes required"], 400);
        exit;
    }
    $fields = [];
    $params = [":id" => $rsId];
    if ($completed !== null) {
        $fields[] = "completed_at = :completed_at";
        $params[":completed_at"] = filter_var($completed, FILTER_VALIDATE_BOOLEAN) ? date("c") : null;
    }
    if ($notes !== null) {
        $fields[] = "notes = :notes";
        $params[":notes"] = $notes;
    }
    if (count($fields) === 0) {
        json_response(["error" => "nothing to update"], 400);
        exit;
    }
    $sql = "UPDATE compliance_run_steps SET " . implode(", ", $fields) . " WHERE id = :id";
    $upd = $pdo->prepare($sql);
    $upd->execute($params);
    json_response(["ok" => true]);
    exit;
}

if ($method === "POST" && $path === "/api/compliance/suggest-steps") {
    $body = json_body();
    $documentId = (int)($body["document_id"] ?? 0);
    if ($documentId < 1) {
        json_response(["error" => "document_id is required"], 400);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id, title, content FROM documents WHERE id = :id AND user_id = :user_id AND kind = 'regulation'");
    $stmt->execute([":id" => $documentId, ":user_id" => $userId]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$doc) {
        json_response(["error" => "document not found"], 404);
        exit;
    }
    $content = (string)$doc["content"];
    $snippet = mb_strlen($content, "UTF-8") > 14000 ? mb_substr($content, 0, 14000, "UTF-8") : $content;
    $title = (string)$doc["title"];
    $prompt = <<<PROMPT
다음은 규정/절차 문서 일부입니다. 행정·의회 업무 수행에 필요한 절차 단계를 추출하세요.

출력은 반드시 JSON 배열만 (앞뒤 설명 금지). 각 원소 형식:
{"title":"단계 제목","body":"할 일 요약","due_rule":"none|after|before|annual","offset_days":0,"annual_month":null,"annual_day":null}

due_rule: none(기한 없음), after(앵커일+N일), before(앵커일-N일), annual(앵커 연도의 월일)
annual인 경우 annual_month(1-12), annual_day(1-31) 설정. after/before는 offset_days 양의 정수.

문서 제목: {$title}

문서 본문:
{$snippet}
PROMPT;
    $raw = ask_ai(
        "당신은 공공기관 규정 분석가입니다. 반드시 유효한 JSON 배열만 출력하세요.",
        $prompt
    );
    $decoded = json_decode(trim($raw), true);
    $steps = [];
    if (is_array($decoded)) {
        foreach ($decoded as $row) {
            if (!is_array($row)) {
                continue;
            }
            $steps[] = [
                "title" => (string)($row["title"] ?? ""),
                "body" => (string)($row["body"] ?? ""),
                "due_rule" => (string)($row["due_rule"] ?? "none"),
                "offset_days" => (int)($row["offset_days"] ?? 0),
                "annual_month" => $row["annual_month"] ?? null,
                "annual_day" => $row["annual_day"] ?? null,
                "document_id" => $documentId,
            ];
        }
    }
    json_response(["steps" => $steps, "raw" => $raw]);
    exit;
}

if ($method === "GET" && $path === "/api/system/backup") {
    $user = require_user();
    $userId = (int)$user["id"];
    $tables = [
        "settings",
        "documents",
        "doc_chunks",
        "meeting_logs",
        "employees",
        "budget_items",
        "board_items",
        "org_nodes",
        "compliance_workflows",
        "compliance_workflow_steps",
        "compliance_workflow_runs",
        "compliance_run_steps",
    ];
    $backup = [
        "meta" => [
            "exported_at" => date("c"),
            "user_id" => $userId,
        ],
        "tables" => [],
    ];

    foreach ($tables as $table) {
        if ($table === "doc_chunks") {
            $sql = "SELECT dc.* FROM doc_chunks dc JOIN documents d ON d.id = dc.document_id WHERE d.user_id = :user_id";
        } elseif ($table === "compliance_workflow_steps") {
            $sql = "SELECT s.* FROM compliance_workflow_steps s JOIN compliance_workflows w ON w.id = s.workflow_id WHERE w.user_id = :user_id";
        } elseif ($table === "compliance_run_steps") {
            $sql = "SELECT rs.* FROM compliance_run_steps rs JOIN compliance_workflow_runs r ON r.id = rs.run_id WHERE r.user_id = :user_id";
        } else {
            $sql = "SELECT * FROM {$table} WHERE user_id = :user_id";
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute([":user_id" => $userId]);
        $backup["tables"][$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    json_response(["backup" => $backup]);
    exit;
}

if ($method === "POST" && $path === "/api/system/restore") {
    $user = require_user();
    $userId = (int)$user["id"];
    $body = json_body();
    $tables = $body["tables"] ?? null;
    if (!is_array($tables)) {
        json_response(["error" => "tables 데이터가 필요합니다."], 400);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $docMap = [];
        $pdo->prepare("DELETE FROM compliance_run_steps WHERE run_id IN (SELECT id FROM compliance_workflow_runs WHERE user_id = :user_id)")->execute([":user_id" => $userId]);
        $pdo->prepare("DELETE FROM compliance_workflow_runs WHERE user_id = :user_id")->execute([":user_id" => $userId]);
        $pdo->prepare("DELETE FROM compliance_workflow_steps WHERE workflow_id IN (SELECT id FROM compliance_workflows WHERE user_id = :user_id)")->execute([":user_id" => $userId]);
        $pdo->prepare("DELETE FROM compliance_workflows WHERE user_id = :user_id")->execute([":user_id" => $userId]);
        $pdo->prepare("DELETE FROM doc_chunks WHERE document_id IN (SELECT id FROM documents WHERE user_id = :user_id)")->execute([":user_id" => $userId]);
        foreach (["documents", "meeting_logs", "employees", "budget_items", "board_items", "org_nodes", "settings"] as $table) {
            $pdo->prepare("DELETE FROM {$table} WHERE user_id = :user_id")->execute([":user_id" => $userId]);
        }

        if (isset($tables["documents"]) && is_array($tables["documents"])) {
            $insertDoc = $pdo->prepare("INSERT INTO documents (user_id, title, kind, content, created_at) VALUES (:user_id, :title, :kind, :content, :created_at)");
            foreach ($tables["documents"] as $row) {
                $insertDoc->execute([
                    ":user_id" => $userId,
                    ":title" => (string)($row["title"] ?? ""),
                    ":kind" => (string)($row["kind"] ?? "regulation"),
                    ":content" => (string)($row["content"] ?? ""),
                    ":created_at" => (string)($row["created_at"] ?? date("c")),
                ]);
                $docMap[(string)($row["id"] ?? "")] = (int)$pdo->lastInsertId();
            }
            if (isset($tables["doc_chunks"]) && is_array($tables["doc_chunks"])) {
                $insertChunk = $pdo->prepare("INSERT INTO doc_chunks (document_id, chunk_index, content, keywords, ref_hint) VALUES (:document_id, :chunk_index, :content, :keywords, :ref_hint)");
                foreach ($tables["doc_chunks"] as $chunk) {
                    $oldDocId = (string)($chunk["document_id"] ?? "");
                    if (!isset($docMap[$oldDocId])) {
                        continue;
                    }
                    $insertChunk->execute([
                        ":document_id" => $docMap[$oldDocId],
                        ":chunk_index" => (int)($chunk["chunk_index"] ?? 0),
                        ":content" => (string)($chunk["content"] ?? ""),
                        ":keywords" => (string)($chunk["keywords"] ?? ""),
                        ":ref_hint" => (string)($chunk["ref_hint"] ?? ""),
                    ]);
                }
            }
        }

        if (isset($tables["compliance_workflows"]) && is_array($tables["compliance_workflows"])) {
            $wfMap = [];
            $insertWf = $pdo->prepare("INSERT INTO compliance_workflows (user_id, name, description, category, created_at) VALUES (:user_id, :name, :description, :category, :created_at)");
            foreach ($tables["compliance_workflows"] as $row) {
                $insertWf->execute([
                    ":user_id" => $userId,
                    ":name" => (string)($row["name"] ?? ""),
                    ":description" => (string)($row["description"] ?? ""),
                    ":category" => (string)($row["category"] ?? ""),
                    ":created_at" => (string)($row["created_at"] ?? date("c")),
                ]);
                $wfMap[(string)($row["id"] ?? "")] = (int)$pdo->lastInsertId();
            }
            $stepMap = [];
            if (isset($tables["compliance_workflow_steps"]) && is_array($tables["compliance_workflow_steps"])) {
                $insertStep = $pdo->prepare("
                    INSERT INTO compliance_workflow_steps (workflow_id, sort_order, title, body, due_rule, offset_days, annual_month, annual_day, document_id)
                    VALUES (:workflow_id, :sort_order, :title, :body, :due_rule, :offset_days, :annual_month, :annual_day, :document_id)
                ");
                foreach ($tables["compliance_workflow_steps"] as $row) {
                    $oldWf = (string)($row["workflow_id"] ?? "");
                    if (!isset($wfMap[$oldWf])) {
                        continue;
                    }
                    $oldDocId = $row["document_id"] ?? null;
                    $newDoc = null;
                    if ($oldDocId !== null && $oldDocId !== "" && isset($docMap[(string)$oldDocId])) {
                        $newDoc = $docMap[(string)$oldDocId];
                    }
                    $insertStep->execute([
                        ":workflow_id" => $wfMap[$oldWf],
                        ":sort_order" => (int)($row["sort_order"] ?? 0),
                        ":title" => (string)($row["title"] ?? ""),
                        ":body" => (string)($row["body"] ?? ""),
                        ":due_rule" => (string)($row["due_rule"] ?? "none"),
                        ":offset_days" => (int)($row["offset_days"] ?? 0),
                        ":annual_month" => $row["annual_month"] ?? null,
                        ":annual_day" => $row["annual_day"] ?? null,
                        ":document_id" => $newDoc,
                    ]);
                    $stepMap[(string)($row["id"] ?? "")] = (int)$pdo->lastInsertId();
                }
            }
            if (isset($tables["compliance_workflow_runs"]) && is_array($tables["compliance_workflow_runs"])) {
                $runMap = [];
                $insertRun = $pdo->prepare("
                    INSERT INTO compliance_workflow_runs (user_id, workflow_id, anchor_date, run_label, created_at)
                    VALUES (:user_id, :workflow_id, :anchor_date, :run_label, :created_at)
                ");
                foreach ($tables["compliance_workflow_runs"] as $row) {
                    $oldWf = (string)($row["workflow_id"] ?? "");
                    if (!isset($wfMap[$oldWf])) {
                        continue;
                    }
                    $insertRun->execute([
                        ":user_id" => $userId,
                        ":workflow_id" => $wfMap[$oldWf],
                        ":anchor_date" => (string)($row["anchor_date"] ?? ""),
                        ":run_label" => (string)($row["run_label"] ?? ""),
                        ":created_at" => (string)($row["created_at"] ?? date("c")),
                    ]);
                    $runMap[(string)($row["id"] ?? "")] = (int)$pdo->lastInsertId();
                }
                if (isset($tables["compliance_run_steps"]) && is_array($tables["compliance_run_steps"])) {
                    $insertRs = $pdo->prepare("
                        INSERT INTO compliance_run_steps (run_id, workflow_step_id, title_snapshot, due_date, completed_at, notes)
                        VALUES (:run_id, :workflow_step_id, :title_snapshot, :due_date, :completed_at, :notes)
                    ");
                    foreach ($tables["compliance_run_steps"] as $row) {
                        $oldRun = (string)($row["run_id"] ?? "");
                        $oldStep = (string)($row["workflow_step_id"] ?? "");
                        if (!isset($runMap[$oldRun]) || !isset($stepMap[$oldStep])) {
                            continue;
                        }
                        $insertRs->execute([
                            ":run_id" => $runMap[$oldRun],
                            ":workflow_step_id" => $stepMap[$oldStep],
                            ":title_snapshot" => (string)($row["title_snapshot"] ?? ""),
                            ":due_date" => $row["due_date"] ?? null,
                            ":completed_at" => $row["completed_at"] ?? null,
                            ":notes" => (string)($row["notes"] ?? ""),
                        ]);
                    }
                }
            }
        }

        $simpleTables = [
            "meeting_logs" => ["title", "transcript", "summary", "created_at"],
            "employees" => ["name", "phone", "contract_end", "promotion_due", "notes"],
            "budget_items" => ["type", "category", "title", "amount", "meeting_date", "notes"],
            "board_items" => ["title", "status", "due_date", "notes"],
            "org_nodes" => ["name", "role", "parent_id", "phone", "sort_order"],
            "settings" => ["setting_key", "setting_value", "created_at"],
        ];

        foreach ($simpleTables as $table => $columns) {
            if (!isset($tables[$table]) || !is_array($tables[$table])) {
                continue;
            }
            $colSql = implode(", ", array_merge(["user_id"], $columns));
            $valSql = implode(", ", array_map(fn($c) => ":" . $c, array_merge(["user_id"], $columns)));
            $insert = $pdo->prepare("INSERT INTO {$table} ({$colSql}) VALUES ({$valSql})");
            foreach ($tables[$table] as $row) {
                $params = [":user_id" => $userId];
                foreach ($columns as $col) {
                    $params[":" . $col] = $row[$col] ?? "";
                }
                $insert->execute($params);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_response(["error" => "복구 실패: " . $e->getMessage()], 500);
        exit;
    }

    json_response(["ok" => true]);
    exit;
}

json_response(["error" => "Not found"], 404);
