import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMovimientoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  /** El tipo (INGRESO/EGRESO) del movimiento se toma de la categoría, no del cliente. */
  @IsString()
  @IsNotEmpty()
  categoriaId: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
