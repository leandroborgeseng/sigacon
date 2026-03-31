import { cn } from "@/lib/utils";

/** Linhas placeholder para listas/tabelas durante carregamento. */
export function ListLoadingSkeleton({
  linhas = 6,
  className,
}: {
  linhas?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-2 p-4", className)}
      aria-busy="true"
      aria-label="Carregando"
    >
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-md bg-muted"
          style={{ opacity: 1 - i * 0.06 }}
        />
      ))}
    </div>
  );
}
