import {
  type NutritionRow,
  nutritionRows,
  WEB_NUTRITION_PER_100G,
} from "@/lib/nutrition";

const WEB_ROWS = nutritionRows(WEB_NUTRITION_PER_100G) ?? [];

const NESTED_QUESTION: Partial<Record<NutritionRow["key"], string>> = {
  saturates: "Наситени мастни киселини (от мазнините)",
  sugars: "Захари (от въглехидратите)",
};

type OwnerTodo = {
  id?: string;
  text: string;
  table?: NutritionRow[];
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
        id: "seller-vat",
        text: "Регистриран ли сте по ЗДДС? Ако да — номерът.",
        files: [TERMS],
        markers: ["TODO: регистриран ли е по ЗДДС и номер"],
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
        text: "Моля, напишете кратко резюме за вас и пчелина, в 3–4 реда. Ние ще го оформим за раздела „За нас“.",
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
      {
        text: "Това е таблицата, която е на сайта сега. Стойностите са средни от етикети на пчелен прашец в интернет. Ако имате етикет или анализ на вашия прашец и някое число е различно, напишете вашето в полето за него по-долу.",
        table: WEB_ROWS,
        files: [],
        markers: [],
      },
      ...WEB_ROWS.map((row) => ({
        id: `nutrition-${row.key}`,
        text: `${NESTED_QUESTION[row.key] ?? row.label} на 100 г`,
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
        text: "В какво качество продавате: като физическо лице, като регистриран земеделски производител или чрез фирма? В общите условия трябва да пише кой продава и в какво качество.",
        files: [TERMS],
        markers: ["TODO: правен статус"],
      },
      {
        id: "food-registration",
        text: "Трябва ли регистрация в БАБХ за продажбата на прашеца? Ако трябва и я имате — номерът и за какво е.",
        files: [TERMS],
        markers: ["TODO: регистрация в БАБХ и номер"],
      },
      {
        id: "return-costs",
        text: [
          "Как се връща стоката при отказ, както е сега:",
          "1. Купувачът плаща в офиса на Еконт стоката, доставката и таксата за наложен платеж. Доставката и таксата остават за Еконт, стоката е за вас.",
          "2. Ако се откаже до 14 дни, вие му се обаждате и уговаряте връщането.",
          "3. Той изпраща пакета до офис на Еконт в Попово и плаща пратката. Отворен пакет не се приема.",
          "4. Вие му връщате само цената на стоката, по банкова сметка, до 14 дни.",
          "Законът (чл. 54 ЗЗП) вероятно иска да върнете и първата доставка, затова при проверка от КЗП това е риск.",
          "При дефект (рекламация) доставките са за ваша сметка.",
          "Съгласен ли сте с това, или ще връщате и доставката?",
        ].join("\n"),
        files: [],
        markers: [],
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
