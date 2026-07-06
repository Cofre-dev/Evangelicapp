<?php
/* API del calendario: listar eventos del mes (GET) y crear evento (POST JSON).
   Todo filtrado por iglesia_id del JWT: nadie ve la agenda de otra iglesia. */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');
$u = requiere_rol_api(['pastor', 'tesorero', 'secretaria', 'otro']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mes = $_GET['mes'] ?? date('Y-m');                    // formato YYYY-MM
    if (!preg_match('/^\d{4}-\d{2}$/', $mes)) { echo '[]'; exit; }

    $st = db()->prepare(
        "SELECT e.*,
                (SELECT COUNT(*) FROM evento_predicadores p WHERE p.evento_id = e.id) AS predicadores,
                (SELECT COUNT(*) FROM evento_predicadores p WHERE p.evento_id = e.id AND p.estado='confirmado') AS confirmados
           FROM eventos e
          WHERE e.iglesia_id = ? AND DATE_FORMAT(e.fecha, '%Y-%m') = ?
          ORDER BY e.fecha, e.hora_inicio"
    );
    $st->execute([$u['iglesia_id'], $mes]);
    echo json_encode($st->fetchAll(), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true) ?: [];

    $tipos = ['Culto', 'Limpieza', 'Reunión', 'Ensayo', 'Visita', 'Otro'];
    $tipo  = in_array($d['tipo'] ?? '', $tipos, true) ? $d['tipo'] : null;
    $fecha = $d['fecha'] ?? '';
    $hora  = $d['hora_inicio'] ?: null;
    $desc  = trim($d['descripcion'] ?? '') ?: null;

    if (!$tipo || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(422);
        echo json_encode(['error' => 'Datos incompletos']);
        exit;
    }

    db()->prepare('INSERT INTO eventos (iglesia_id, tipo, descripcion, fecha, hora_inicio, creado_por) VALUES (?,?,?,?,?,?)')
        ->execute([$u['iglesia_id'], $tipo, $desc, $fecha, $hora, $u['uid']]);
    $eventoId = (int)db()->lastInsertId();

    // Si es un CULTO: registrar predicadores y enviarles el correo de confirmación
    $enviados = 0;
    if ($tipo === 'Culto' && !empty($d['predicadores'])) {
        $st = db()->prepare('SELECT nombre FROM iglesias WHERE id = ?');
        $st->execute([$u['iglesia_id']]);
        $nombreIglesia = $st->fetchColumn();
        $fechaBonita   = date('d-m-Y', strtotime($fecha));

        foreach (array_filter(array_map('trim', explode(',', $d['predicadores']))) as $email) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) continue;
            $token = bin2hex(random_bytes(16));
            db()->prepare('INSERT INTO evento_predicadores (evento_id, email, token) VALUES (?,?,?)')
                ->execute([$eventoId, $email, $token]);

            $si = BASE_URL . "/confirmar.php?t=$token&r=si";
            $no = BASE_URL . "/confirmar.php?t=$token&r=no";
            $html = "
              <div style='font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#F6FAFD;border-radius:12px'>
                <h2 style='color:#2E4459'>Invitación a predicar</h2>
                <p>El pastor de <b>" . e($nombreIglesia) . "</b> te invita a predicar en el culto del
                   <b>$fechaBonita</b>" . ($hora ? " a las <b>" . substr($hora, 0, 5) . "</b>" : '') . ".</p>
                <p style='margin:28px 0'>
                  <a href='$si' style='background:#5A93BE;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none'>Confirmo mi asistencia</a>
                  &nbsp;&nbsp;
                  <a href='$no' style='color:#B06060'>No podré asistir</a>
                </p>
                <p style='color:#6B8299;font-size:13px'>Que Dios te bendiga.</p>
              </div>";
            if (enviar_correo($email, "Invitación a predicar — $nombreIglesia", $html)) $enviados++;
        }
    }

    echo json_encode(['ok' => true, 'id' => $eventoId, 'correos_enviados' => $enviados]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
