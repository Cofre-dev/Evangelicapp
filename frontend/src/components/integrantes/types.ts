export interface Integrante {
  id: string;
  nombreCompleto: string;
  run: string;
  email: string;
  telefono: string;
  fotoUrl: string | null;
  // Fecha elegida por la persona al registrarse (YYYY-MM-DD o ISO completo,
  // según lo que confirme el backend) — ya no se deriva de createdAt.
  miembroDesde: string;
  createdAt: string;
  updatedAt: string;
  iglesiaId: string;
}

export interface QrInfo {
  qrToken: string;
  urlRegistro: string;
}
