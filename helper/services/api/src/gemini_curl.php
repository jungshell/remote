<?php

declare(strict_types=1);

function http_post_json_fallback(string $url, array $payload, array $headers = []): array
{
    $jsonBody = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($jsonBody === false) {
        throw new RuntimeException("요청 JSON 인코딩 실패");
    }

    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        $allHeaders = array_merge(["Content-Type: application/json"], $headers);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
        $response = curl_exec($ch);
        if ($response === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException("HTTP 요청 실패(curl): " . $err);
        }
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ["status" => $httpCode, "body" => (string)$response];
    }

    if (!function_exists("file_get_contents")) {
        return http_post_json_via_shell_curl($url, $jsonBody, $headers);
    }

    $headerLines = ["Content-Type: application/json"];
    foreach ($headers as $h) {
        $headerLines[] = $h;
    }
    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => implode("\r\n", $headerLines),
            "content" => $jsonBody,
            "timeout" => 60,
            "ignore_errors" => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    $rawHeaders = $http_response_header ?? [];
    $status = 0;
    if (isset($rawHeaders[0]) && preg_match('/\s(\d{3})\s/', (string)$rawHeaders[0], $m)) {
        $status = (int)$m[1];
    }
    if ($response === false) {
        return http_post_json_via_shell_curl($url, $jsonBody, $headers);
    }
    return ["status" => $status, "body" => (string)$response];
}

function http_post_json_via_shell_curl(string $url, string $jsonBody, array $headers = []): array
{
    if (!function_exists("shell_exec")) {
        throw new RuntimeException("HTTP 요청 실패(file_get_contents) + shell_exec 비활성화");
    }
    $tmpFile = tempnam(sys_get_temp_dir(), "gemini_req_");
    if ($tmpFile === false) {
        throw new RuntimeException("임시 파일 생성 실패");
    }
    $written = file_put_contents($tmpFile, $jsonBody);
    if ($written === false) {
        @unlink($tmpFile);
        throw new RuntimeException("임시 요청 파일 쓰기 실패");
    }

    $headerArgs = '-H "Content-Type: application/json"';
    foreach ($headers as $h) {
        $headerArgs .= " -H " . escapeshellarg($h);
    }
    $cmd = "curl.exe -sS -X POST {$headerArgs} --data-binary @" . escapeshellarg($tmpFile)
        . " " . escapeshellarg($url) . " -w \"\n__HTTP_STATUS__:%{http_code}\"";

    $out = shell_exec($cmd);
    @unlink($tmpFile);
    if (!is_string($out) || trim($out) === "") {
        throw new RuntimeException("HTTP 요청 실패(shell curl)");
    }
    $parts = explode("\n__HTTP_STATUS__:", $out);
    $body = $parts[0] ?? "";
    $status = isset($parts[1]) ? (int)trim($parts[1]) : 0;
    return ["status" => $status, "body" => (string)$body];
}

function gemini_chat_completion(string $systemPrompt, string $userPrompt): string
{
    $apiKey = getenv("GEMINI_API_KEY");
    if ($apiKey === false || trim($apiKey) === "") {
        throw new RuntimeException(
            "GEMINI_API_KEY 가 비어 있습니다. services/api/gemini_key.txt 에 한 줄로 넣거나 환경 변수로 설정하세요.",
        );
    }

    $model = getenv("GEMINI_MODEL");
    $model = $model !== false && trim($model) !== "" ? trim($model) : "gemini-2.0-flash";
    $url = "https://generativelanguage.googleapis.com/v1beta/models/" . rawurlencode($model) . ":generateContent?key=" . urlencode(trim($apiKey));

    $payload = [
        "systemInstruction" => [
            "parts" => [
                ["text" => $systemPrompt],
            ],
        ],
        "contents" => [
            [
                "role" => "user",
                "parts" => [
                    ["text" => $userPrompt],
                ],
            ],
        ],
        "generationConfig" => [
            "temperature" => 0.2,
        ],
    ];

    $resp = http_post_json_fallback($url, $payload);
    $httpCode = (int)($resp["status"] ?? 0);
    $response = (string)($resp["body"] ?? "");

    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException("Gemini HTTP {$httpCode}: " . mb_substr((string)$response, 0, 800, "UTF-8"));
    }

    $json = json_decode((string)$response, true);
    if (!is_array($json)) {
        throw new RuntimeException("Gemini 응답 JSON 파싱 실패");
    }

    $candidate = $json["candidates"][0] ?? null;
    if (!is_array($candidate)) {
        throw new RuntimeException("Gemini 응답에 candidates 가 없습니다.");
    }
    $content = $candidate["content"] ?? null;
    if (!is_array($content)) {
        throw new RuntimeException("Gemini 응답에 content 가 없습니다.");
    }
    $parts = $content["parts"] ?? null;
    if (!is_array($parts)) {
        throw new RuntimeException("Gemini 응답에 parts 가 없습니다.");
    }

    $texts = [];
    foreach ($parts as $part) {
        if (is_array($part) && isset($part["text"])) {
            $texts[] = (string)$part["text"];
        }
    }
    $result = trim(implode("\n", $texts));
    if ($result === "") {
        throw new RuntimeException("Gemini 응답 텍스트가 비어 있습니다.");
    }
    return $result;
}
