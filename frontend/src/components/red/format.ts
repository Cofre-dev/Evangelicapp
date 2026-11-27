const rtf = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "hace 3 horas", "ayer", "hace 2 semanas"... */
export function formatRelativo(iso: string): string {
  const segundos = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  for (const [unidad, tamaño] of UNIDADES) {
    if (Math.abs(segundos) >= tamaño) return rtf.format(Math.round(segundos / tamaño), unidad);
  }
  return "recién";
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Fechas del operativo: "12 dic 2026", "12 dic 2026 – 14 dic 2026", "Desde…", "Hasta…". */
export function formatRangoOperativo(inicio: string | null, fin: string | null): string | null {
  if (inicio && fin) {
    const a = formatFecha(inicio);
    const b = formatFecha(fin);
    return a === b ? a : `${a} – ${b}`;
  }
  if (inicio) return `Desde el ${formatFecha(inicio)}`;
  if (fin) return `Hasta el ${formatFecha(fin)}`;
  return null;
}

/** "1 iglesia" / "3 iglesias". */
export function pluralIglesias(n: number): string {
  return `${n} ${n === 1 ? "iglesia" : "iglesias"}`;
}

/** `<input type="date">` (YYYY-MM-DD) → ISO a mediodía local, para que no se
 * corra un día por zona horaria al guardarse. */
export function fechaInputAIso(valor: string): string | undefined {
  if (!valor) return undefined;
  return new Date(`${valor}T12:00:00`).toISOString();
}

/** ISO → YYYY-MM-DD local (valor para `<input type="date">`). */
export function isoAFechaInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
