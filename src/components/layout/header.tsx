"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

interface HeaderProps {
  firmName?: string;
  userEmail?: string;
}

export function Header({ firmName, userEmail }: HeaderProps) {
  const initials = firmName
    ? firmName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Spacer for mobile hamburger button */}
      <div className="w-10 lg:w-0" />
      <div className="flex items-center gap-2 md:gap-3 ml-auto">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{firmName}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
