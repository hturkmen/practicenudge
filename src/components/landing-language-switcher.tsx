"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Locale, localeNames, locales } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";

export function LandingLanguageSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const newLocale = value as Locale;
    startTransition(async () => {
      await setUserLocale(newLocale);
      window.location.reload();
    });
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[130px] h-9 text-sm border border-border bg-white hover:bg-gray-50 text-slate-900 rounded-md gap-2 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc} className="text-sm">
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
