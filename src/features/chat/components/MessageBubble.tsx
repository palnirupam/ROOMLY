import { motion } from "motion/react";
import { memo, useMemo } from "react";

import type { ChatMessage } from "@/features/chat/types";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import { getUserHue } from "@/shared/lib/userColor";

type MessageBubbleProps = {
  message: ChatMessage;
};

function getInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "?";
}

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isOwn = message.isOwn;
  const hue = useMemo(() => getUserHue(message.senderUid), [message.senderUid]);

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
          className="grid size-8 shrink-0 place-items-center rounded-2xl text-xs font-semibold"
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
          "max-w-[min(34rem,82%)] rounded-[1.35rem] px-4 py-3 shadow-lg backdrop-blur-xl sm:max-w-[72%]",
          isOwn
            ? "rounded-br-md bg-slate-950 text-white shadow-cyan-500/10 dark:bg-white dark:text-slate-950"
            : "rounded-bl-md border border-white/40 bg-white/65 text-slate-950 shadow-slate-900/10 dark:border-white/10 dark:bg-white/10 dark:text-white",
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
        <p className="text-sm leading-6 break-words whitespace-pre-wrap">
          {message.text}
        </p>
        <p
          className={cn(
            "mt-1 text-right text-[0.7rem]",
            isOwn && message.status !== "failed"
              ? "text-white/65 dark:text-slate-500"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {message.timestampLabel}
        </p>
        {message.status === "failed" && message.retry ? (
          <Button
            className="mt-2 h-8 rounded-xl px-3 text-xs"
            type="button"
            variant="secondary"
            onClick={message.retry}
          >
            Retry
          </Button>
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
      previousMessage.id === nextMessage.id &&
      previousMessage.isOwn === nextMessage.isOwn &&
      previousMessage.nickname === nextMessage.nickname &&
      previousMessage.senderUid === nextMessage.senderUid &&
      Boolean(previousMessage.retry) === Boolean(nextMessage.retry) &&
      previousMessage.status === nextMessage.status &&
      previousMessage.text === nextMessage.text &&
      previousMessage.timestampLabel === nextMessage.timestampLabel
    );
  },
);
