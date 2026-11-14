import { cache } from "react";

import prisma from "@/lib/prisma";
import {
  activePromotionQuery,
  sofiaToday,
  withPromotion,
} from "@/lib/promotions";

export async function listPublishedProducts() {
  const products = await prisma.product.findMany({
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
      promotions: activePromotionQuery(sofiaToday()),
    },
  });

  return products.map(withPromotion);
}

export type ProductListItem = Awaited<
  ReturnType<typeof listPublishedProducts>
>[number];

export async function listPublishedProductsForCart() {
  const products = await prisma.product.findMany({
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
      promotions: activePromotionQuery(sofiaToday()),
    },
  });

  return products.map(withPromotion);
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

export const getPublishedProductBySlug = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
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
      promotions: activePromotionQuery(sofiaToday()),
    },
  });

  return product && withPromotion(product);
});

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getPublishedProductBySlug>>
>;

export function listPublishedProductsForTodos() {
  return prisma.product.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      summary: true,
      description: true,
      variety: true,
      netWeightGrams: true,
      composition: true,
      origin: true,
      storage: true,
      bestBefore: true,
      allergenInfo: true,
    },
  });
}
