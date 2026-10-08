import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the free pilot",
  description:
    "Create your PracticeNudge account and join the free pilot: a checklist, a secure upload link and automatic reminders for your clients' MTD records.",
  alternates: { canonical: "https://www.practicenudge.com/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}