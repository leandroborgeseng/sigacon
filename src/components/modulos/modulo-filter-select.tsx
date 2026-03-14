"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Contrato = { id: string; nome: string };

export function ModuloFilterSelect({ contratos }: { contratos: Contrato[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoId = searchParams.get("contratoId") ?? "";

  function onValueChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("contratoId", value);
    } else {
      params.delete("contratoId");
    }
    router.push(`/modulos${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por contrato</Label>
      <Select value={contratoId || "todos"} onValueChange={(v) => onValueChange(v === "todos" ? "" : v)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Todos os contratos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os contratos</SelectItem>
          {contratos.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
