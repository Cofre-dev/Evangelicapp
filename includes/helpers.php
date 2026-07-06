<?php
require_once __DIR__ . '/../config/config.php';

/** Escapa HTML (úsalo SIEMPRE al imprimir datos del usuario) */
function e(?string $s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

/** Envía un correo HTML simple con mail(). En producción cambia a SMTP (PHPMailer). */
function enviar_correo(string $para, string $asunto, string $html): bool {
    $cab  = "MIME-Version: 1.0\r\n";
    $cab .= "Content-Type: text/html; charset=UTF-8\r\n";
    $cab .= "From: " . MAIL_FROM . "\r\n";
    return @mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $html, $cab);
}

/** Valida y guarda el logo subido. Devuelve la ruta relativa o null. */
function subir_logo(array $archivo): ?string {
    if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return null;
    if ($archivo['size'] > 2 * 1024 * 1024) return null; // máx 2 MB
    $info = @getimagesize($archivo['tmp_name']);
    $permitidos = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($permitidos[$info[2]])) return null;
    $dir = __DIR__ . '/../uploads/logos';
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $nombre = uniqid('logo_') . '.' . $permitidos[$info[2]];
    if (!move_uploaded_file($archivo['tmp_name'], "$dir/$nombre")) return null;
    return 'uploads/logos/' . $nombre;
}

/** Formatea montos en pesos chilenos */
function clp(float $monto): string {
    return '$' . number_format($monto, 0, ',', '.');
}
