import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import {
  countSubscribers,
  PERIOD_LABEL,
  PERIODS,
  rankedSources,
  TRAFFIC_SOURCE_LABEL,
} from "@/lib/analytics";
import { requireAdmin } from "@/lib/admin-session";
import { type VisitorReport, visitorReport } from "@/lib/ga4";

export const metadata: Metadata = {
  title: "Статистика",
};

const count = new Intl.NumberFormat("bg-BG");

function notice(report: VisitorReport) {
  if (report.status === "unconfigured") {
    return "Google Analytics още не е свързан с админа, затова посетителите и източниците липсват. Абонатите са истински.";
  }
  if (report.status === "failed") {
    return "Google Analytics не отговори, затова посетителите и източниците липсват. Опитайте отново след малко. Абонатите са истински.";
  }
  if (report.preLaunch) {
    return "Тестов трафик — преди пускането. Посетителите и източниците са от Google Analytics, но са посещенията докато сайтът се прави. Абонатите са истински.";
  }
  return null;
}

export default async function AdminAnalytics() {
  const { email } = await requireAdmin("/admin/analytics");
  const now = new Date();
  const [report, subscribers] = await Promise.all([
    visitorReport(now),
    countSubscribers(now),
  ]);
  const message = notice(report);

  return (
    <div className="w-full">
      <AdminHeader
        title="Статистика"
        email={email}
        current="/admin/analytics"
        legend="Колко хора са разгледали сайта, откъде са дошли и колко са се записали за оферти по имейл."
      />

      {message && (
        <p className="bg-surface ring-honey mt-4 rounded-xl p-4 text-sm font-medium ring-2">
          {message}
        </p>
      )}

      <ul role="list" className="mt-4 grid gap-4 lg:grid-cols-3">
        {PERIODS.map((period) => {
          const stats = report.status === "ok" ? report.stats[period] : null;
          const sources = stats ? rankedSources(stats) : [];
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
                      {stats ? count.format(stats.visitors) : "—"}
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
                {stats ? (
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
                ) : (
                  <p className="mt-2 text-sm">Няма данни.</p>
                )}
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
        <li>
          Абонат е купувач, отметнал „оферти по имейл“ при поръчка. Отписаните
          не се броят.
        </li>
        <li>
          Всеки абонат се брои веднъж, в деня на първата поръчка с отметката от
          последното отписване насам.
        </li>
      </ul>
    </div>
  );
}
