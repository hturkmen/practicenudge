import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Five short answers side by side: label, a bold answer, one supporting line. */
export async function MtdFiveAnswers() {
  const t = await getTranslations("landing");

  const bands = [1, 2, 3].map((n) => ({ label: t(`fiveBand${n}`), date: t(`fiveBand${n}Date`), current: n === 1 }));
  const columns: { question: string; headline: string; body: React.ReactNode }[] = [
    { question: t("fiveQ1"), headline: t("fiveH1"), body: <p>{t("fiveB1")}</p> },
    {
      question: t("fiveQ2"),
      headline: t("fiveH2"),
      body: (
        <>
          <ul className="space-y-2">
            {bands.map((band) => (
              <li key={band.label} className={"flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-1.5 text-[15px] " + (band.current
                ? "border-[#0E2621] bg-[#0E2621] text-[#F4F1EA] dark:border-[#EEF5F1] dark:bg-[#EEF5F1] dark:text-[#0E1A17]"
                : "border-[#0E2621] text-[#0E2621] dark:border-[#EEF5F1] dark:text-[#EEF5F1]")}>
                <span>{band.label}</span>
                <span className="text-xs font-semibold opacity-80">{band.date}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-bold text-[#1F7A55] dark:text-[#6FD3A6]">{t("fiveB2")}</p>
        </>
      ),
    },
    { question: t("fiveQ3"), headline: t("fiveH3"), body: <p>{t("fiveB3")}</p> },
    { question: t("fiveQ4"), headline: t("fiveH4"), body: <p>{t("fiveB4")}</p> },
    {
      question: t("fiveQ5"),
      headline: t("fiveH5"),
      body: (
        <>
          <p>{t("fiveB5")}</p>
          <p className="mt-3 inline-block rounded-md bg-[#BCEBD5] px-2 py-0.5 font-bold text-[#0E2621] dark:bg-[#1E5A44] dark:text-[#E9FFF4]">{t("fiveChip5")}</p>
        </>
      ),
    },
  ];

  return (
    <section id="mtd" aria-labelledby="mtd-five-title" className="bg-[#F4F1EA] px-6 py-16 text-[#0E2621] dark:bg-[#0E1A17] dark:text-[#EEF5F1]">
      <div className="mx-auto max-w-[1180px]">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1F7A55] dark:text-[#6FD3A6]">{t("fiveEyebrow")}</p>
        <h2 id="mtd-five-title" className="mb-6 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">{t("fiveTitle")}</h2>

        <ol className="grid border-t-2 border-[#0E2621] bg-white sm:grid-cols-2 lg:grid-cols-5 dark:border-[#EEF5F1] dark:bg-[#13221E]">
          {columns.map((column, i) => (
            <li key={i} className="min-w-0 border-b border-[#E5E0D3] p-6 sm:border-r lg:border-b-0 dark:border-[#2A3A35]">
              <p className="mb-3 text-[15px]">
                <span className="font-bold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[#4A5A55] dark:text-[#9FB3AB]"> · {column.question}</span>
              </p>
              <h3 className="mb-4 break-words text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] xl:text-[32px]">{column.headline}</h3>
              <div className="text-[15px] leading-relaxed text-[#2E403B] dark:text-[#C9D8D2]">{column.body}</div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/register" className="inline-flex h-12 items-center rounded-full bg-[#0E2621] px-7 text-[15px] font-semibold text-[#F4F1EA] transition-colors hover:bg-[#1A3A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A55] focus-visible:ring-offset-2 dark:bg-[#EEF5F1] dark:text-[#0E1A17] dark:hover:bg-white">
            {t("ctaPrimary")}
          </Link>
          <p className="text-sm text-[#4A5A55] dark:text-[#9FB3AB]">{t("ctaSubtext")}</p>
        </div>
      </div>
    </section>
  );
}
