import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/shared/ui/Button";

type ConfirmModalProps = {
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  variant?: "danger" | "default";
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 350 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 16,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

function ConfirmModalComponent({
  confirmLabel = "Confirm",
  description,
  isOpen,
  isProcessing = false,
  onCancel,
  onConfirm,
  title,
  variant = "default",
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isProcessing, onCancel]);

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          transition={{ duration: 0.2 }}
          onClick={isProcessing ? undefined : onCancel}
        >
          <motion.div
            aria-label={title}
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-2xl shadow-slate-900/20 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90"
            role="alertdialog"
            variants={modalVariants}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="space-y-2 px-6 pt-6">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {title}
              </h2>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6 pt-5">
              <Button
                disabled={isProcessing}
                size="sm"
                type="button"
                variant="ghost"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                className={
                  variant === "danger"
                    ? "border-rose-500/40 bg-rose-600 text-white hover:bg-rose-700 dark:border-rose-400/30 dark:bg-rose-700 dark:hover:bg-rose-800"
                    : ""
                }
                disabled={isProcessing}
                size="sm"
                type="button"
                onClick={onConfirm}
              >
                {isProcessing ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deleting...
                  </span>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export const ConfirmModal = memo(ConfirmModalComponent);
