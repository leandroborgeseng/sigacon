"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TipoRecursoDatacenter } from "@prisma/client";
import {
  LABEL_TIPO_RECURSO_DATACENTER,
  ORDEM_TIPO_RECURSO_DATACENTER,
  indiceOrdenacaoTipoDatacenter,
  normalizarTiposRecursoDatacenterFromDb,
  normalizarTiposRecursoDatacenterParaPersistir,
} from "@/lib/datacenter-recursos";
import { Plus, Trash2 } from "lucide-react";

export type LinkMetroRow = {
  id: string;
  descricaoVelocidade: string;
  velocidadeMbps: string;
  quantidade: string;
};

export type ItemPrevistoLinhaForm = {
  quantidadeMaxima: string;
  valorUnitarioMensal: string;
};

export type LicencaSoftwareRow = {
  clientId: string;
  /** ID persistido (edição). */
  id?: string;
  nome: string;
  quantidadeMaxima: string;
  valorUnitarioMensal: string;
};

export type DatacenterFormState = {
  tiposRecursoPrevistos: TipoRecursoDatacenter[];
  /** Por tipo selecionado: quantidade máxima contratada e R$ unitário no mês. */
  detalhesPorTipo: Partial<Record<TipoRecursoDatacenter, ItemPrevistoLinhaForm>>;
  vcpus: string;
  ramGb: string;
  discoSsdGb: string;
  discoBackupGb: string;
  rackU: string;
  observacoes: string;
  links: LinkMetroRow[];
  licencasSoftware: LicencaSoftwareRow[];
};

function newClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now() + Math.random());
}

export function emptyLicencaRow(): LicencaSoftwareRow {
  return {
    clientId: newClientId(),
    nome: "",
    quantidadeMaxima: "",
    valorUnitarioMensal: "",
  };
}

export function emptyLinkRow(): LinkMetroRow {
  return {
    id: newClientId(),
    descricaoVelocidade: "",
    velocidadeMbps: "",
    quantidade: "1",
  };
}

export function defaultDatacenterFormState(): DatacenterFormState {
  return {
    tiposRecursoPrevistos: [...ORDEM_TIPO_RECURSO_DATACENTER],
    detalhesPorTipo: {},
    vcpus: "",
    ramGb: "",
    discoSsdGb: "",
    discoBackupGb: "",
    rackU: "",
    observacoes: "",
    links: [],
    licencasSoftware: [],
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

function linhaVazia(): ItemPrevistoLinhaForm {
  return { quantidadeMaxima: "", valorUnitarioMensal: "" };
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
  }>,
  itensPrevistos?: Array<{
    tipo: TipoRecursoDatacenter;
    quantidadeContratada?: unknown;
    valorUnitarioMensal?: unknown;
  }> | null,
  licencasSoftware?: Array<{
    id: string;
    nome: string;
    quantidadeMaxima: unknown;
    valorUnitarioMensal: unknown;
  }> | null
): DatacenterFormState {
  const fromDb = itensPrevistos?.length
    ? normalizarTiposRecursoDatacenterFromDb(itensPrevistos.map((i) => i.tipo))
    : [];
  const detalhesPorTipo: Partial<Record<TipoRecursoDatacenter, ItemPrevistoLinhaForm>> = {};
  if (itensPrevistos?.length) {
    for (const it of itensPrevistos) {
      detalhesPorTipo[it.tipo] = {
        quantidadeMaxima: decToInput(it.quantidadeContratada),
        valorUnitarioMensal: decToInput(it.valorUnitarioMensal),
      };
    }
  }
  return {
    tiposRecursoPrevistos: fromDb.length ? [...new Set(fromDb)] : [...ORDEM_TIPO_RECURSO_DATACENTER],
    detalhesPorTipo,
    vcpus: decToInput(datacenter?.vcpusContratados),
    ramGb: decToInput(datacenter?.ramGb),
    discoSsdGb: decToInput(datacenter?.discoSsdGb),
    discoBackupGb: decToInput(datacenter?.discoBackupGb),
    rackU: decToInput(datacenter?.rackU),
    observacoes: datacenter?.observacoes ?? "",
    links:
      links.length > 0
        ? links.map((l) => ({
            id: newClientId(),
            descricaoVelocidade: l.descricaoVelocidade,
            velocidadeMbps: l.velocidadeMbps != null ? String(l.velocidadeMbps) : "",
            quantidade: String(Math.max(1, l.quantidade)),
          }))
        : [],
    licencasSoftware: (licencasSoftware ?? []).map((lic) => ({
      clientId: newClientId(),
      id: lic.id,
      nome: lic.nome,
      quantidadeMaxima: decToInput(lic.quantidadeMaxima),
      valorUnitarioMensal: decToInput(lic.valorUnitarioMensal),
    })),
  };
}

function parseOptDecimal(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
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

  const tipos = normalizarTiposRecursoDatacenterParaPersistir([...new Set(dc.tiposRecursoPrevistos)]);
  const itensPrevistosDetalhe = tipos.map((tipo) => {
    const d = dc.detalhesPorTipo[tipo] ?? linhaVazia();
    return {
      tipo,
      quantidadeMaxima: parseOptDecimal(d.quantidadeMaxima),
      valorUnitarioMensal: parseOptDecimal(d.valorUnitarioMensal),
    };
  });

  const licencasSoftware = dc.licencasSoftware
    .filter((l) => l.nome.trim())
    .map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      nome: l.nome.trim(),
      quantidadeMaxima: parseOptDecimal(l.quantidadeMaxima),
      valorUnitarioMensal: parseOptDecimal(l.valorUnitarioMensal),
    }));

  return {
    vcpusContratados: num(dc.vcpus),
    ramGb: num(dc.ramGb),
    discoSsdGb: num(dc.discoSsdGb),
    discoBackupGb: num(dc.discoBackupGb),
    rackU: num(dc.rackU),
    observacoes: dc.observacoes.trim() || null,
    tiposRecursoPrevistos: tipos,
    itensPrevistosDetalhe,
    licencasSoftware,
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

  function toggleTipo(tipo: TipoRecursoDatacenter) {
    const s = new Set(value.tiposRecursoPrevistos);
    const detalhesPorTipo = { ...value.detalhesPorTipo };
    if (s.has(tipo)) {
      s.delete(tipo);
      delete detalhesPorTipo[tipo];
    } else {
      s.add(tipo);
      detalhesPorTipo[tipo] = detalhesPorTipo[tipo] ?? linhaVazia();
    }
    onChange({
      ...value,
      tiposRecursoPrevistos: [...s],
      detalhesPorTipo,
    });
  }

  function setDetalhe(tipo: TipoRecursoDatacenter, field: keyof ItemPrevistoLinhaForm, v: string) {
    const detalhesPorTipo = { ...value.detalhesPorTipo };
    const cur = detalhesPorTipo[tipo] ?? linhaVazia();
    detalhesPorTipo[tipo] = { ...cur, [field]: v };
    patch({ detalhesPorTipo });
  }

  const tiposOrdenados = [...value.tiposRecursoPrevistos].sort(
    (a, b) => indiceOrdenacaoTipoDatacenter(a) - indiceOrdenacaoTipoDatacenter(b)
  );

  return (
    <div className="space-y-4 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Infraestrutura contratada (datacenter)</p>
      <p className="text-xs text-muted-foreground">
        Marque as linhas do contrato e informe, quando souber, a quantidade máxima contratada e o valor
        unitário mensal (R$) para medição e faturamento.
      </p>
      <div className="rounded-md bg-muted/40 p-3 space-y-2">
        <p className="text-xs font-medium">Itens previstos (medição / faturamento mensal)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ORDEM_TIPO_RECURSO_DATACENTER.map((tipo) => (
            <label
              key={tipo}
              className="flex items-start gap-2 text-xs cursor-pointer rounded border border-transparent hover:border-border px-2 py-1.5"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 rounded border-input"
                checked={value.tiposRecursoPrevistos.includes(tipo)}
                onChange={() => toggleTipo(tipo)}
              />
              <span>{LABEL_TIPO_RECURSO_DATACENTER[tipo]}</span>
            </label>
          ))}
        </div>
        {tiposOrdenados.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/60 mt-2">
            <p className="text-[11px] text-muted-foreground">
              Quantidade máx. (referência contratual) e valor unitário mensal (R$) por linha — usados no
              cálculo do consumo de cada mês.
            </p>
            {tiposOrdenados.map((tipo) => {
              const d = value.detalhesPorTipo[tipo] ?? linhaVazia();
              return (
                <div
                  key={tipo}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded border bg-background/50 p-2"
                >
                  <div className="sm:col-span-6 text-xs font-medium leading-tight">
                    {LABEL_TIPO_RECURSO_DATACENTER[tipo]}
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Qtd. máx.</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex.: 32"
                      value={d.quantidadeMaxima}
                      onChange={(e) => setDetalhe(tipo, "quantidadeMaxima", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">R$ unit. / mês</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex.: 150,50"
                      value={d.valorUnitarioMensal}
                      onChange={(e) => setDetalhe(tipo, "valorUnitarioMensal", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground border-t pt-3">
        Detalhes opcionais (capacidades globais e links) — complementam o cadastro.
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
          <Label className="text-xs">Licenças de software adicionais</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              patch({ licencasSoftware: [...value.licencasSoftware, emptyLicencaRow()] })
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            Adicionar licença
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Como os links: cadastre cada licença com quantidade máxima, valor unitário mensal e depois lance o
          consumo na medição do mês.
        </p>
        {value.licencasSoftware.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma licença adicional.</p>
        ) : (
          <div className="space-y-2">
            {value.licencasSoftware.map((row, idx) => (
              <div
                key={row.clientId}
                className="grid grid-cols-12 gap-2 items-end border rounded-md p-2"
              >
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Nome / produto</Label>
                  <Input
                    placeholder="Ex.: SQL Server Standard"
                    value={row.nome}
                    onChange={(e) => {
                      const licencasSoftware = [...value.licencasSoftware];
                      licencasSoftware[idx] = { ...row, nome: e.target.value };
                      patch({ licencasSoftware });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-6 sm:col-span-2 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Qtd. máx.</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={row.quantidadeMaxima}
                    onChange={(e) => {
                      const licencasSoftware = [...value.licencasSoftware];
                      licencasSoftware[idx] = { ...row, quantidadeMaxima: e.target.value };
                      patch({ licencasSoftware });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">R$ unit. / mês</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={row.valorUnitarioMensal}
                    onChange={(e) => {
                      const licencasSoftware = [...value.licencasSoftware];
                      licencasSoftware[idx] = { ...row, valorUnitarioMensal: e.target.value };
                      patch({ licencasSoftware });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 flex justify-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => {
                      patch({
                        licencasSoftware: value.licencasSoftware.filter(
                          (l) => l.clientId !== row.clientId
                        ),
                      });
                    }}
                    aria-label="Remover licença"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
