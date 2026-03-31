import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Link inválido ou incompleto"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
