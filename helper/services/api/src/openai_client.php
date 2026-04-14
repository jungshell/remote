<?php

declare(strict_types=1);

require_once __DIR__ . "/gemini_curl.php";

function ai_provider(): string
{
    $provider = getenv("AI_PROVIDER");
    if ($provider !== false && trim($provider) !== "") {
        return strtolower(trim($provider));
    }
    $key = getenv("GEMINI_API_KEY");
    if ($key !== false && trim($key) !== "") {
        return "gemini";
    }
    return "ollama";
}

function ollama_base_url(): string
{
    $baseUrl = getenv("OLLAMA_BASE_URL");
    return $baseUrl ? rtrim($baseUrl, "/") : "http://localhost:11434";
}

function ollama_model(): string
{
    $model = getenv("OLLAMA_MODEL");
    return $model ? trim($model) : "llama3.1:8b";
}

function ask_ai(string $systemPrompt, string $userPrompt): string
{
    $p = ai_provider();
    if ($p === "gemini") {
        return gemini_chat_completion($systemPrompt, $userPrompt);
    }
    if ($p !== "ollama") {
        throw new RuntimeException("AI_PROVIDER 는 gemini 또는 ollama 여야 합니다.");
    }

    $payload = [
        "model" => ollama_model(),
        "stream" => false,
        "messages" => [
            ["role" => "system", "content" => $systemPrompt],
            ["role" => "user", "content" => $userPrompt],
        ],
        "options" => [
            "temperature" => 0.2,
        ],
    ];

    $ch = curl_init(ollama_base_url() . "/api/chat");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));

    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException("Ollama 요청 실패: " . $err);
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException("Ollama 요청 HTTP " . $httpCode . ": " . $response);
    }

    $json = json_decode($response, true);
    return $json["message"]["content"] ?? "";
}

function transcribe_audio_file(string $filePath, string $mimeType): string
{
    $cmd = getenv("WHISPER_CPP_CMD");
    if (!$cmd) {
        throw new RuntimeException("무료 STT를 위해 WHISPER_CPP_CMD 환경변수를 설정하세요.");
    }
    if (!file_exists($filePath)) {
        throw new RuntimeException("오디오 파일을 찾을 수 없습니다.");
    }

    $outputTextPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "stt_" . uniqid("", true) . ".txt";
    $quotedCmd = $cmd
        . " -f " . escapeshellarg($filePath)
        . " -otxt -of " . escapeshellarg(substr($outputTextPath, 0, -4));
    exec($quotedCmd, $lines, $code);
    if ($code !== 0 || !file_exists($outputTextPath)) {
        throw new RuntimeException("STT 변환에 실패했습니다. WHISPER_CPP_CMD 설정을 확인하세요.");
    }
    $content = trim((string) file_get_contents($outputTextPath));
    @unlink($outputTextPath);
    return $content;
}
