"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export type LinkMetroRow = {
  id: string;
  descricaoVelocidade: string;
  velocidadeMbps: string;
  quantidade: string;
};

export type DatacenterFormState = {
  vcpus: string;
  ramGb: string;
  discoSsdGb: string;
  discoBackupGb: string;
  rackU: string;
  observacoes: string;
  links: LinkMetroRow[];
};

function newLinkId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now() + Math.random());
}

export function emptyLinkRow(): LinkMetroRow {
  return {
    id: newLinkId(),
    descricaoVelocidade: "",
    velocidadeMbps: "",
    quantidade: "1",
  };
}

export function defaultDatacenterFormState(): DatacenterFormState {
  return {
    vcpus: "",
    ramGb: "",
    discoSsdGb: "",
    discoBackupGb: "",
    rackU: "",
    observacoes: "",
    links: [],
  };
}

function decToInput(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "object" && v !== null && "toString" in v) {
    const s = (v as { toString(): string }).toString();
    return s === "[object Object]" ? "" : s;
  }
  return "";
}

export function hydrateDatacenterForm(
  datacenter: {
    vcpusContratados: unknown;
    ramGb: unknown;
    discoSsdGb: unknown;
    discoBackupGb: unknown;
    rackU: unknown;
    observacoes: string | null;
  } | null | undefined,
  links: Array<{
    descricaoVelocidade: string;
    velocidadeMbps: number | null;
    quantidade: number;
  }>
): DatacenterFormState {
  return {
    vcpus: decToInput(datacenter?.vcpusContratados),
    ramGb: decToInput(datacenter?.ramGb),
    discoSsdGb: decToInput(datacenter?.discoSsdGb),
    discoBackupGb: decToInput(datacenter?.discoBackupGb),
    rackU: decToInput(datacenter?.rackU),
    observacoes: datacenter?.observacoes ?? "",
    links:
      links.length > 0
        ? links.map((l) => ({
            id: newLinkId(),
            descricaoVelocidade: l.descricaoVelocidade,
            velocidadeMbps: l.velocidadeMbps != null ? String(l.velocidadeMbps) : "",
            quantidade: String(Math.max(1, l.quantidade)),
          }))
        : [],
  };
}

export function payloadFromDatacenterForm(dc: DatacenterFormState) {
  const num = (s: string): number | null => {
    const t = s.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const links = dc.links
    .filter((l) => l.descricaoVelocidade.trim())
    .map((l) => ({
      descricaoVelocidade: l.descricaoVelocidade.trim(),
      velocidadeMbps: l.velocidadeMbps.trim()
        ? Number.parseInt(l.velocidadeMbps.trim(), 10)
        : null,
      quantidade: Math.max(1, Number.parseInt(l.quantidade, 10) || 1),
    }));
  return {
    vcpusContratados: num(dc.vcpus),
    ramGb: num(dc.ramGb),
    discoSsdGb: num(dc.discoSsdGb),
    discoBackupGb: num(dc.discoBackupGb),
    rackU: num(dc.rackU),
    observacoes: dc.observacoes.trim() || null,
    links,
  };
}

export function ContratoDatacenterFields({
  value,
  onChange,
}: {
  value: DatacenterFormState;
  onChange: (next: DatacenterFormState) => void;
}) {
  function patch(partial: Partial<DatacenterFormState>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Infraestrutura contratada (datacenter)</p>
      <p className="text-xs text-muted-foreground">
        vCPU, RAM (GB), SSD (GB), disco backup (GB), colocation (U) e links metropolitanos (velocidade +
        quantidade).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">vCPUs (unidades)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 16"
            value={value.vcpus}
            onChange={(e) => patch({ vcpus: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">RAM (GB)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 128"
            value={value.ramGb}
            onChange={(e) => patch({ ramGb: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Disco SSD rápido (GB)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 500"
            value={value.discoSsdGb}
            onChange={(e) => patch({ discoSsdGb: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Disco backup / mais lento (GB)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 2000"
            value={value.discoBackupGb}
            onChange={(e) => patch({ discoBackupGb: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Colocation — rack (U)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 10"
            value={value.rackU}
            onChange={(e) => patch({ rackU: e.target.value })}
            className="h-8 max-w-xs"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Observações da infraestrutura (opcional)</Label>
        <Textarea
          rows={2}
          value={value.observacoes}
          onChange={(e) => patch({ observacoes: e.target.value })}
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Links metropolitanos</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => patch({ links: [...value.links, emptyLinkRow()] })}
          >
            <Plus className="mr-1 h-3 w-3" />
            Adicionar link
          </Button>
        </div>
        {value.links.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum link cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {value.links.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Velocidade (texto)</Label>
                  <Input
                    placeholder="Ex.: 1 Gbps full duplex"
                    value={row.descricaoVelocidade}
                    onChange={(e) => {
                      const links = [...value.links];
                      links[idx] = { ...row, descricaoVelocidade: e.target.value };
                      patch({ links });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Mbps (opcional)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="1000"
                    value={row.velocidadeMbps}
                    onChange={(e) => {
                      const links = [...value.links];
                      links[idx] = { ...row, velocidadeMbps: e.target.value };
                      patch({ links });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Qtd.</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.quantidade}
                    onChange={(e) => {
                      const links = [...value.links];
                      links[idx] = { ...row, quantidade: e.target.value };
                      patch({ links });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-2 flex justify-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => {
                      const links = value.links.filter((l) => l.id !== row.id);
                      patch({ links });
                    }}
                    aria-label="Remover link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
