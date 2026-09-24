import { cache } from "react";

import { officeLabel, sortOffices, type EcontOffice } from "@/lib/econt";
import prisma from "@/lib/prisma";

export const listEcontOffices = cache(async (): Promise<EcontOffice[]> => {
  const rows = await prisma.deliveryOffice.findMany({
    where: { carrier: "ECONT" },
    select: {
      code: true,
      name: true,
      city: true,
      postCode: true,
      street: true,
      hours: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
  });

  const offices = rows.map(({ latitude, longitude, ...office }) => ({
    ...office,
    label: officeLabel(office.name, office.city),
    location:
      latitude !== null && longitude !== null
        ? { lat: latitude, lng: longitude }
        : null,
  }));

  return sortOffices(offices);
});
