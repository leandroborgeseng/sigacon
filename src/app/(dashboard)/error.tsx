"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-destructive">Erro na página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro ao carregar. Abra o Console do navegador (F12 → Console) para ver os detalhes.
          </p>
          <p className="text-xs text-muted-foreground font-mono break-all">
            {error.message}
          </p>
          <Button onClick={reset} variant="outline">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
