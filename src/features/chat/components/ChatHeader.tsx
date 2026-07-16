import { motion } from "motion/react";
import { Check, Copy, Moon, Share2, Sun } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { InviteModal } from "@/features/chat/components/InviteModal";
import type { ChatConnectionStatus } from "@/features/chat/types";
import { useTheme } from "@/app/theme/ThemeProvider";
import { Button } from "@/shared/ui/Button";
import { ConfirmModal } from "@/shared/ui/ConfirmModal";
import { cn } from "@/shared/lib/cn";

type ChatHeaderProps = {
  connectionStatus: ChatConnectionStatus;
  isCreator: boolean;
  memberCount?: number;
  nickname: string;
  onDeleteRoom?: () => Promise<void>;
  roomCode: string;
};

const statusLabels: Record<ChatConnectionStatus, string> = {
  connected: "Ready",
  connecting: "Starting",
  offline: "Offline",
};

const statusClassNames: Record<ChatConnectionStatus, string> = {
  connected:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  connecting:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
  offline: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
};

function getInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "?";
}

function ChatHeaderComponent({
  connectionStatus,
  isCreator,
  memberCount = 0,
  nickname,
  onDeleteRoom,
  roomCode,
}: ChatHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const [copyStatus, setCopyStatus] = useState<"copied" | "idle">("idle");
  const [showInvite, setShowInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return roomCode;
    }

    return new URL(
      `/room/${encodeURIComponent(roomCode)}`,
      window.location.origin,
    ).toString();
  }, [roomCode]);

  useEffect(() => {
    if (copyStatus === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyStatus]);

  function handleDeleteClick() {
    if (!onDeleteRoom || isDeleting) {
      return;
    }

    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!onDeleteRoom) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteRoom();
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleCopyRoomCode() {
    if (typeof navigator === "undefined" || !("clipboard" in navigator)) {
      return;
    }

    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("idle");
    }
  }

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.75rem] border border-white/45 bg-white/55 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55"
      initial={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-cyan-500/15 dark:bg-white dark:text-slate-950">
            {getInitial(nickname)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-white">
                Room {roomCode}
              </h1>
              <Button
                aria-label={`Copy room code ${roomCode}`}
                className="size-7 rounded-lg p-0"
                size="sm"
                title="Copy room code"
                type="button"
                variant="ghost"
                onClick={() => {
                  void handleCopyRoomCode();
                }}
              >
                {copyStatus === "copied" ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : (
                  <Copy aria-hidden="true" className="size-3.5" />
                )}
              </Button>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                  statusClassNames[connectionStatus],
                )}
              >
                {statusLabels[connectionStatus]}
              </span>
              {memberCount > 0 ? (
                <span className="shrink-0 rounded-full border border-white/30 bg-white/40 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  {memberCount} {memberCount === 1 ? "Member" : "Members"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
              {nickname}
            </p>
            <p className="sr-only" role="status">
              {copyStatus === "copied" ? "Room code copied." : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => {
              setShowInvite(true);
            }}
          >
            <Share2 aria-hidden="true" className="mr-1.5 size-4" />
            Invite
          </Button>
          {isCreator ? (
            <Button
              className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:border-rose-400/30 dark:text-rose-300"
              disabled={isDeleting}
              size="sm"
              type="button"
              variant="secondary"
              onClick={handleDeleteClick}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost">
            <Link to="/join">Leave</Link>
          </Button>
          <Button
            aria-label={`Switch to ${nextTheme} mode`}
            className="size-9 p-0"
            size="sm"
            title={`Switch to ${nextTheme} mode`}
            type="button"
            variant="secondary"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" className="size-4" />
            ) : (
              <Moon aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <ConfirmModal
        confirmLabel="Delete"
        description="All messages in this room will be permanently deleted. This cannot be undone."
        isOpen={showDeleteConfirm}
        isProcessing={isDeleting}
        title="Delete this room?"
        variant="danger"
        onCancel={() => {
          setShowDeleteConfirm(false);
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
      <InviteModal
        inviteUrl={inviteUrl}
        isOpen={showInvite}
        roomCode={roomCode}
        onClose={() => {
          setShowInvite(false);
        }}
      />
    </motion.header>
  );
}

export const ChatHeader = memo(ChatHeaderComponent);
