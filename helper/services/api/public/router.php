<?php

declare(strict_types=1);

/**
 * PHP built-in server (php -S) 는 기본적으로 /api/... 경로를 index.php 로 넘기지 않습니다.
 * 이 스크립트를 라우터로 쓰면 모든 요청이 public/index.php 로 들어갑니다.
 *
 * 실행 예 (services/api 디렉터리에서):
 *   php -S localhost:8080 -t public public/router.php
 */

$uri = urldecode((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

if ($uri !== '/' && $uri !== '' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

require __DIR__ . '/index.php';
