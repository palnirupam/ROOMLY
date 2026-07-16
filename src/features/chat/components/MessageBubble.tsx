import { motion } from "motion/react";
import { Pencil, Reply, Trash2 } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { MAX_MESSAGE_LENGTH } from "@/features/chat/useMessages";
import type { ChatMessage } from "@/features/chat/types";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import { getUserHue } from "@/shared/lib/userColor";

type MessageBubbleProps = {
  message: ChatMessage;
  onEdit: (messageId: string, text: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onRequestDelete: (message: ChatMessage) => void;
  seenCount?: number;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂"] as const;

function getInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "?";
}

function MessageBubbleComponent({
  message,
  onEdit,
  onReact,
  onReply,
  onRequestDelete,
  seenCount = 0,
}: MessageBubbleProps) {
  const isOwn = message.isOwn;
  const hue = useMemo(() => getUserHue(message.senderUid), [message.senderUid]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isSaving, setIsSaving] = useState(false);

  function startEditing() {
    setEditText(message.text);
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    const normalizedText = editText.trim();

    if (!normalizedText || normalizedText === message.text) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onEdit(message.id, normalizedText);
      setIsEditing(false);
    } catch {
      // The shared chat error banner reports the failure.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      aria-label={`${isOwn ? "You" : message.nickname}, ${message.timestampLabel}`}
      className={cn("flex items-end gap-2.5", isOwn && "justify-end")}
      exit={{ opacity: 0, y: 6 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {!isOwn ? (
        <div
          className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: `hsl(${hue.toString()}, 55%, 32%)`,
            color: `hsl(${hue.toString()}, 25%, 92%)`,
          }}
        >
          {getInitial(message.nickname)}
        </div>
      ) : null}

      <div
        className={cn(
          "group flex max-w-[min(34rem,82%)] flex-col sm:max-w-[72%]",
          isOwn ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "w-fit max-w-full rounded-2xl px-4 py-3 shadow-lg backdrop-blur-xl",
            isOwn
              ? "rounded-br-sm bg-slate-950 text-white shadow-cyan-500/10 dark:bg-white dark:text-slate-950"
              : "rounded-bl-sm border border-white/40 bg-white/65 text-slate-950 shadow-slate-900/10 dark:border-white/10 dark:bg-white/10 dark:text-white",
          )}
        >
          {!isOwn ? (
            <p
              className="mb-1 text-xs font-medium"
              style={{ color: `hsl(${hue.toString()}, 60%, 38%)` }}
            >
              {message.nickname}
            </p>
          ) : null}

          {message.replyTo ? (
            <div
              className={cn(
                "mb-2 min-w-0 rounded-lg border-l-2 px-2.5 py-2 text-xs",
                isOwn
                  ? "border-cyan-300 bg-white/10 dark:border-cyan-600 dark:bg-slate-950/10"
                  : "border-cyan-600 bg-slate-950/5 dark:border-cyan-300 dark:bg-white/5",
              )}
            >
              <p className="truncate font-semibold">
                {message.replyTo.nickname}
              </p>
              <p className="mt-0.5 line-clamp-2 opacity-75">
                {message.replyTo.text}
              </p>
            </div>
          ) : null}

          {isEditing ? (
            <div className="min-w-56 space-y-2">
              <textarea
                autoFocus
                className="max-h-36 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25 dark:border-white/15 dark:bg-slate-900 dark:text-white"
                disabled={isSaving}
                maxLength={MAX_MESSAGE_LENGTH}
                value={editText}
                onChange={(event) => {
                  setEditText(event.target.value);
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  className="h-8 rounded-lg px-2 text-xs"
                  disabled={isSaving}
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="h-8 rounded-lg px-3 text-xs"
                  disabled={isSaving || !editText.trim()}
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void handleSaveEdit();
                  }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 break-words whitespace-pre-wrap">
              {message.text}
            </p>
          )}

          {!isEditing ? (
            <p
              className={cn(
                "mt-1 text-right text-[0.7rem]",
                isOwn && message.status !== "failed"
                  ? "text-white/65 dark:text-slate-500"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {message.timestampLabel}
              {message.editedAtMs ? " - Edited" : ""}
              {isOwn && seenCount > 0
                ? ` - Seen by ${seenCount.toString()}`
                : ""}
            </p>
          ) : null}

          {message.status === "failed" && message.retry ? (
            <Button
              className="mt-2 h-8 rounded-lg px-3 text-xs"
              type="button"
              variant="secondary"
              onClick={message.retry}
            >
              Retry
            </Button>
          ) : null}
        </div>

        {message.reactions.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => (
              <button
                aria-label={`${reaction.emoji} reaction, ${reaction.count.toString()}`}
                aria-pressed={reaction.reactedByCurrentUser}
                className={cn(
                  "h-7 rounded-full border px-2 text-xs shadow-sm transition",
                  reaction.reactedByCurrentUser
                    ? "border-cyan-500 bg-cyan-500/15 text-slate-950 dark:text-white"
                    : "border-white/40 bg-white/65 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-200 dark:hover:bg-slate-900",
                )}
                key={reaction.emoji}
                type="button"
                onClick={() => {
                  onReact(message.id, reaction.emoji);
                }}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        ) : null}

        {message.status === "sent" && !isEditing ? (
          <div className="mt-1 flex min-h-7 items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button
              aria-label="Reply to message"
              className="size-7 rounded-lg p-0"
              size="sm"
              title="Reply"
              type="button"
              variant="ghost"
              onClick={() => {
                onReply(message);
              }}
            >
              <Reply aria-hidden="true" className="size-3.5" />
            </Button>

            {QUICK_REACTIONS.map((emoji) => (
              <button
                aria-label={`React with ${emoji}`}
                className="grid size-7 place-items-center rounded-lg text-sm transition hover:bg-white/60 dark:hover:bg-white/10"
                key={emoji}
                title={`React with ${emoji}`}
                type="button"
                onClick={() => {
                  onReact(message.id, emoji);
                }}
              >
                {emoji}
              </button>
            ))}

            {isOwn ? (
              <>
                <Button
                  aria-label="Edit message"
                  className="size-7 rounded-lg p-0"
                  size="sm"
                  title="Edit"
                  type="button"
                  variant="ghost"
                  onClick={startEditing}
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                </Button>
                <Button
                  aria-label="Delete message"
                  className="size-7 rounded-lg p-0 text-rose-600 dark:text-rose-300"
                  size="sm"
                  title="Delete"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onRequestDelete(message);
                  }}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

export const MessageBubble = memo(
  MessageBubbleComponent,
  (previousProps, nextProps) => {
    const previousMessage = previousProps.message;
    const nextMessage = nextProps.message;

    return (
      previousMessage.clientMessageId === nextMessage.clientMessageId &&
      previousMessage.createdAtMs === nextMessage.createdAtMs &&
      previousMessage.editedAtMs === nextMessage.editedAtMs &&
      previousMessage.id === nextMessage.id &&
      previousMessage.isOwn === nextMessage.isOwn &&
      previousMessage.nickname === nextMessage.nickname &&
      previousMessage.senderUid === nextMessage.senderUid &&
      Boolean(previousMessage.retry) === Boolean(nextMessage.retry) &&
      previousMessage.status === nextMessage.status &&
      previousMessage.text === nextMessage.text &&
      previousMessage.timestampLabel === nextMessage.timestampLabel &&
      previousMessage.replyTo?.messageId === nextMessage.replyTo?.messageId &&
      previousMessage.replyTo?.nickname === nextMessage.replyTo?.nickname &&
      previousMessage.replyTo?.text === nextMessage.replyTo?.text &&
      JSON.stringify(previousMessage.reactions) ===
        JSON.stringify(nextMessage.reactions) &&
      previousProps.seenCount === nextProps.seenCount
    );
  },
);
