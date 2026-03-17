"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function ContratoDangerZone({
  contratoId,
  contratoNome,
  ativo,
  canDelete,
  canToggleAtivo,
}: {
  contratoId: string;
  contratoNome: string;
  ativo: boolean;
  canDelete: boolean;
  canToggleAtivo: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const matches = useMemo(() => confirmText.trim() === contratoNome, [confirmText, contratoNome]);

  async function toggleAtivo(nextAtivo: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: nextAtivo }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.message ?? "Erro ao atualizar contrato");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteContrato() {
    if (!matches) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contratos/${contratoId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmNome: confirmText.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.message ?? "Erro ao excluir contrato");
        return;
      }
      setOpenDelete(false);
      router.push("/contratos");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canToggleAtivo && (
        <Button
          variant={ativo ? "outline" : "default"}
          onClick={() => toggleAtivo(!ativo)}
          disabled={busy}
        >
          {ativo ? "Inativar (somente consulta)" : "Reativar"}
        </Button>
      )}

      {canDelete && (
        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={busy}>
              Excluir contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Para evitar exclusão acidental, digite exatamente o nome do contrato abaixo e confirme.
            </p>
            <div className="space-y-2">
              <Label>Nome do contrato</Label>
              <Input value={contratoNome} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Digite o nome para confirmar</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite exatamente o nome"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={deleteContrato}
                disabled={!matches || busy}
              >
                {busy ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

