import { TipoRecursoDatacenter } from "@prisma/client";

/**
 * Ordem das 8 linhas do objeto da contratação (edital tipo PMF / serviços de datacenter).
 * Usada em formulários, ficha do contrato e ordenação da lista.
 */
export const ORDEM_TIPO_RECURSO_DATACENTER: TipoRecursoDatacenter[] = [
  TipoRecursoDatacenter.COLOCATION_RACK_U,
  TipoRecursoDatacenter.LICENCA_WINDOWS_SERVER_CORE,
  TipoRecursoDatacenter.LOCACAO_PROCESSADOR_VPS,
  TipoRecursoDatacenter.VPS_VCPU_COM_SQL_SERVER,
  TipoRecursoDatacenter.MEMORIA_RAM_GB,
  TipoRecursoDatacenter.DISCO_SSD_RAPIDO_GB,
  TipoRecursoDatacenter.DISCO_BACKUP_GB,
  TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA,
];

export const LABEL_TIPO_RECURSO_DATACENTER: Record<TipoRecursoDatacenter, string> = {
  [TipoRecursoDatacenter.COLOCATION_RACK_U]:
    "Colocation — espaço físico para equipamentos (energia e rede de alta velocidade)",
  [TipoRecursoDatacenter.LICENCA_WINDOWS_SERVER_CORE]:
    "Licença Microsoft Windows Server para VPS (SO, ex.: núcleos de processamento)",
  [TipoRecursoDatacenter.LOCACAO_PROCESSADOR_VPS]:
    "Locação de capacidade de processamento (processador) para VPS",
  [TipoRecursoDatacenter.VPS_VCPU_COM_SQL_SERVER]:
    "Locação de processamento para VPS com licença Microsoft SQL Server",
  [TipoRecursoDatacenter.MEMORIA_RAM_GB]: "Locação de memória RAM para VPS (GB)",
  [TipoRecursoDatacenter.DISCO_SSD_RAPIDO_GB]: "Locação de armazenamento SSD para VPS (GB)",
  [TipoRecursoDatacenter.DISCO_BACKUP_GB]: "Locação de armazenamento em HD para VPS (GB)",
  [TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA]:
    "Conectividade em fibra óptica entre edificações ou pontos distantes",
  [TipoRecursoDatacenter.LINK_METROPOLITANO]:
    "Links metropolitanos (legado — use conectividade fibra óptica)",
};

/** Unifica tipos vindos do banco (ex.: legado LINK_METROPOLITANO → fibra). */
export function normalizarTiposRecursoDatacenterFromDb(
  tipos: TipoRecursoDatacenter[]
): TipoRecursoDatacenter[] {
  const s = new Set<TipoRecursoDatacenter>();
  for (const t of tipos) {
    if (t === TipoRecursoDatacenter.LINK_METROPOLITANO) {
      s.add(TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA);
    } else {
      s.add(t);
    }
  }
  return [...s];
}

/** Antes de persistir: não gravar LINK_METROPOLITANO junto com fibra; prefira só fibra. */
export function normalizarTiposRecursoDatacenterParaPersistir(
  tipos: TipoRecursoDatacenter[]
): TipoRecursoDatacenter[] {
  const s = new Set(tipos);
  if (
    s.has(TipoRecursoDatacenter.LINK_METROPOLITANO) ||
    s.has(TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA)
  ) {
    s.delete(TipoRecursoDatacenter.LINK_METROPOLITANO);
    s.add(TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA);
  }
  return [...s];
}

const ORDEM_IDX = new Map(
  ORDEM_TIPO_RECURSO_DATACENTER.map((t, i) => [t, i] as const)
);

/** Ordenação na ficha e em relatórios (legado LINK junto da fibra). */
export function indiceOrdenacaoTipoDatacenter(tipo: TipoRecursoDatacenter): number {
  if (tipo === TipoRecursoDatacenter.LINK_METROPOLITANO) {
    return ORDEM_IDX.get(TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA) ?? 99;
  }
  return ORDEM_IDX.get(tipo) ?? 99;
}

/** Soma mensal quando quantidade × valor unitário existem em cada linha. */
export function somaValorMensalPrevistoDatacenter(
  itens: Array<{
    quantidadeContratada: unknown;
    valorUnitarioMensal: unknown;
  }>
): number | null {
  let total = 0;
  let usados = 0;
  for (const i of itens) {
    const q =
      i.quantidadeContratada != null ? Number(i.quantidadeContratada) : Number.NaN;
    const v = i.valorUnitarioMensal != null ? Number(i.valorUnitarioMensal) : Number.NaN;
    if (Number.isFinite(q) && Number.isFinite(v)) {
      total += q * v;
      usados += 1;
    }
  }
  return usados > 0 ? total : null;
}

/** Soma mensal para licenças adicionais (qtd máxima × valor unitário, quando ambos preenchidos). */
export function somaValorMensalPrevistoLicencas(
  licencas: Array<{
    quantidadeMaxima: unknown;
    valorUnitarioMensal: unknown;
  }>
): number | null {
  let total = 0;
  let usados = 0;
  for (const i of licencas) {
    const q = i.quantidadeMaxima != null ? Number(i.quantidadeMaxima) : Number.NaN;
    const v = i.valorUnitarioMensal != null ? Number(i.valorUnitarioMensal) : Number.NaN;
    if (Number.isFinite(q) && Number.isFinite(v)) {
      total += q * v;
      usados += 1;
    }
  }
  return usados > 0 ? total : null;
}
