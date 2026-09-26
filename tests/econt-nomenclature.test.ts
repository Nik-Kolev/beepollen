import assert from "node:assert/strict";
import { test } from "node:test";

import {
  businessHours,
  parseEcontOffices,
  streetLine,
} from "@/lib/econt-nomenclature";

const OPENS_AT_NINE = Date.UTC(2026, 8, 24, 6, 0);
const CLOSES_AT_SIX = Date.UTC(2026, 8, 24, 15, 0);

function rawOffice(overrides: Record<string, unknown> = {}) {
  return {
    code: "1127",
    name: "София",
    isAPS: false,
    phones: ["+359 2 000 0000"],
    normalBusinessHoursFrom: OPENS_AT_NINE,
    normalBusinessHoursTo: CLOSES_AT_SIX,
    address: {
      fullAddress: "София ул. Тестова 1",
      city: { name: "София", postCode: "1000" },
      location: { latitude: 42.7, longitude: 23.3 },
    },
    ...overrides,
  };
}

test("maps a well-formed office into the shape the snapshot stores", () => {
  const [office] = parseEcontOffices({ offices: [rawOffice()] });

  assert.deepEqual(office, {
    code: "1127",
    name: "София",
    city: "София",
    postCode: "1000",
    street: "ул. Тестова 1",
    hours: "09:00 – 18:00",
    phone: "+359 2 000 0000",
    location: { lat: 42.7, lng: 23.3 },
  });
});

test("drops a malformed entry rather than emptying the picker", () => {
  const offices = parseEcontOffices({
    offices: [rawOffice(), { code: 42 }, null, rawOffice({ code: "7802" })],
  });

  assert.deepEqual(
    offices.map((office) => office.code),
    ["1127", "7802"],
  );
});

test("drops an automated station, which takes card only", () => {
  const offices = parseEcontOffices({
    offices: [rawOffice({ isAPS: true }), rawOffice({ code: "7802" })],
  });

  assert.deepEqual(
    offices.map((office) => office.code),
    ["7802"],
  );
});

test("keeps an office whose coordinates are both null, off the map", () => {
  const [office] = parseEcontOffices({
    offices: [
      rawOffice({
        address: {
          fullAddress: "Нови Искър кв. ЖП гара",
          city: { name: "Нови Искър", postCode: null },
          location: { latitude: null, longitude: null },
        },
      }),
    ],
  });

  assert.equal(office.location, null);
  assert.equal(office.postCode, null);
});

test("throws on a payload that is not an office list", () => {
  assert.throws(
    () => parseEcontOffices({ error: "nope" }),
    /unrecognised payload/,
  );
  assert.throws(() => parseEcontOffices(null), /unrecognised payload/);
});

test("orders the list by city, then by office name, in Bulgarian", () => {
  const offices = parseEcontOffices({
    offices: [
      rawOffice({
        code: "b",
        name: "Ямбол",
        address: {
          fullAddress: "Ямбол ул. Една 1",
          city: { name: "Ямбол", postCode: "8600" },
          location: null,
        },
      }),
      rawOffice({ code: "a", name: "София Бенковски" }),
      rawOffice({ code: "c", name: "София Аксаков" }),
    ],
  });

  assert.deepEqual(
    offices.map((office) => office.code),
    ["c", "a", "b"],
  );
});

test("strips a repeated city prefix from the street line, and nothing else", () => {
  assert.equal(streetLine("София ул. Тестова 1", "София"), "ул. Тестова 1");
  assert.equal(streetLine("ул. Тестова 1", "София"), "ул. Тестова 1");
  assert.equal(streetLine("Софийско шосе 2", "София"), "Софийско шосе 2");
});

test("reads a round-the-clock window as Денонощно", () => {
  assert.equal(
    businessHours(Date.UTC(2026, 8, 23, 21, 0), Date.UTC(2026, 8, 24, 20, 59)),
    "Денонощно",
  );
  assert.equal(businessHours(OPENS_AT_NINE, CLOSES_AT_SIX), "09:00 – 18:00");
});
