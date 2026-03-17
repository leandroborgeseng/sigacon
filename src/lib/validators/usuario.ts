import { z } from "zod";
import { PerfilUsuario } from "@prisma/client";

export const usuarioCreateSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  perfil: z.nativeEnum(PerfilUsuario),
  ativo: z.boolean().default(true),
});

export const usuarioUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional().nullable(),
  perfil: z.nativeEnum(PerfilUsuario).optional(),
  ativo: z.boolean().optional(),
});

export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;
