"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/components/ThemeProvider";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
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

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className="relative grid h-7 w-7 place-items-center rounded-full text-slate-500 transition-colors hover:text-slate-900"
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-pill"
                className="absolute inset-0 rounded-full bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
          </button>
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
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:text-indigo-600 ${className}`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="grid place-items-center"
        >
          {isDark ? (
            <Moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4" aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
