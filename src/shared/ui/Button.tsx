import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: false;
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ButtonAsChildProps = {
  asChild: true;
  children: ReactElement<{ className?: string }>;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-950 text-white shadow-lg shadow-cyan-500/15 hover:bg-slate-800 active:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
  secondary:
    "border border-white/40 bg-white/50 text-slate-950 hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
  ghost:
    "bg-transparent text-slate-700 hover:bg-white/45 dark:text-slate-200 dark:hover:bg-white/10",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const baseClassName =
  "inline-flex shrink-0 items-center justify-center rounded-2xl font-medium outline-none transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50";

export function Button(props: ButtonProps | ButtonAsChildProps) {
  const {
    asChild,
    children,
    className,
    size = "md",
    variant = "primary",
    ...buttonProps
  } = props;

  const composedClassName = cn(
    baseClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    className,
  );

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error("Button asChild requires a valid React element.");
    }

    return cloneElement(children, {
      className: cn(children.props.className, composedClassName),
    });
  }

  return (
    <button className={composedClassName} {...buttonProps}>
      {children}
    </button>
  );
}
