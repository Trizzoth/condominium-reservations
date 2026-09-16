"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

/** Captura errores fatales (reemplaza todo el árbol, incluye html/body). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Algo salió mal</h1>
          <p className="mt-2 text-muted-foreground">
            Ocurrió un error inesperado. Ya quedó registrado para revisarlo.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium"
            >
              Reintentar
            </button>
            <Link
              href="/dashboard"
              className="border border-input bg-background hover:bg-accent h-10 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
