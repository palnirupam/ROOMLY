import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect } from "react";

type MemberToastProps = {
  id: string;
  message: string;
  variant: "join" | "leave";
  onDismiss: (id: string) => void;
};

const toastVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 20, stiffness: 350 },
  },
  exit: {
    opacity: 0,
    y: 24,
    scale: 0.95,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

const variantStyles: Record<"join" | "leave", string> = {
  join: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  leave:
    "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
};

const variantIcons: Record<"join" | "leave", string> = {
  join: "●",
  leave: "○",
};

function MemberToastComponent({
  id,
  message,
  variant,
  onDismiss,
}: MemberToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(id);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [id, onDismiss]);

  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur-sm ${variantStyles[variant]}`}
      variants={toastVariants}
    >
      <span className="text-xs" aria-hidden="true">
        {variantIcons[variant]}
      </span>
      <span>{message}</span>
    </motion.div>
  );
}

export const MemberToast = memo(MemberToastComponent);

type MemberToastContainerProps = {
  children: React.ReactNode;
};

export function MemberToastContainer({ children }: MemberToastContainerProps) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>{children}</AnimatePresence>
    </div>
  );
}
