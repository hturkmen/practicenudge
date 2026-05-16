import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { isRtl } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.practicenudge.com"),
  title: {
    default: "PracticeNudge — MTD Client Readiness Tracking for UK Accountants",
    template: "%s | PracticeNudge",
  },
  description:
    "Free MTD client tracking tool for UK accountants. See which clients are MTD-ready, chase missing documents, send reminders — built for small practices managing Making Tax Digital compliance.",
  keywords: [
    "MTD",
    "Making Tax Digital",
    "MTD ITSA",
    "MTD client tracking",
    "MTD readiness",
    "UK accountants",
    "accountant software",
    "client document tracking",
    "MTD compliance tool",
    "small practice software",
    "sole trader MTD",
    "landlord MTD",
    "HMRC quarterly reporting",
    "MTD 2026",
    "free MTD tool",
    "document collection accountants",
    "client chasing tool",
  ],
  authors: [{ name: "PracticeNudge" }],
  creator: "PracticeNudge",
  publisher: "PracticeNudge",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.practicenudge.com",
    siteName: "PracticeNudge",
    title: "PracticeNudge — MTD Client Readiness Tracking for UK Accountants",
    description:
      "Free MTD client tracking tool for UK accountants. Stop chasing clients for documents. See who's MTD-ready, send reminders, track compliance — all in one dashboard.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PracticeNudge — MTD Client Readiness Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PracticeNudge — MTD Client Tracking for UK Accountants",
    description:
      "Free tool to track MTD readiness, chase documents, and send reminders. Built for small UK practices.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.practicenudge.com",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = isRtl(locale as Locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={cn("font-sans", geistSans.variable)}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-B8P1PZSHZ9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B8P1PZSHZ9');
          `}
        </Script>
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
