import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { formatDeadlineDate, nextDeadline } from "@/lib/mtd-deadlines";

export function DeadlineBanner() {
  const now = new Date();
  const next = nextDeadline(now);
  if (!next) return null;

  const days = Math.max(0, Math.ceil((next.date.getTime() - now.getTime()) / 86_400_000));
  const urgent = days <= 30;

  return (
    <div
      className={
        urgent
          ? "bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900"
          : "bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900"
      }
      role="region"
      aria-label="MTD deadline countdown"
    >
      <div className="max-w-[1180px] mx-auto px-6 py-2 flex items-center justify-center gap-3 flex-wrap text-[13px]">
        <Clock
          className={
            urgent
              ? "h-3.5 w-3.5 text-amber-700 dark:text-amber-400"
              : "h-3.5 w-3.5 text-teal-700 dark:text-teal-400"
          }
          aria-hidden
        />
        <span className="text-slate-700 dark:text-slate-300">
          MTD ITSA <strong>{next.label} submission</strong> deadline · {formatDeadlineDate(next.date)} ·{" "}
          <strong
            className={
              urgent
                ? "text-amber-700 dark:text-amber-400"
                : "text-teal-700 dark:text-teal-400"
            }
          >
            {days} day{days === 1 ? "" : "s"} remaining
          </strong>
        </span>
        <Link
          href="/#pricing"
          className="inline-flex items-center gap-1 font-medium text-slate-900 dark:text-white hover:underline"
        >
          Get ready
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
