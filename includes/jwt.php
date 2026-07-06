<?php
/* Implementación mínima de JWT HS256 en PHP puro */

function b64u_encode(string $d): string {
    return rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
}

function b64u_decode(string $d): string {
    return base64_decode(strtr($d, '-_', '+/'));
}

function jwt_encode(array $payload, string $secret): string {
    $h = b64u_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $p = b64u_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $s = b64u_encode(hash_hmac('sha256', "$h.$p", $secret, true));
    return "$h.$p.$s";
}

/** Devuelve el payload si el token es válido y no ha expirado, o null */
function jwt_decode(string $jwt, string $secret): ?array {
    $partes = explode('.', $jwt);
    if (count($partes) !== 3) return null;
    [$h, $p, $s] = $partes;
    $firma = b64u_encode(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($firma, $s)) return null;          // firma inválida
    $payload = json_decode(b64u_decode($p), true);
    if (!is_array($payload)) return null;
    if (($payload['exp'] ?? 0) < time()) return null;   // expirado
    return $payload;
}
