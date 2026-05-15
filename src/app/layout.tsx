import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "PracticeNudge — MTD Client Readiness Tracking for UK Accountants",
  description:
    "Stop chasing clients for MTD information. See which clients are MTD-ready, what's missing, and who needs a nudge — built for small UK practices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geistSans.variable)}>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
