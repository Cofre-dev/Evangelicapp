<?php
/* Exporta TODOS los movimientos de la iglesia a un archivo que Excel abre
   directamente (CSV con BOM UTF-8 y separador ';' para Excel en español). */
require_once __DIR__ . '/../includes/auth.php';

$u = requiere_rol(['pastor', 'tesorero']);

$st = db()->prepare('SELECT fecha, tipo, categoria, descripcion, monto FROM movimientos WHERE iglesia_id = ? ORDER BY fecha, tipo');
$st->execute([$u['iglesia_id']]);

header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="resumen_finanzas_' . date('Y-m-d') . '.csv"');

$salida = fopen('php://output', 'w');
fwrite($salida, "\xEF\xBB\xBF"); // BOM para que Excel reconozca los acentos
fputcsv($salida, ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto (CLP)'], ';');

$totIn = 0; $totEg = 0;
foreach ($st as $m) {
    $m['tipo'] === 'ingreso' ? $totIn += $m['monto'] : $totEg += $m['monto'];
    fputcsv($salida, [
        date('d-m-Y', strtotime($m['fecha'])),
        ucfirst($m['tipo']),
        $m['categoria'],
        $m['descripcion'],
        $m['monto'],
    ], ';');
}
fputcsv($salida, [], ';');
fputcsv($salida, ['', '', '', 'Total ingresos', $totIn], ';');
fputcsv($salida, ['', '', '', 'Total egresos', $totEg], ';');
fputcsv($salida, ['', '', '', 'Balance', $totIn - $totEg], ';');
fclose($salida);
