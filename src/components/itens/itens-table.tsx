"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
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
import { StatusItem, Criticidade } from "@prisma/client";
import { cn } from "@/lib/utils";

type ItemRow = {
  id: string;
  numeroItem: number;
  descricao: string;
  statusAtual: StatusItem;
  criticidade: Criticidade;
  pesoPercentual: string | null;
  considerarNaMedicao: boolean;
  atualizadoEm: string;
  modulo: { nome: string };
  contrato: { nome: string };
  pendenciasAbertas: number;
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

export function ItensTable() {
  const [data, setData] = useState<{ itens: ItemRow[]; total: number; totalPages: number }>({
    itens: [],
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [contratoId, setContratoId] = useState<string>("");
  const [moduloId, setModuloId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [contratos, setContratos] = useState<{ id: string; nome: string }[]>([]);
  const [modulos, setModulos] = useState<{ id: string; nome: string; contratoId: string }[]>([]);

  useEffect(() => {
    fetch("/api/contratos")
      .then((r) => r.json())
      .then(setContratos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contratoId) {
      setModulos([]);
      return;
    }
    fetch(`/api/modulos?contratoId=${contratoId}`)
      .then((r) => r.json())
      .then((m: { id: string; nome: string; contratoId: string }[]) =>
        setModulos(m)
      )
      .catch(() => setModulos([]));
  }, [contratoId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (contratoId) params.set("contratoId", contratoId);
    if (moduloId) params.set("moduloId", moduloId);
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/itens?${params}`)
      .then((r) => r.json())
      .then((d: { itens: ItemRow[]; total: number; totalPages: number }) => {
        setData({
          itens: d.itens,
          total: d.total ?? 0,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => setData({ itens: [], total: 0, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [page, contratoId, moduloId, status, search]);

  const columns: ColumnDef<ItemRow>[] = [
    {
      accessorKey: "modulo.nome",
      header: "Módulo",
      cell: ({ row }) => row.original.modulo.nome,
    },
    {
      accessorKey: "numeroItem",
      header: "Item",
      cell: ({ row }) => row.original.numeroItem,
    },
    {
      accessorKey: "descricao",
      header: "Descrição",
      cell: ({ row }) => (
        <span className="max-w-xs truncate block" title={row.original.descricao}>
          {row.original.descricao}
        </span>
      ),
    },
    {
      accessorKey: "statusAtual",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.statusAtual;
        const hasPendencia = row.original.pendenciasAbertas > 0;
        return (
          <Badge
            variant={statusVariant[s] ?? "secondary"}
            className={cn(
              (s === "NAO_ATENDE" || s === "PARCIAL" || hasPendencia) &&
                "ring-2 ring-amber-400/50"
            )}
          >
            {s}
            {hasPendencia && " (!)"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "criticidade",
      header: "Criticidade",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.criticidade}</Badge>
      ),
    },
    {
      accessorKey: "considerarNaMedicao",
      header: "Na medição",
      cell: ({ row }) =>
        row.original.considerarNaMedicao ? "Sim" : "Não",
    },
    {
      accessorKey: "atualizadoEm",
      header: "Atualizado",
      cell: ({ row }) => formatDate(row.original.atualizadoEm),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/itens/${row.original.id}`}>Ver</Link>
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data.itens,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data.totalPages,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listagem</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Select value={contratoId} onValueChange={(v) => { setContratoId(v); setModuloId(""); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {contratos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduloId} onValueChange={(v) => { setModuloId(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {modulos.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.values(StatusItem).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum item encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Total: {data.total} itens
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
                  disabled={page >= data.totalPages}
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
