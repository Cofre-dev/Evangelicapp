import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function VerificadaBadge({ verificada, className }: { verificada: boolean; className?: string }) {
  return verificada ? (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700",
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      Verificada
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      Sin verificar
    </span>
  );
}
