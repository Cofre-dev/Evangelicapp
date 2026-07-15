"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima un número entero desde su valor anterior (0 la primera vez) hasta `target`
 * con requestAnimationFrame — sin librería externa. Pensado para cifras de resumen
 * (ResumenTile, StatTile) que antes aparecían de golpe al terminar de cargar.
 *
 * Respeta `prefers-reduced-motion`: si el usuario lo pidió, el valor se fija
 * directo en `target` sin animar.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [valor, setValor] = useState(target);
  const anteriorRef = useRef(0);
  const primerRenderRef = useRef(true);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const inicio = primerRenderRef.current ? 0 : anteriorRef.current;
    primerRenderRef.current = false;

    if (reduceMotion || inicio === target) {
      setValor(target);
      anteriorRef.current = target;
      return;
    }

    let frame: number;
    const inicioTiempo = performance.now();
    const delta = target - inicio;

    function tick(ahora: number) {
      const progreso = Math.min((ahora - inicioTiempo) / durationMs, 1);
      const progresoSuave = 1 - Math.pow(1 - progreso, 3); // easeOutCubic
      setValor(Math.round(inicio + delta * progresoSuave));

      if (progreso < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        anteriorRef.current = target;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return valor;
}
