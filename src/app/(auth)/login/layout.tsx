import type { Metadata } from "next";

// A sign-in form has nothing to offer a search engine.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://www.practicenudge.com/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}