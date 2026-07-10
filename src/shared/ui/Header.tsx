import { appEnv } from "@/shared/config/env";
import { useTheme } from "@/app/theme/ThemeProvider";
import { Button } from "@/shared/ui/Button";

type HeaderProps = {
  subtitle?: string;
  title?: string;
};

export function Header({ subtitle, title = appEnv.appName }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
            {subtitle}
          </p>
        ) : null}
      </div>
      <Button
        aria-label={`Switch to ${nextTheme} mode`}
        size="sm"
        type="button"
        variant="secondary"
        onClick={toggleTheme}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </Button>
    </header>
  );
}
