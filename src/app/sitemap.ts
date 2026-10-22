import type { MetadataRoute } from "next";

import { listPublishedProductSlugs } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

const PAGES = ["/", "/terms", "/privacy", "/cookies"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublishedProductSlugs();

  return [...PAGES, ...products.map(({ slug }) => `/products/${slug}`)].map(
    (path) => ({ url: new URL(path, SITE_URL).href }),
  );
}
