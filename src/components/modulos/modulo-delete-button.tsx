"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ModuloDeleteButton({
  moduloId,
  moduloNome,
}: {
  moduloId: string;
  moduloNome: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir o módulo "${moduloNome}"? Os itens vinculados também serão removidos.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/modulos/${moduloId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message ?? "Erro ao excluir");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
