import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ItensList } from "@/components/itens/itens-list";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao, TipoContrato } from "@prisma/client";

export default async function ItensPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );

  const [contratos, modulos] = await Promise.all([
    prisma.contrato.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, tipoContrato: true },
    }),
    prisma.modulo.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, contratoId: true },
    }),
  ]);

  const contratosComItensPorModulo = contratos.filter((c) => c.tipoContrato !== TipoContrato.DATACENTER);
  const idsSoftware = new Set(contratosComItensPorModulo.map((c) => c.id));
  const modulosComItensPorModulo = modulos.filter((m) => idsSoftware.has(m.contratoId));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Itens Contratuais" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Itens Contratuais</h1>
        <p className="text-muted-foreground">
          Listagem de todos os itens cadastrados. Sem filtro são exibidos itens de todos os contratos; use os filtros por contrato e módulo para refinar. Itens e módulos também podem ser cadastrados manualmente (sem importação).
        </p>
      </div>
      <ItensList
        contratos={contratos.map(({ id, nome }) => ({ id, nome }))}
        modulosIniciais={modulos}
        contratosCadastroItem={contratosComItensPorModulo.map(({ id, nome }) => ({ id, nome }))}
        modulosCadastroItem={modulosComItensPorModulo}
        podeEditar={podeEditar}
      />
    </div>
  );
}
