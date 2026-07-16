import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Share2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/shared/ui/Button";

type InviteModalProps = {
  inviteUrl: string;
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
};

function InviteModalComponent({
  inviteUrl,
  isOpen,
  onClose,
  roomCode,
}: InviteModalProps) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "idle">("idle");
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (copyStatus !== "copied") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyStatus]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("idle");
    }
  }

  async function handleShare() {
    if (!canShare) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        text: `Join my Roomly room: ${roomCode}`,
        title: `Roomly room ${roomCode}`,
        url: inviteUrl,
      });
    } catch {
      // Closing the native share sheet is not an error the UI needs to show.
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-labelledby="invite-modal-title"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/30 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950"
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            role="dialog"
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2
                  className="truncate text-lg font-semibold text-slate-950 dark:text-white"
                  id="invite-modal-title"
                >
                  Invite to {roomCode}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Scan or share the room link.
                </p>
              </div>
              <Button
                aria-label="Close invite dialog"
                className="size-9 p-0"
                size="sm"
                title="Close"
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div className="mx-auto my-5 w-fit rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <QRCodeSVG
                aria-label={`QR code for Roomly room ${roomCode}`}
                bgColor="#ffffff"
                fgColor="#020617"
                level="M"
                size={184}
                value={inviteUrl}
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
                {inviteUrl}
              </span>
              <Button
                aria-label="Copy invite link"
                className="size-8 p-0"
                size="sm"
                title="Copy invite link"
                type="button"
                variant="ghost"
                onClick={() => {
                  void handleCopy();
                }}
              >
                {copyStatus === "copied" ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void handleCopy();
                }}
              >
                {copyStatus === "copied" ? (
                  <Check aria-hidden="true" className="mr-2 size-4" />
                ) : (
                  <Copy aria-hidden="true" className="mr-2 size-4" />
                )}
                {copyStatus === "copied" ? "Copied" : "Copy link"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleShare();
                }}
              >
                <Share2 aria-hidden="true" className="mr-2 size-4" />
                Share
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export const InviteModal = memo(InviteModalComponent);
