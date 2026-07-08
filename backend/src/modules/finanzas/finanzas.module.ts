import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  controllers: [CategoriasController, MovimientosController],
  providers: [CategoriasService, MovimientosService],
})
export class FinanzasModule {}
