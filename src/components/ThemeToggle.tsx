"use client";

import { m as Motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, type ThemeChoice } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/Button";

const OPTIONS: { value: ThemeChoice; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "system", Icon: Monitor },
  { value: "dark", Icon: Moon },
];

/**
 * Segmented theme switcher.
 *
 * Three states rather than a two-way toggle: "follow my OS" is what most people
 * actually want, and it is the default. The active pill is a shared layout
 * element, so it slides between options instead of blinking.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 p-0.5 ${className}`}
      role="radiogroup"
      aria-label={t("label")}
    >
      {OPTIONS.map(({ value, Icon }) => {
        const active = theme === value;
        return (
          <Button variant="unstyled"
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(value)}
            title={t(value)}
            onClick={() => setTheme(value)}
            className="relative grid min-h-11 min-w-11 place-items-center rounded-full text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {active && (
              <Motion.span
                layoutId="theme-toggle-pill"
                className="absolute inset-0 rounded-full bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Compact one-tap switch for tight spots (mobile drawer, dropdowns).
 * The sun/moon cross-fades and rotates as it changes.
 */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const t = useTranslations("theme");
  const isDark = resolvedTheme === "dark";
  const targetModeLabel = t(isDark ? "switchToLight" : "switchToDark");

  return (
    <Button variant="unstyled"
      type="button"
      onClick={toggleTheme}
      aria-label={targetModeLabel}
      title={targetModeLabel}
      className={`relative grid min-h-11 min-w-11 place-items-center rounded-control border border-slate-200 bg-white text-slate-600 transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
    >
      <span className="grid place-items-center" aria-hidden="true">
        {isDark?<Moon className="h-4 w-4"/>:<Sun className="h-4 w-4"/>}
      </span>
    </Button>
  );
}
