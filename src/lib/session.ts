import { cookies } from "next/headers";

const SESSION_COOKIE = "sigacon_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export interface SessionUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres");
  }
  return secret;
}

function encode(data: SessionUser): string {
  const secret = getSecret();
  const text = JSON.stringify(data);
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length)
    );
  }
  return Buffer.from(result, "binary").toString("base64url");
}

function decode(token: string): SessionUser | null {
  try {
    const secret = getSecret();
    const binary = Buffer.from(token, "base64url").toString("binary");
    let result = "";
    for (let i = 0; i < binary.length; i++) {
      result += String.fromCharCode(
        binary.charCodeAt(i) ^ secret.charCodeAt(i % secret.length)
      );
    }
    return JSON.parse(result) as SessionUser;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = encode(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decode(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
