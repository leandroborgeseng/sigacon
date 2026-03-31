import type { MetadataRoute } from "next";
import { APP_BRAND } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_BRAND.name} — Gestão contratual`,
    short_name: APP_BRAND.name,
    description: APP_BRAND.description,
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
