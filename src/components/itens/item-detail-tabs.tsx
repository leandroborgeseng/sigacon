"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusItem } from "@prisma/client";
import { ItemDetailContent, type ItemDetailItem, type HistoricoEntry } from "./item-detail-content";

export function ItemDetailTabs({
  item: itemProp,
  historico = [],
}: {
  item: ItemDetailItem;
  historico?: HistoricoEntry[];
}) {
  const router = useRouter();
  const item = itemProp ?? ({} as ItemDetailItem);
  const safeHistorico = Array.isArray(historico) ? historico : [];
  const [status, setStatus] = useState(item?.statusAtual ?? "INCONCLUSIVO");
  const [observacao, setObservacao] = useState(item?.observacaoAtual ?? "");
  const [saving, setSaving] = useState(false);

  if (!item?.id) {
    return (
      <div className="text-muted-foreground p-4">Item não encontrado.</div>
    );
  }

  async function handleUpdateStatus() {
    setSaving(true);
    try {
      const res = await fetch(`/api/itens/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusAtual: status, observacaoAtual: observacao || null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ItemDetailContent
      item={item}
      historico={safeHistorico}
      status={status}
      setStatus={setStatus}
      observacao={observacao}
      setObservacao={setObservacao}
      saving={saving}
      onSave={handleUpdateStatus}
    />
  );
}
