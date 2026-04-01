"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { StatusItem } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ItemContratualCreateDialog } from "@/components/itens/item-contratual-create-dialog";

const FILTER_ALL = "__todos__";

type Contrato = { id: string; nome: string };
type Modulo = { id: string; nome: string; contratoId: string };

type Item = {
  id: string;
  numeroItem: number;
  descricao?: string | null;
  statusAtual?: StatusItem;
  criticidade?: string;
  modulo?: { nome: string } | null;
  contrato?: { nome: string } | null;
  pendenciasAbertas?: number;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "warning"> = {
  ATENDE: "default",
  PARCIAL: "warning",
  NAO_ATENDE: "destructive",
  INCONCLUSIVO: "secondary",
  DESCONSIDERADO: "secondary",
  NAO_SE_APLICA: "secondary",
  CABECALHO: "secondary",
};

type Props = {
  contratos: Contrato[];
  modulosIniciais: Modulo[];
  /** Contratos que aceitam itens por módulo (exclui datacenter). */
  contratosCadastroItem: Contrato[];
  modulosCadastroItem: Modulo[];
  podeEditar: boolean;
};

export function ItensList({
  contratos,
  modulosIniciais,
  contratosCadastroItem,
  modulosCadastroItem,
  podeEditar,
}: Props) {
  const [contratoId, setContratoId] = useState<string>("");
  const [moduloId, setModuloId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<{
    itens: Item[];
    total: number;
    totalPages: number;
  }>({ itens: [], total: 0, totalPages: 0 });

  const modulos = useMemo(() => {
    if (!contratoId) return modulosIniciais;
    return modulosIniciais.filter((m) => m.contratoId === contratoId);
  }, [contratoId, modulosIniciais]);

  const contratoSoftwareDoModuloFiltro =
    moduloId && modulosCadastroItem.some((m) => m.id === moduloId)
      ? modulosCadastroItem.find((m) => m.id === moduloId)?.contratoId
      : undefined;

  const contratoIdFixoDialog =
    contratoId && contratosCadastroItem.some((c) => c.id === contratoId)
      ? contratoId
      : contratoSoftwareDoModuloFiltro && contratosCadastroItem.some((c) => c.id === contratoSoftwareDoModuloFiltro)
        ? contratoSoftwareDoModuloFiltro
        : undefined;

  const moduloIdFixoDialog =
    moduloId && modulosCadastroItem.some((m) => m.id === moduloId) ? moduloId : undefined;

  useEffect(() => {
    setModuloId("");
  }, [contratoId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (contratoId) params.set("contratoId", contratoId);
    if (moduloId) params.set("moduloId", moduloId);
    if (search.trim()) params.set("search", search.trim());

    fetch(`/api/itens?${params}`)
      .then((r) => r.json())
      .then((d: { itens?: Item[]; total?: number; totalPages?: number }) => {
        setResponse({
          itens: Array.isArray(d?.itens) ? d.itens : [],
          total: typeof d?.total === "number" ? d.total : 0,
          totalPages: typeof d?.totalPages === "number" ? d.totalPages : 1,
        });
      })
      .catch(() => setResponse({ itens: [], total: 0, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [page, contratoId, moduloId, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listagem</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sem filtro: todos os itens de todos os contratos. Use contrato e/ou módulo para refinar.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <ItemContratualCreateDialog
            contratos={contratosCadastroItem}
            modulos={modulosCadastroItem}
            podeEditar={podeEditar}
            contratoIdFixo={contratoIdFixoDialog}
            moduloIdFixo={moduloIdFixoDialog}
          />
          <Select
            value={contratoId || FILTER_ALL}
            onValueChange={(v) => {
              setContratoId(v === FILTER_ALL ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Todos os contratos</SelectItem>
              {contratos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={moduloId || FILTER_ALL}
            onValueChange={(v) => {
              setModuloId(v === FILTER_ALL ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Todos os módulos</SelectItem>
              {modulos.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Pesquisar (descrição ou nº do item)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-[240px]"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="w-16">Item</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Criticidade</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {response.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum item encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  response.itens.map((item) => {
                    const status = item.statusAtual ?? "INCONCLUSIVO";
                    const hasPendencia = (item.pendenciasAbertas ?? 0) > 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.contrato?.nome ?? "—"}
                        </TableCell>
                        <TableCell>{item.modulo?.nome ?? "—"}</TableCell>
                        <TableCell>{item.numeroItem}</TableCell>
                        <TableCell>
                          <div
                            className="max-w-md text-sm line-clamp-3 whitespace-pre-wrap break-words"
                            title={item.descricao ?? ""}
                          >
                            {item.descricao ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariant[status] ?? "secondary"}
                            className={cn(
                              (status === "NAO_ATENDE" || status === "PARCIAL" || hasPendencia) &&
                                "ring-2 ring-amber-400/50"
                            )}
                          >
                            {status}
                            {hasPendencia && " (!)"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.criticidade ?? "MEDIA"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/itens/${item.id}`}>Ver</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Total: {response.total} itens
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= response.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
