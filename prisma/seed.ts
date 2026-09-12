import prisma from "@/lib/prisma";

const sprockets = [
  {
    label: "alpha",
    cogs: [
      { id: 1, nickname: "first" },
      { id: 2, nickname: "second" },
    ],
  },
  { label: "beta", cogs: [{ id: 3, nickname: "third" }] },
];

async function main() {
  for (const { label, cogs } of sprockets) {
    const sprocket = await prisma.sprocket.upsert({
      where: { label },
      update: {},
      create: { label },
    });

    for (const cog of cogs) {
      await prisma.cog.upsert({
        where: { id: cog.id },
        update: { nickname: cog.nickname, sprocketId: sprocket.id },
        create: { ...cog, sprocketId: sprocket.id },
      });
    }
  }

  console.log(`Seeded ${sprockets.length} sprockets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
