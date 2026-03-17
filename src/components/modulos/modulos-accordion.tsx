"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuloEditDialog } from "@/components/modulos/modulo-edit-dialog";
import { ModuloDeleteButton } from "@/components/modulos/modulo-delete-button";
import { ModuloItensStatus } from "@/components/modulos/modulo-itens-status";
import { StatusItem } from "@prisma/client";

type ModuloRow = {
  id: string;
  nome: string;
  descricao: string | null;
  implantado: boolean;
  ativo: boolean;
  contrato: { id: string; nome: string };
  _count: { itens: number };
};

type Item = {
  id: string;
  numeroItem: number;
  descricao: string;
  statusAtual: StatusItem;
};

export function ModulosAccordion({ modulos }: { modulos: ModuloRow[] }) {
  const ids = useMemo(() => modulos.map((m) => m.id), [modulos]);
  const [open, setOpen] = useState<string | undefined>(undefined);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [itensByModulo, setItensByModulo] = useState<Record<string, Item[]>>({});
  const [errorByModulo, setErrorByModulo] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!open) return;
    if (itensByModulo[open]) return;
    setLoadingId(open);
    setErrorByModulo((p) => ({ ...p, [open]: null }));
    fetch(`/api/itens?moduloId=${encodeURIComponent(open)}&page=1&pageSize=50`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }: { ok: boolean; j: { itens?: Item[]; message?: string } }) => {
        if (!ok) {
          setErrorByModulo((p) => ({ ...p, [open]: j.message ?? "Erro ao carregar itens" }));
          return;
        }
        setItensByModulo((p) => ({ ...p, [open]: Array.isArray(j.itens) ? j.itens : [] }));
      })
      .catch(() => setErrorByModulo((p) => ({ ...p, [open]: "Erro ao carregar itens" })))
      .finally(() => setLoadingId(null));
  }, [open, itensByModulo]);

  if (ids.length === 0) {
    return (
      <p className="p-4 text-muted-foreground">
        Nenhum módulo cadastrado.
      </p>
    );
  }

  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
      {modulos.map((m) => {
        const itens = itensByModulo[m.id];
        const loading = loadingId === m.id;
        const error = errorByModulo[m.id];
        return (
          <AccordionItem key={m.id} value={m.id}>
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.contrato.nome} • {m._count.itens} itens
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={m.implantado ? "default" : "secondary"}>
                    {m.implantado ? "Implantado" : "Não implantado"}
                  </Badge>
                  <Badge variant={m.ativo ? "default" : "secondary"}>
                    {m.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/modulos/${m.id}`}>Ver módulo</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/contratos/${m.contrato.id}`}>Ver contrato</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <ModuloEditDialog
                    modulo={{
                      id: m.id,
                      nome: m.nome,
                      descricao: m.descricao,
                      implantado: m.implantado,
                      ativo: m.ativo,
                      contratoId: m.contrato.id,
                    }}
                  />
                  <ModuloDeleteButton moduloId={m.id} moduloNome={m.nome} />
                </div>
              </div>

              {loading && (
                <p className="py-4 text-muted-foreground">Carregando itens...</p>
              )}
              {!loading && error && (
                <p className="py-4 text-destructive">{error}</p>
              )}
              {!loading && !error && (
                <ModuloItensStatus itens={itens ?? []} />
              )}

              {m._count.itens > 50 && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Mostrando até 50 itens. Abra o módulo para ver a lista completa de itens.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

