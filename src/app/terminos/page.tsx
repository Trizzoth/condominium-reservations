import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos | Reservas Condominio",
  description: "Condiciones de uso de Reservas Condominio.",
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Términos y condiciones</h1>
        <p className="text-sm text-muted-foreground">Última actualización: septiembre 2026</p>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Uso del servicio</h2>
          <p className="text-sm text-muted-foreground">
            La cuenta es personal e intransferible. Eres responsable de las reservas que crees y
            de cancelar a tiempo si no vas a asistir.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Reservas</h2>
          <p className="text-sm text-muted-foreground">
            Toda reserva requiere aprobación de la administración. El no-show reiterado puede
            limitar tu uso según las reglas de tu condominio.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Conducta</h2>
          <p className="text-sm text-muted-foreground">
            Reportes falsos o mal uso del sistema pueden llevar a la suspensión de la cuenta por
            parte de la administración.
          </p>
        </section>
      </div>
    </div>
  );
}
