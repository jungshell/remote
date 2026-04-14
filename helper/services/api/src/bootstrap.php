<?php

declare(strict_types=1);

/*
 * Windows PHP 기본 설치에서 ext-mbstring 이 꺼져 있으면 mb_* 가 없어 500 이 납니다.
 * 꼭 php.ini 에서 extension=mbstring 켜는 것이 가장 좋고, 없을 때만 아래 폴리필로 동작합니다.
 */
if (!function_exists('mb_strlen')) {
    function mb_strlen(?string $string, ?string $encoding = null): int
    {
        $string ??= '';
        $enc = $encoding !== null ? strtoupper($encoding) : 'UTF-8';
        if ($enc !== 'UTF-8' && $enc !== 'UTF8') {
            return strlen($string);
        }
        if ($string === '') {
            return 0;
        }
        $n = preg_match_all('/./us', $string, $m);
        return $n === false ? strlen($string) : (int)$n;
    }
}

if (!function_exists('mb_substr')) {
    function mb_substr(?string $string, int $start, ?int $length = null, ?string $encoding = null): string
    {
        $string ??= '';
        $enc = $encoding !== null ? strtoupper($encoding) : 'UTF-8';
        if ($enc !== 'UTF-8' && $enc !== 'UTF8') {
            return $length === null ? substr($string, $start) : substr($string, $start, $length);
        }
        $units = preg_split('//u', $string, -1, PREG_SPLIT_NO_EMPTY);
        if ($units === false) {
            return $length === null ? substr($string, $start) : substr($string, $start, $length);
        }
        if ($start < 0) {
            $start = max(0, count($units) + $start);
        }
        $slice = $length === null
            ? array_slice($units, $start)
            : array_slice($units, $start, $length);

        return implode('', $slice);
    }
}

if (!function_exists('mb_strtolower')) {
    function mb_strtolower(?string $string, ?string $encoding = null): string
    {
        $string ??= '';
        return strtolower($string);
    }
}

function env_value(string $key, string $default = ""): string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

class SqliteCompatConnection
{
    private SQLite3 $sqlite;

    public function __construct(string $dbPath)
    {
        $this->sqlite = new SQLite3($dbPath);
        $this->sqlite->busyTimeout(5000);
    }

    public function setAttribute(int $attr, mixed $value): void
    {
    }

    public function exec(string $sql): bool
    {
        return (bool) $this->sqlite->exec($sql);
    }

    public function prepare(string $sql): SqliteCompatStatement
    {
        $stmt = $this->sqlite->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException("SQLite prepare failed: " . $this->sqlite->lastErrorMsg());
        }
        return new SqliteCompatStatement($stmt);
    }

    public function query(string $sql): SqliteCompatResult
    {
        $result = $this->sqlite->query($sql);
        if (!$result) {
            throw new RuntimeException("SQLite query failed: " . $this->sqlite->lastErrorMsg());
        }
        return new SqliteCompatResult($result);
    }

    public function lastInsertId(): int
    {
        return $this->sqlite->lastInsertRowID();
    }

    public function beginTransaction(): void
    {
        $this->sqlite->exec("BEGIN TRANSACTION");
    }

    public function commit(): void
    {
        $this->sqlite->exec("COMMIT");
    }

    public function rollBack(): void
    {
        $this->sqlite->exec("ROLLBACK");
    }
}

class SqliteCompatStatement
{
    private SQLite3Stmt $stmt;
    private ?SQLite3Result $result = null;

    public function __construct(SQLite3Stmt $stmt)
    {
        $this->stmt = $stmt;
    }

    public function execute(array $params = []): bool
    {
        foreach ($params as $key => $value) {
            $name = is_string($key) ? $key : ":" . $key;
            if (!str_starts_with($name, ":")) {
                $name = ":" . $name;
            }
            $type = SQLITE3_TEXT;
            if (is_int($value)) {
                $type = SQLITE3_INTEGER;
            } elseif (is_float($value)) {
                $type = SQLITE3_FLOAT;
            } elseif ($value === null) {
                $type = SQLITE3_NULL;
            }
            $this->stmt->bindValue($name, $value, $type);
        }
        $execResult = $this->stmt->execute();
        if ($execResult instanceof SQLite3Result) {
            $this->result = $execResult;
        } else {
            $this->result = null;
        }
        return true;
    }

    public function fetch(int $mode = 0): array|false
    {
        if (!$this->result) {
            return false;
        }
        $row = $this->result->fetchArray(SQLITE3_ASSOC);
        return $row ?: false;
    }

    public function fetchAll(int $mode = 0): array
    {
        if (!$this->result) {
            return [];
        }
        $rows = [];
        while ($row = $this->result->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }
}

class SqliteCompatResult
{
    private SQLite3Result $result;

    public function __construct(SQLite3Result $result)
    {
        $this->result = $result;
    }

    public function fetch(int $mode = 0): array|false
    {
        $row = $this->result->fetchArray(SQLITE3_ASSOC);
        return $row ?: false;
    }

    public function fetchAll(int $mode = 0): array
    {
        $rows = [];
        while ($row = $this->result->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }
}

function db(): object
{
    static $pdo = null;
    if ($pdo instanceof PDO || $pdo instanceof SqliteCompatConnection) {
        return $pdo;
    }

    $dbPath = env_value("APP_DB_PATH", __DIR__ . "/../storage/app.db");
    $dbDir = dirname($dbPath);
    if (!is_dir($dbDir)) {
        mkdir($dbDir, 0777, true);
    }

    try {
        $pdo = new PDO("sqlite:" . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (Throwable $e) {
        // Fallback for environments where pdo_sqlite fails unexpectedly.
        $pdo = new SqliteCompatConnection($dbPath);
    }
    migrate($pdo);
    seed_default_user($pdo);
    return $pdo;
}

function migrate(object $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            setting_key TEXT NOT NULL,
            setting_value TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            kind TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS doc_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            keywords TEXT NOT NULL,
            ref_hint TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS meeting_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            transcript TEXT NOT NULL,
            summary TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            contract_end TEXT NOT NULL,
            promotion_due TEXT NOT NULL,
            notes TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS budget_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            meeting_date TEXT NOT NULL,
            notes TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS board_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            due_date TEXT NOT NULL,
            notes TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS org_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            parent_id INTEGER,
            phone TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS compliance_workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS compliance_workflow_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '',
            due_rule TEXT NOT NULL DEFAULT 'none',
            offset_days INTEGER NOT NULL DEFAULT 0,
            annual_month INTEGER,
            annual_day INTEGER,
            document_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS compliance_workflow_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            workflow_id INTEGER NOT NULL,
            anchor_date TEXT NOT NULL,
            run_label TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS compliance_run_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            workflow_step_id INTEGER NOT NULL,
            title_snapshot TEXT NOT NULL,
            due_date TEXT,
            completed_at TEXT,
            notes TEXT NOT NULL DEFAULT ''
        );
    ");
    migrate_doc_chunks_ref_hint($pdo);
}

function migrate_doc_chunks_ref_hint(object $pdo): void
{
    $has = false;
    try {
        $stmt = $pdo->query("PRAGMA table_info(doc_chunks)");
        if ($stmt === false) {
            return;
        }
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (($row["name"] ?? "") === "ref_hint") {
                $has = true;
                break;
            }
        }
    } catch (Throwable $e) {
        return;
    }
    if (!$has) {
        try {
            $pdo->exec("ALTER TABLE doc_chunks ADD COLUMN ref_hint TEXT NOT NULL DEFAULT ''");
        } catch (Throwable $e) {
            // 이미 있는 컬럼 등 — 무시
        }
    }
}

/** PDF 등에서 나온 잘못된 바이트 제거( mb_* / JSON 에서 500 방지 ). */
function sanitize_utf8(string $text): string
{
    $text = str_replace("\0", '', $text);
    if ($text === '') {
        return '';
    }
    if (function_exists('iconv')) {
        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $text);
        if ($converted !== false) {
            return $converted;
        }
    }
    return $text;
}

/** @param array{due_rule?:string,offset_days?:int,annual_month?:int|null,annual_day?:int|null} $step */
function compliance_due_date_for_step(string $anchorYmd, array $step): ?string
{
    $rule = $step["due_rule"] ?? "none";
    if ($rule === "none" || $rule === "") {
        return null;
    }
    try {
        $anchor = new DateTimeImmutable($anchorYmd);
    } catch (Throwable $e) {
        return null;
    }
    if ($rule === "after") {
        $n = max(0, (int)($step["offset_days"] ?? 0));
        return $anchor->modify("+{$n} days")->format("Y-m-d");
    }
    if ($rule === "before") {
        $n = max(0, (int)($step["offset_days"] ?? 0));
        return $anchor->modify("-{$n} days")->format("Y-m-d");
    }
    if ($rule === "annual") {
        $y = (int)$anchor->format("Y");
        $m = max(1, min(12, (int)($step["annual_month"] ?? 1)));
        $d = max(1, min(31, (int)($step["annual_day"] ?? 1)));
        if (!checkdate($m, $d, $y)) {
            $last = (new DateTimeImmutable(sprintf("%04d-%02d-01", $y, $m)))->format("t");
            $d = (int)$last;
        }
        return sprintf("%04d-%02d-%02d", $y, $m, $d);
    }
    return null;
}

/** @return array{title:string,body:string,due_rule:string,offset_days:int,annual_month:?int,annual_day:?int,document_id:?int} */
function compliance_normalize_step_row(array $s): array
{
    $rule = (string)($s["due_rule"] ?? "none");
    if (!in_array($rule, ["none", "after", "before", "annual"], true)) {
        $rule = "none";
    }
    $am = $s["annual_month"] ?? null;
    $ad = $s["annual_day"] ?? null;
    return [
        "title" => trim((string)($s["title"] ?? "")),
        "body" => trim((string)($s["body"] ?? "")),
        "due_rule" => $rule,
        "offset_days" => (int)($s["offset_days"] ?? 0),
        "annual_month" => $am !== null && $am !== "" ? (int)$am : null,
        "annual_day" => $ad !== null && $ad !== "" ? (int)$ad : null,
        "document_id" => isset($s["document_id"]) && (int)$s["document_id"] > 0 ? (int)$s["document_id"] : null,
    ];
}

function compliance_insert_steps(object $pdo, int $workflowId, array $stepsIn): void
{
    $ins = $pdo->prepare("
        INSERT INTO compliance_workflow_steps (workflow_id, sort_order, title, body, due_rule, offset_days, annual_month, annual_day, document_id)
        VALUES (:workflow_id, :sort_order, :title, :body, :due_rule, :offset_days, :annual_month, :annual_day, :document_id)
    ");
    $order = 0;
    foreach ($stepsIn as $s) {
        if (!is_array($s)) {
            continue;
        }
        $n = compliance_normalize_step_row($s);
        if ($n["title"] === "") {
            continue;
        }
        $ins->execute([
            ":workflow_id" => $workflowId,
            ":sort_order" => $order,
            ":title" => $n["title"],
            ":body" => $n["body"],
            ":due_rule" => $n["due_rule"],
            ":offset_days" => $n["offset_days"],
            ":annual_month" => $n["annual_month"],
            ":annual_day" => $n["annual_day"],
            ":document_id" => $n["document_id"],
        ]);
        $order++;
    }
}

function compliance_insert_single_step(object $pdo, int $workflowId, int $sortOrder, array $body): void
{
    $n = compliance_normalize_step_row($body);
    $ins = $pdo->prepare("
        INSERT INTO compliance_workflow_steps (workflow_id, sort_order, title, body, due_rule, offset_days, annual_month, annual_day, document_id)
        VALUES (:workflow_id, :sort_order, :title, :body, :due_rule, :offset_days, :annual_month, :annual_day, :document_id)
    ");
    $ins->execute([
        ":workflow_id" => $workflowId,
        ":sort_order" => $sortOrder,
        ":title" => $n["title"],
        ":body" => $n["body"],
        ":due_rule" => $n["due_rule"],
        ":offset_days" => $n["offset_days"],
        ":annual_month" => $n["annual_month"],
        ":annual_day" => $n["annual_day"],
        ":document_id" => $n["document_id"],
    ]);
}

function seed_default_user(object $pdo): void
{
    $stmt = $pdo->query("SELECT COUNT(*) AS cnt FROM users");
    $count = (int) ($stmt->fetch(PDO::FETCH_ASSOC)["cnt"] ?? 0);
    if ($count > 0) {
        return;
    }

    $insert = $pdo->prepare("
        INSERT INTO users (email, password_hash, name, created_at)
        VALUES (:email, :password_hash, :name, :created_at)
    ");
    $insert->execute([
        ":email" => "admin@cnci.local",
        ":password_hash" => password_hash("admin1234", PASSWORD_DEFAULT),
        ":name" => "관리자",
        ":created_at" => date("c"),
    ]);
}

function json_body(): array
{
    $raw = file_get_contents("php://input");
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
}

function issue_token(int $userId): string
{
    $secret = env_value("APP_AUTH_SECRET", "change-me-secret");
    $exp = time() + (60 * 60 * 24 * 7);
    $base = $userId . "." . $exp;
    $sig = hash_hmac("sha256", $base, $secret);
    return $base . "." . $sig;
}

function token_user_id(?string $token): ?int
{
    if (!$token) {
        return null;
    }
    $parts = explode(".", $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$userId, $exp, $sig] = $parts;
    if ((int)$exp < time()) {
        return null;
    }
    $secret = env_value("APP_AUTH_SECRET", "change-me-secret");
    $expected = hash_hmac("sha256", $userId . "." . $exp, $secret);
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    return (int)$userId;
}

function current_user(): ?array
{
    $auth = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
    if (!str_starts_with($auth, "Bearer ")) {
        return null;
    }
    $token = substr($auth, 7);
    $userId = token_user_id($token);
    if (!$userId) {
        return null;
    }
    $stmt = db()->prepare("SELECT id, email, name FROM users WHERE id = :id");
    $stmt->execute([":id" => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user ?: null;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_response(["error" => "Unauthorized"], 401);
        exit;
    }
    return $user;
}

function chunk_text(string $text, int $size = 700): array
{
    $text = trim($text);
    if ($text === "") {
        return [];
    }
    $chunks = [];
    $offset = 0;
    $length = mb_strlen($text, "UTF-8");
    while ($offset < $length) {
        $chunks[] = mb_substr($text, $offset, $size, "UTF-8");
        $offset += $size;
    }
    return $chunks;
}

/** @return list<array{content:string,ref_hint:string}> */
function chunk_text_with_ref_hints(string $text, int $size = 700): array
{
    $text = trim(sanitize_utf8($text));
    if ($text === "") {
        return [];
    }
    $lines = preg_split("/\R/u", $text) ?: [];
    $chapter = "";
    $currentRef = "";
    $chunks = [];
    $buf = "";
    foreach ($lines as $line) {
        if (preg_match("/제\s*(\d+)\s*장/u", $line, $m)) {
            $chapter = "제" . $m[1] . "장";
        }
        if (preg_match("/제\s*(\d+)\s*조/u", $line, $m)) {
            $article = "제" . $m[1] . "조";
            $currentRef = $chapter !== "" ? $chapter . " " . $article : $article;
        }
        $buf .= $line . "\n";
        while (mb_strlen($buf, "UTF-8") > $size) {
            $piece = mb_substr($buf, 0, $size, "UTF-8");
            $chunks[] = ["content" => $piece, "ref_hint" => $currentRef];
            $buf = mb_substr($buf, $size, null, "UTF-8");
        }
    }
    if (trim($buf) !== "") {
        $chunks[] = ["content" => $buf, "ref_hint" => $currentRef];
    }
    return $chunks;
}

function keywords(string $text): string
{
    $text = sanitize_utf8($text);
    $clean = mb_strtolower($text, "UTF-8");
    $clean = preg_replace("/[^\p{L}\p{N}\s]/u", " ", $clean) ?? "";
    $tokens = preg_split("/\s+/u", $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $tokens = array_values(array_unique(array_filter($tokens, fn($w) => mb_strlen($w, "UTF-8") >= 2)));
    return implode(" ", $tokens);
}

function rag_save_chunks(object $pdo, int $docId, string $content): void
{
    $chunks = chunk_text_with_ref_hints($content);
    $insertChunk = $pdo->prepare("INSERT INTO doc_chunks (document_id, chunk_index, content, keywords, ref_hint) VALUES (:document_id, :chunk_index, :content, :keywords, :ref_hint)");
    foreach ($chunks as $idx => $chunkRow) {
        $chunk = $chunkRow["content"];
        $insertChunk->execute([
            ":document_id" => $docId,
            ":chunk_index" => $idx,
            ":content" => $chunk,
            ":keywords" => keywords($chunk),
            ":ref_hint" => $chunkRow["ref_hint"] ?? "",
        ]);
    }
}
