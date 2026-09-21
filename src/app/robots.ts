import type { MetadataRoute } from "next";

/** App privada tras login: nada indexable. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
