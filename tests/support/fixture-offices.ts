import type { EcontOfficeRecord } from "@/lib/econt";

function office(
  code: string,
  city: string,
  name: string,
  street: string,
  location: EcontOfficeRecord["location"],
): EcontOfficeRecord {
  return {
    code,
    name,
    city,
    postCode: "0000",
    street,
    hours: "09:00 – 18:00",
    phone: "+359 2 000 0000",
    location,
  };
}

function near(step: number): EcontOfficeRecord["location"] {
  return { lat: 43.1 + step * 0.002, lng: 25.1 + step * 0.002 };
}

export const SMALL_CITY = "Пробна Малка";
export const SMALL_CITY_OFFICE_A = {
  code: "TEST-S1",
  heading: `${SMALL_CITY}, офис ${SMALL_CITY}`,
  street: "ул. Първа №1",
};
export const SMALL_CITY_OFFICE_B = {
  code: "TEST-S2",
  heading: `${SMALL_CITY}, офис Липите`,
  street: "ул. Втора №2",
};

export const LARGE_CITY = "Пробно Средно";
export const LARGE_CITY_OFFICES = 6;

export const BIG_CITY = "Пробно Голямо";
export const BIG_CITY_OFFICES = 12;
export const BIG_CITY_SEARCH_TERM = "Витоша";
export const BIG_CITY_SEARCH_MATCHES = 3;

export const SINGLE_OFFICE_CITY = "Пробно Единично";

export const NO_COORDS_CITY = "Пробно Без Карта";
export const NO_COORDS_OFFICE_STREET = "кв. Гара ул. Трета №3";

export const FIXTURE_OFFICES: EcontOfficeRecord[] = [
  office(
    SMALL_CITY_OFFICE_A.code,
    SMALL_CITY,
    SMALL_CITY,
    SMALL_CITY_OFFICE_A.street,
    near(0),
  ),
  office(
    SMALL_CITY_OFFICE_B.code,
    SMALL_CITY,
    `${SMALL_CITY} Липите`,
    SMALL_CITY_OFFICE_B.street,
    near(1),
  ),
  ...Array.from({ length: LARGE_CITY_OFFICES }, (_, index) =>
    office(
      `TEST-L${index + 1}`,
      LARGE_CITY,
      `${LARGE_CITY} Център ${index + 1}`,
      `ул. Средна №${index + 1}`,
      near(10 + index),
    ),
  ),
  ...Array.from({ length: BIG_CITY_OFFICES }, (_, index) =>
    office(
      `TEST-B${index + 1}`,
      BIG_CITY,
      index < BIG_CITY_SEARCH_MATCHES
        ? `${BIG_CITY} ${BIG_CITY_SEARCH_TERM} ${index + 1}`
        : `${BIG_CITY} Изток ${index + 1}`,
      `бул. Голям №${index + 1}`,
      near(30 + index),
    ),
  ),
  office(
    "TEST-U1",
    SINGLE_OFFICE_CITY,
    SINGLE_OFFICE_CITY,
    "ул. Единствена №1",
    near(50),
  ),
  office(
    "TEST-N1",
    NO_COORDS_CITY,
    NO_COORDS_CITY,
    NO_COORDS_OFFICE_STREET,
    null,
  ),
];
