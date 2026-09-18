import { cache } from "react";

import prisma from "@/lib/prisma";

export function listPublishedProducts() {
  return prisma.product.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      priceCents: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { path: true, alt: true },
      },
    },
  });
}

export type ProductListItem = Awaited<
  ReturnType<typeof listPublishedProducts>
>[number];

export function listPublishedProductsForCart() {
  return prisma.product.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      priceCents: true,
      stock: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { path: true, alt: true },
      },
    },
  });
}

export type CartProduct = Awaited<
  ReturnType<typeof listPublishedProductsForCart>
>[number];

export function listPublishedProductSlugs() {
  return prisma.product.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
}

// Cached because generateMetadata and the page body both ask for the same row.
export const getPublishedProductBySlug = cache((slug: string) =>
  prisma.product.findUnique({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      name: true,
      summary: true,
      description: true,
      variety: true,
      priceCents: true,
      stock: true,
      netWeightGrams: true,
      composition: true,
      origin: true,
      storage: true,
      bestBefore: true,
      allergenInfo: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, path: true, alt: true },
      },
    },
  }),
);

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getPublishedProductBySlug>>
>;
