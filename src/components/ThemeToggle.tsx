import { Icon } from "@iconify/react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      title={isDark ? "Jasny motyw" : "Ciemny motyw"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-sm border bg-surface text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <Icon
        icon={isDark ? "solar:sun-2-bold" : "solar:moon-stars-bold"}
        width={18}
        height={18}
        aria-hidden
      />
    </button>
  );
}
