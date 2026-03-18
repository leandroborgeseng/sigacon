import { z } from "zod";
import { StatusMarcoImplantacao, StatusParcelaPagamento } from "@prisma/client";

export const aditivoContratoSchema = z.object({
  numeroAditivo: z.string().min(1, "Número do aditivo obrigatório"),
  dataRegistro: z.coerce.date(),
  objeto: z.string().optional().nullable(),
  valorAnterior: z.coerce.number().min(0).optional().nullable(),
  valorNovo: z.coerce.number().min(0).optional().nullable(),
  vigenciaFimAnterior: z.coerce.date().optional().nullable(),
  vigenciaFimNova: z.coerce.date().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const marcoImplantacaoSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  dataPrevista: z.coerce.date(),
  dataRealizada: z.coerce.date().optional().nullable(),
  status: z.nativeEnum(StatusMarcoImplantacao).optional(),
  ordem: z.coerce.number().int().optional(),
});

export const parcelaPagamentoSchema = z.object({
  competenciaAno: z.coerce.number().int().min(2000).max(2100),
  competenciaMes: z.coerce.number().int().min(1).max(12),
  descricao: z.string().max(500).optional().nullable(),
  valorPrevisto: z.coerce.number().min(0),
  valorPago: z.coerce.number().min(0).optional().nullable(),
  dataVencimento: z.coerce.date().optional().nullable(),
  dataPagamento: z.coerce.date().optional().nullable(),
  numeroNf: z.string().max(80).optional().nullable(),
  status: z.nativeEnum(StatusParcelaPagamento).optional(),
  observacao: z.string().optional().nullable(),
});
