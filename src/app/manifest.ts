import type { MetadataRoute } from "next";

/** Web App Manifest: hace instalable la app (Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reservas Condominio",
    short_name: "Reservas",
    description: "Reserva áreas comunes de tu condominio",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0ea5e9",
    lang: "es",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
