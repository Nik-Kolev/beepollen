type OwnerTodo = {
  id?: string;
  text: string;
  files: string[];
  markers: string[];
};

type OwnerTodoGroup = { title: string; items: OwnerTodo[] };

const TERMS = "src/app/(shop)/terms/page.tsx";
const PRIVACY = "src/app/(shop)/privacy/page.tsx";
const COOKIES = "src/app/(shop)/cookies/page.tsx";

export const OWNER_TODOS: OwnerTodoGroup[] = [
  {
    title: "Продавач и правни данни",
    items: [
      {
        id: "seller-name-address",
        text: "Име и правен статус, адрес по регистрация и за кореспонденция.",
        files: [TERMS],
        markers: [
          "TODO: име и правен статус",
          "TODO: адрес по регистрация и адрес за кореспонденция",
          "TODO: име на продавача, адрес и имейл",
        ],
      },
      {
        id: "seller-registration",
        text: "ЕИК, БУЛСТАТ или номер на земеделски производител и регистрация по ЗДДС.",
        files: [TERMS],
        markers: [
          "TODO: ЕИК, БУЛСТАТ или номер на земеделски производител",
          "TODO: регистриран ли е по ЗДДС и номер",
        ],
      },
      {
        id: "seller-babh",
        text: "Регистрация в БАБХ и номер.",
        files: [TERMS],
        markers: ["TODO: регистрация в БАБХ и номер"],
      },
      {
        id: "contact-email",
        text: "Имейл за контакт.",
        files: [TERMS, PRIVACY],
        markers: ["TODO: имейл"],
      },
      {
        id: "data-controller",
        text: "Администратор на личните данни: име, адрес, телефон и имейл.",
        files: [PRIVACY],
        markers: ["TODO: име, адрес, телефон и имейл на администратора"],
      },
      {
        id: "publication-date",
        text: "Дата на публикуване на общите условия, поверителността и бисквитките.",
        files: [TERMS, PRIVACY, COOKIES],
        markers: ["TODO: дата на публикуване"],
      },
    ],
  },
  {
    title: "Доставка, плащане, връщане и спорове",
    items: [
      {
        id: "cod-fee",
        text: "Кой поема таксата на Еконт за наложения платеж.",
        files: [TERMS],
        markers: ["TODO: кой поема таксата на Еконт за наложения платеж"],
      },
      {
        id: "return-address",
        text: "Адрес за връщане на стоката.",
        files: [TERMS],
        markers: ["TODO: адрес за връщане"],
      },
      {
        id: "dispute-body",
        text: "Органът за алтернативно решаване на спорове и адресът на сайта му.",
        files: [TERMS],
        markers: [
          "TODO: компетентната обща помирителна комисия към Комисията за защита на потребителите и адресът на сайта ѝ",
        ],
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
        text: "Срокът по Закона за счетоводството, потвърден от счетоводител, и кой е счетоводителят.",
        files: [PRIVACY],
        markers: [
          "TODO: срокът по Закона за счетоводството, потвърден от счетоводителя",
          "TODO: счетоводител — счетоводните документи.",
        ],
      },
      {
        id: "hosting",
        text: "Хостинг доставчикът и регионът на сървъра.",
        files: [PRIVACY],
        markers: [
          "TODO: хостинг доставчик и регион на сървъра — базата данни на магазина.",
        ],
      },
      {
        id: "offers-sender",
        text: "Кой ще изпраща офертите и напомнянията по имейл.",
        files: [PRIVACY],
        markers: ["TODO: кой изпраща офертите и напомнянията по имейл."],
      },
    ],
  },
  {
    title: "Измислени числа — изтриват се при старта",
    items: [
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
        text: "Посетителите и източниците в статистиката (TODO_VISITORS). Заменят се от Google Analytics.",
        files: ["src/lib/analytics.ts"],
        markers: ["TODO_VISITORS"],
      },
      {
        text: "„TODO: цена“ се показва навсякъде, където продукт няма цена.",
        files: [
          "src/app/(shop)/products/[slug]/page.tsx",
          "src/components/product-card.tsx",
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
        text: "Хранителната информация и описанието на всеки продукт. Какво още липсва в базата, е по-горе.",
        files: ["prisma/seed.ts"],
        markers: [
          "TODO: състав",
          "TODO: страна на добив",
          "TODO: условия на съхранение",
          "TODO: срок на годност",
          "TODO: алергени",
        ],
      },
      {
        id: "producers",
        text: "Имената и текстът за двамата пчелари, и техни снимки.",
        files: ["src/components/about-producers.tsx"],
        markers: ["TODO: име на първия пчелар", "TODO: име на втория пчелар"],
      },
    ],
  },
  {
    title: "Отворени въпроси",
    items: [
      {
        id: "farmer-status",
        text: "Регистриран земеделски производител ли е продавачът? От това зависят правният статус, номерът и ДДС.",
        files: [],
        markers: [],
      },
      {
        id: "nutrition-declaration",
        text: "Нужна ли е хранителна декларация за прашеца? Решава БАБХ.",
        files: [],
        markers: [],
      },
      {
        id: "bio-certificate",
        text: "Има ли сертификат за биологично производство? Без него продуктите не се наричат „био“.",
        files: [],
        markers: [],
      },
      {
        id: "withdrawal-exception",
        text: "Важи ли за прашеца някое изключение от правото на отказ в 14 дни?",
        files: [],
        markers: [],
      },
    ],
  },
];

export const PRODUCT_FIELD_LABEL = {
  summary: "Кратко описание",
  description: "Описание",
  variety: "Сорт",
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
