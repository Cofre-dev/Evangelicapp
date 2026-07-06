<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/jwt.php';

/** Firma un JWT con los datos del usuario y lo guarda en una cookie httpOnly */
function emitir_token(array $u): void {
    $payload = [
        'uid'          => (int)$u['id'],
        'iglesia_id'   => $u['iglesia_id'] !== null ? (int)$u['iglesia_id'] : null,
        'rol'          => $u['rol'],
        'nombre'       => $u['nombre'],
        'cambiar_pass' => (int)$u['debe_cambiar_password'],
        'exp'          => time() + JWT_DURACION,
    ];
    setcookie('token', jwt_encode($payload, JWT_SECRET), [
        'expires'  => time() + JWT_DURACION,
        'path'     => '/',
        'httponly' => true,      // JS no puede leer la cookie
        'samesite' => 'Lax',
        // 'secure' => true,     // actívalo cuando tengas HTTPS
    ]);
}

/** Payload del usuario logueado, o null si no hay sesión válida */
function usuario_actual(): ?array {
    if (empty($_COOKIE['token'])) return null;
    return jwt_decode($_COOKIE['token'], JWT_SECRET);
}

/** Para páginas: exige uno de los roles o redirige al login */
function requiere_rol(array $roles): array {
    $u = usuario_actual();
    if (!$u) {
        header('Location: ' . BASE_URL . '/index.php');
        exit;
    }
    if (!in_array($u['rol'], $roles, true)) {
        http_response_code(403);
        exit('Acceso denegado para tu rol.');
    }
    return $u;
}

/** Para endpoints API: exige rol o responde 401 en JSON */
function requiere_rol_api(array $roles): array {
    $u = usuario_actual();
    if (!$u || !in_array($u['rol'], $roles, true)) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }
    return $u;
}
