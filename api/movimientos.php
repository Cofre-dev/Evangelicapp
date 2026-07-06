<?php
/* API de finanzas: listado + resúmenes para el dashboard (GET),
   crear (POST) y eliminar (POST accion=eliminar). Siempre por iglesia_id. */
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');
$u = requiere_rol_api(['pastor', 'tesorero']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $st = db()->prepare('SELECT * FROM movimientos WHERE iglesia_id = ? ORDER BY fecha DESC, id DESC LIMIT 300');
    $st->execute([$u['iglesia_id']]);
    $movimientos = $st->fetchAll();

    $st = db()->prepare(
        "SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto END),0) AS ingresos,
                COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto END),0) AS egresos
           FROM movimientos WHERE iglesia_id = ?"
    );
    $st->execute([$u['iglesia_id']]);
    $totales = $st->fetch();

    $st = db()->prepare(
        "SELECT categoria, SUM(monto) AS total FROM movimientos
          WHERE iglesia_id = ? AND tipo = 'egreso'
          GROUP BY categoria ORDER BY total DESC LIMIT 8"
    );
    $st->execute([$u['iglesia_id']]);
    $porCategoria = $st->fetchAll();

    $st = db()->prepare(
        "SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes, tipo, SUM(monto) AS total
           FROM movimientos WHERE iglesia_id = ?
          GROUP BY mes, tipo ORDER BY mes DESC LIMIT 24"
    );
    $st->execute([$u['iglesia_id']]);
    $porMes = [];
    foreach (array_reverse($st->fetchAll()) as $f) {
        $porMes[$f['mes']][$f['tipo']] = (float)$f['total'];
    }

    echo json_encode([
        'movimientos'   => $movimientos,
        'totales'       => $totales,
        'por_categoria' => $porCategoria,
        'por_mes'       => $porMes,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true) ?: [];

    if (($d['accion'] ?? '') === 'eliminar') {
        db()->prepare('DELETE FROM movimientos WHERE id = ? AND iglesia_id = ?')
            ->execute([(int)$d['id'], $u['iglesia_id']]);
        echo json_encode(['ok' => true]);
        exit;
    }

    $tipo  = in_array($d['tipo'] ?? '', ['ingreso', 'egreso'], true) ? $d['tipo'] : null;
    $monto = (float)($d['monto'] ?? 0);
    $cat   = trim($d['categoria'] ?? '');
    $fecha = $d['fecha'] ?? '';
    $desc  = trim($d['descripcion'] ?? '') ?: null;

    if (!$tipo || $monto <= 0 || !$cat || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(422);
        echo json_encode(['error' => 'Datos incompletos o inválidos']);
        exit;
    }

    db()->prepare('INSERT INTO movimientos (iglesia_id, tipo, categoria, monto, fecha, descripcion, creado_por) VALUES (?,?,?,?,?,?,?)')
        ->execute([$u['iglesia_id'], $tipo, $cat, $monto, $fecha, $desc, $u['uid']]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
