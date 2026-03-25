"use client";

import { useEffect } from "react";

/** Registra SW mínimo em produção (instalabilidade PWA / “Adicionar à tela inicial”). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
