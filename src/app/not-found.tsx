import Link from "next/link";
import { Building2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
          <Building2 className="h-9 w-9 text-primary-foreground" />
        </div>
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-muted-foreground">Esta página no existe o fue movida.</p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
