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
