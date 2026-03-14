"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/utils";
import { StatusItem } from "@prisma/client";
import { cn } from "@/lib/utils";

export type ItemDetailItem = {
  id: string;
  numeroItem: number;
  descricao: string;
  statusAtual: StatusItem;
  observacaoAtual: string | null;
  criticidade: string;
  pesoPercentual: string | null;
  considerarNaMedicao: boolean;
  modulo: { nome: string };
  contrato: { nome: string };
  avaliacoes: Array<{
    id: string;
    dataAvaliacao: string;
    competenciaAno: number;
    competenciaMes: number;
    status: StatusItem;
    observacao: string | null;
    origem: string;
    usuario: { nome: string } | null;
  }>;
  pendencias: Array<{
    id: string;
    descricao: string;
    responsavel: string | null;
    prazo: string | null;
    status: string;
    criadoEm: string;
    concluidoEm: string | null;
  }>;
  anexos: Array<{
    id: string;
    nomeOriginal: string;
    tipoAnexo: string;
    criadoEm: string;
  }>;
};

export type HistoricoEntry = {
  id: string;
  acao: string;
  valorAnterior: unknown;
  valorNovo: unknown;
  criadoEm: string;
  usuario: { nome: string } | null;
};

type Props = {
  item: ItemDetailItem;
  historico: HistoricoEntry[];
  status: StatusItem;
  setStatus: (s: StatusItem) => void;
  observacao: string;
  setObservacao: (s: string) => void;
  saving: boolean;
  onSave: () => void;
};

export function ItemDetailContent(props: Props) {
  const { item, historico, status, setStatus, observacao, setObservacao, saving, onSave } = props;
  const statusVariant =
    item.statusAtual === "NAO_ATENDE" || item.statusAtual === "PARCIAL"
      ? "destructive"
      : "secondary";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Item {item.numeroItem} – {item.modulo?.nome ?? "—"}
          </h1>
          <p className="text-muted-foreground">{item.contrato?.nome ?? "—"}</p>
        </div>
        <Badge className={cn(statusVariant && "bg-destructive/10 text-destructive")}>
          {item.statusAtual}
        </Badge>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="anexos">Evidências</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground whitespace-pre-wrap break-words">{item.descricao ?? "—"}</p>
              <div className="flex flex-wrap gap-4">
                <div>
                  <Label>Alterar status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as StatusItem)}>
                    <SelectTrigger className="w-[200px] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(StatusItem).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label>Observação</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Criticidade</dt>
                <dd>{item.criticidade}</dd>
                <dt className="text-muted-foreground">Peso %</dt>
                <dd>{item.pesoPercentual ?? "—"}</dd>
                <dt className="text-muted-foreground">Considerar na medição</dt>
                <dd>{item.considerarNaMedicao ? "Sim" : "Não"}</dd>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avaliacoes">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de avaliações</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(item.avaliacoes ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma avaliação registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (item.avaliacoes ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{formatDateTime(a.dataAvaliacao)}</TableCell>
                        <TableCell>
                          {a.competenciaMes}/{a.competenciaAno}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {a.observacao || "—"}
                        </TableCell>
                        <TableCell>{a.usuario?.nome ?? "—"}</TableCell>
                        <TableCell>{a.origem}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendencias">
          <Card>
            <CardHeader>
              <CardTitle>Pendências</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(item.pendencias ?? []).length === 0 ? (
                <p className="p-4 text-muted-foreground">Nenhuma pendência.</p>
              ) : (
                <ul className="divide-y">
                  {(item.pendencias ?? []).map((p) => (
                    <li key={p.id} className="p-4">
                      <p className="font-medium">{p.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        Responsável: {p.responsavel ?? "—"} • Prazo:{" "}
                        {p.prazo ? formatDate(p.prazo) : "—"} • Status: {p.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anexos">
          <Card>
            <CardHeader>
              <CardTitle>Evidências / Anexos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(item.anexos ?? []).length === 0 ? (
                <p className="p-4 text-muted-foreground">Nenhum anexo.</p>
              ) : (
                <ul className="divide-y">
                  {(item.anexos ?? []).map((a) => (
                    <li key={a.id} className="flex items-center justify-between p-4">
                      <span>{a.nomeOriginal}</span>
                      <Badge variant="outline">{a.tipoAnexo}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(a.criadoEm)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo – Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {historico.length === 0 ? (
                <p className="p-4 text-muted-foreground">Nenhum registro de auditoria.</p>
              ) : (
                <ul className="divide-y">
                  {historico.map((h) => (
                    <li key={h.id} className="p-4">
                      <p className="font-medium">{h.acao}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(h.criadoEm)} • {h.usuario?.nome ?? "Sistema"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
