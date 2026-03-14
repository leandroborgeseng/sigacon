"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Contrato = { id: string; nome: string };

export function ModuloFilterSelect({
  contratos = [],
  contratoId = "",
}: {
  contratos?: Contrato[];
  contratoId?: string;
}) {
  const router = useRouter();
  const list = Array.isArray(contratos) ? contratos : [];
  const value = contratoId && list.some((c) => c.id === contratoId) ? contratoId : "todos";

  function onValueChange(value: string) {
    const next = value === "todos" ? "" : value;
    router.push(next ? `/modulos?contratoId=${encodeURIComponent(next)}` : "/modulos");
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por contrato</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Todos os contratos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os contratos</SelectItem>
          {list.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
