import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad | Reservas Condominio",
  description: "Cómo se usan y protegen tus datos en Reservas Condominio.",
  robots: { index: false, follow: false },
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Política de privacidad</h1>
        <p className="text-sm text-muted-foreground">Última actualización: septiembre 2026</p>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Qué datos guardamos</h2>
          <p className="text-sm text-muted-foreground">
            Nombre, apartamento, teléfono, correo y tus reservas de áreas comunes. Las fotos que
            subas (incidencias, perfil) se guardan para mostrarlas en la app.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Para qué se usan</h2>
          <p className="text-sm text-muted-foreground">
            Solo para operar las reservas: aprobaciones, check-in en seguridad, avisos por correo
            y notificaciones dentro de la app. No se venden ni se comparten con terceros.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Tus derechos</h2>
          <p className="text-sm text-muted-foreground">
            Puedes pedir ver, corregir o borrar tus datos escribiendo a la administración de tu
            condominio.
          </p>
        </section>
      </div>
    </div>
  );
}
