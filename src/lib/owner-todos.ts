import { nutritionRows, WEB_NUTRITION_PER_100G } from "@/lib/nutrition";
import { PRODUCERS } from "@/lib/producers";

type OwnerTodo = {
  id?: string;
  text: string;
  files: string[];
  markers: string[];
};

type OwnerTodoGroup =
  | { title: string; developerOnly?: false; items: OwnerTodo[] }
  | { title: string; developerOnly: true; items: Omit<OwnerTodo, "id">[] };

const TERMS = "src/app/(shop)/terms/page.tsx";
const PRIVACY = "src/app/(shop)/privacy/page.tsx";
const COOKIES = "src/app/(shop)/cookies/page.tsx";

export const OWNER_TODOS: OwnerTodoGroup[] = [
  {
    title: "Продавач и правни данни",
    items: [
      {
        id: "seller-registration-whose",
        text: "Кой от двата номера, 179940540 или 179876340, е на Димитър — продавача, и регистриран ли е по ЗДДС.",
        files: [TERMS],
        markers: [
          "TODO: ЕИК, БУЛСТАТ или номер на земеделски производител",
          "TODO: регистриран ли е по ЗДДС и номер",
        ],
      },
      {
        id: "seller-babh-whose",
        text: "Кой от двата номера в БАБХ, 7855-0041 или 7864-0152, е на Димитър — продавача.",
        files: [TERMS],
        markers: ["TODO: регистрация в БАБХ и номер"],
      },
    ],
  },
  {
    title: "Лични данни",
    items: [
      {
        id: "order-retention",
        text: "Колко дълго се пазят поръчките и данните за контакт.",
        files: [PRIVACY],
        markers: ["TODO: срок за поръчките и за данните за контакт на клиента"],
      },
      {
        id: "accounting-retention",
        text: "Имате ли счетоводител, и колко години според него трябва да се пазят документите за продажбите? Името му не е нужно.",
        files: [PRIVACY],
        markers: [
          "TODO: срокът по Закона за счетоводството, потвърден от счетоводителя",
          "TODO: счетоводител — счетоводните документи.",
        ],
      },
    ],
  },
  {
    title: "Попълват се при старта — не се показват на собственика",
    developerOnly: true,
    items: [
      {
        text: "Дата на публикуване на общите условия, поверителността и бисквитките.",
        files: [TERMS, PRIVACY, COOKIES],
        markers: ["TODO: дата на публикуване"],
      },
      {
        text: "Цените на продуктите (TODO_PRICE). Изтриват се, не се поправят.",
        files: ["prisma/seed.ts"],
        markers: ["TODO_PRICE"],
      },
      {
        text: "Цената на доставка с Еконт (TODO_ECONT_TARIFF_CENTS). Заменя се с изчислените цени на Еконт.",
        files: ["src/lib/econt.ts", "src/lib/delivery.ts"],
        markers: ["TODO_ECONT_TARIFF_CENTS"],
      },
      {
        text: "Таксата за наложен платеж (TODO_COD_FEE_CENTS), една за Еконт и Спиди. Заменя се с таксите на куриерите.",
        files: ["src/lib/delivery.ts"],
        markers: ["TODO_COD_FEE_CENTS"],
      },
      {
        text: "„TODO: цена“ се показва навсякъде, където продукт няма цена.",
        files: [
          "src/components/product-price.tsx",
          "src/components/cart-contents.tsx",
          "src/components/checkout-form.tsx",
        ],
        markers: ["TODO: цена"],
      },
    ],
  },
  {
    title: "Продукти и „За нас“",
    items: [
      {
        id: "bio-certificate-link",
        text: "Линкът към сертификата за биологично производство и кодът на контролиращия орган (например BG-BIO-…). Без кода продуктите не може да се наричат „био“.",
        files: ["prisma/seed.ts"],
        markers: ["TODO: линк към сертификата и код на контролиращия орган"],
      },
      {
        id: "producers-text",
        text: `Текстът в „За нас“ още не се показва на сайта. Сега пише: ${PRODUCERS.map(({ name, bio }) => `${name} — „${bio}“`).join(" ")} Напишете какво да се промени.`,
        files: [],
        markers: [],
      },
    ],
  },
  {
    title: "Хранителна стойност",
    items: [
      {
        id: "nutrition-declaration",
        text: "Нужна ли е хранителна декларация за прашеца? Решава БАБХ.",
        files: [],
        markers: [],
      },
      ...(nutritionRows(WEB_NUTRITION_PER_100G) ?? [])
        .filter((row) => row.key !== "energy")
        .map((row) => ({
          id: `nutrition-${row.key}`,
          text: `${row.label} на 100 г: ${row.value}. Числото е средно от етикети на пчелен прашец в интернет и вече е на сайта — ако имате етикет или анализ на вашия прашец с друго число, напишете го. Енергийната стойност се изчислява от тези числа.`,
          files: [],
          markers: [],
        })),
    ],
  },
  {
    title: "Отворени въпроси",
    items: [
      {
        id: "farmer-status",
        text: "Регистриран земеделски производител ли е продавачът? От това зависят правният статус, номерът и ДДС.",
        files: [TERMS],
        markers: ["TODO: правен статус"],
      },
      {
        id: "sealed-packaging",
        text: "Запечатани ли са пакетите с прашец — залепени или заварени, така че да личи, ако са отваряни? Само тогава отворен пакет може да не се приема обратно.",
        files: [TERMS],
        markers: ["TODO: потвърждение, че пакетите са запечатани"],
      },
    ],
  },
];

export const OWNER_PAGE_GROUPS = OWNER_TODOS.flatMap((group) =>
  group.developerOnly ? [] : [group],
);

export const PRODUCT_FIELD_LABEL = {
  summary: "Кратко описание",
  description: "Описание",
  netWeightGrams: "Нетно количество",
  composition: "Състав",
  origin: "Произход",
  storage: "Условия на съхранение",
  bestBefore: "Срок на годност",
  allergenInfo: "Алергени",
} as const;

export type ProductField = keyof typeof PRODUCT_FIELD_LABEL;

type ProductTodoSource = { [field in ProductField]: string | number | null };

function owed(value: string | number | null) {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  return (
    value.trim() === "" ||
    value.startsWith("TODO:") ||
    value.startsWith("Lorem ipsum")
  );
}

export function owedProductFields(product: ProductTodoSource): ProductField[] {
  return (Object.keys(PRODUCT_FIELD_LABEL) as ProductField[]).filter((field) =>
    owed(product[field]),
  );
}
