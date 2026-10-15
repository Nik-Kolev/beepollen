import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import {
  countSubscribers,
  PERIOD_LABEL,
  PERIODS,
  TRAFFIC_SOURCE_LABEL,
  TRAFFIC_SOURCES,
  visitorStats,
} from "@/lib/analytics";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Статистика",
};

const count = new Intl.NumberFormat("bg-BG");

export default async function AdminAnalytics() {
  const { email } = await requireAdmin();
  const visitors = visitorStats();
  const subscribers = await countSubscribers(new Date());

  return (
    <div className="w-full">
      <AdminHeader
        title="Статистика"
        email={email}
        current="/admin/analytics"
        legend="Колко хора са разгледали сайта, откъде са дошли и колко са се записали за оферти по имейл."
      />

      <p className="bg-surface ring-honey mt-4 rounded-xl p-4 text-sm font-medium ring-2">
        Посетителите и източниците са примерни числа, докато сайтът не бъде
        свързан с Google Analytics. Абонатите са истински.
      </p>

      <ul role="list" className="mt-4 grid gap-4 lg:grid-cols-3">
        {PERIODS.map((period) => {
          const stats = visitors[period];
          const sources = TRAFFIC_SOURCES.map((source) => ({
            source,
            visitors: stats.sources[source],
          })).sort((a, b) => b.visitors - a.visitors);
          const sourced = sources.reduce((sum, s) => sum + s.visitors, 0);

          return (
            <li key={period}>
              <section
                aria-labelledby={`period-${period}`}
                className="bg-surface ring-line h-full rounded-xl p-4 shadow-sm ring-1 sm:p-6"
              >
                <h2 id={`period-${period}`} className="text-lg font-semibold">
                  {PERIOD_LABEL[period]}
                </h2>

                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-ground rounded-lg p-3 text-center">
                    <dt className="text-ink-soft text-sm">Посетители</dt>
                    <dd className="text-brand-deep font-head text-3xl font-bold tabular-nums">
                      {count.format(stats.visitors)}
                    </dd>
                  </div>
                  <div className="bg-ground rounded-lg p-3 text-center">
                    <dt className="text-ink-soft text-sm">Абонати</dt>
                    <dd className="text-leaf font-head text-3xl font-bold tabular-nums">
                      {count.format(subscribers[period])}
                    </dd>
                  </div>
                </dl>

                <h3 className="text-ink-soft mt-5 text-sm font-semibold">
                  Откъде идват
                </h3>
                <ul
                  role="list"
                  className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2"
                >
                  {sources.map(({ source, visitors: n }) => {
                    const percent =
                      sourced > 0 ? Math.round((n / sourced) * 100) : 0;
                    return (
                      <li
                        key={source}
                        className="col-span-3 grid grid-cols-subgrid items-center text-sm"
                      >
                        <span>{TRAFFIC_SOURCE_LABEL[source]}</span>
                        <span
                          aria-hidden="true"
                          className="bg-ground h-3 overflow-hidden rounded-full"
                        >
                          <span
                            className="bg-brand-deep block h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="text-right font-semibold whitespace-nowrap tabular-nums">
                          {percent}% ({count.format(n)})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </li>
          );
        })}
      </ul>

      <ul
        role="list"
        className="text-ink-soft mt-4 flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm"
      >
        <li>
          Посетителите се броят само ако са приели бисквитките, затова реалният
          брой е малко по-голям.
        </li>
        <li>„Директно“ значи въведен адрес или запазена връзка.</li>
        <li>Абонат е всеки купувач, отметнал „оферти по имейл“ при поръчка.</li>
        <li>Всеки абонат се брои веднъж, в деня на първата си отметка.</li>
      </ul>
    </div>
  );
}
