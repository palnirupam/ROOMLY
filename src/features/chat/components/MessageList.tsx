import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyChat } from "@/features/chat/components/EmptyChat";
import { LoadingSkeleton } from "@/features/chat/components/LoadingSkeleton";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import type { ChatMessage } from "@/features/chat/types";
import { Button } from "@/shared/ui/Button";
import { ConfirmModal } from "@/shared/ui/ConfirmModal";

type MessageListProps = {
  currentNickname: string;
  isLoading?: boolean;
  messages: ChatMessage[];
  onDeleteMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onReplyToMessage: (message: ChatMessage) => void;
  seenCounts?: Record<string, number>;
};

type MessageListItem =
  | {
      id: string;
      label: string;
      type: "date";
    }
  | {
      id: string;
      message: ChatMessage;
      type: "message";
    };

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getDateKey(timestampMs: number) {
  const date = new Date(timestampMs);
  return [
    date.getFullYear().toString(),
    date.getMonth().toString(),
    date.getDate().toString(),
  ].join("-");
}

function getStartOfDayMs(timestampMs: number) {
  const date = new Date(timestampMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDateSeparator(timestampMs: number) {
  const messageDayMs = getStartOfDayMs(timestampMs);
  const todayMs = getStartOfDayMs(Date.now());
  const daysAgo = Math.round((todayMs - messageDayMs) / 86_400_000);

  if (daysAgo === 0) {
    return "Today";
  }

  if (daysAgo === 1) {
    return "Yesterday";
  }

  return dayFormatter.format(timestampMs);
}

function isNearBottom(scrollContainer: HTMLDivElement) {
  return (
    scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight <
    96
  );
}

function getScrollBehavior(): ScrollBehavior {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }

  return "smooth";
}

function buildMessageListItems(messages: ChatMessage[]) {
  const items: MessageListItem[] = [];
  let previousDateKey = "";

  for (const message of messages) {
    const dateKey = getDateKey(message.createdAtMs);

    if (dateKey !== previousDateKey) {
      items.push({
        id: `date-${dateKey}`,
        label: formatDateSeparator(message.createdAtMs),
        type: "date",
      });
      previousDateKey = dateKey;
    }

    items.push({
      id: message.id,
      message,
      type: "message",
    });
  }

  return items;
}

const DateSeparator = memo(function DateSeparator({
  label,
}: {
  label: string;
}) {
  return (
    <motion.div
      aria-label={label}
      className="flex items-center gap-3 py-2"
      initial={{ opacity: 0 }}
      role="separator"
    >
      <span className="h-px flex-1 bg-slate-300/70 dark:bg-white/10" />
      <span className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-300/70 dark:bg-white/10" />
    </motion.div>
  );
});

function MessageListComponent({
  currentNickname,
  isLoading = false,
  messages,
  onDeleteMessage,
  onEditMessage,
  onReactToMessage,
  onReplyToMessage,
  seenCounts = {},
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const showScrollButtonRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const listItems = useMemo(() => buildMessageListItems(messages), [messages]);

  const setScrollButtonVisibility = useCallback((isVisible: boolean) => {
    if (showScrollButtonRef.current === isVisible) {
      return;
    }

    showScrollButtonRef.current = isVisible;
    setShowScrollButton(isVisible);
  }, []);

  const updateScrollState = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const shouldStickToBottom = isNearBottom(scrollContainer);
    shouldStickToBottomRef.current = shouldStickToBottom;
    setScrollButtonVisibility(!shouldStickToBottom && messages.length > 0);
  }, [messages.length, setScrollButtonVisibility]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      return;
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateScrollState();
    });
  }, [updateScrollState]);

  const scrollToBottom = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTo({
      behavior: getScrollBehavior(),
      top: scrollContainer.scrollHeight,
    });
    shouldStickToBottomRef.current = true;
    setScrollButtonVisibility(false);
  }, [setScrollButtonVisibility]);

  async function handleDeleteConfirm() {
    if (!messageToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteMessage(messageToDelete.id);
      setMessageToDelete(null);
    } catch {
      setMessageToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const lastMessage = messages.at(-1);

    if (shouldStickToBottomRef.current || lastMessage?.isOwn) {
      scrollToBottom();
      return;
    }

    setScrollButtonVisibility(messages.length > 0);
  }, [messages, scrollToBottom, setScrollButtonVisibility]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-busy={isLoading ? "true" : undefined}
        aria-label="Room messages"
        aria-live="polite"
        aria-relevant="additions text"
        className="relative min-h-0 flex-1 scrollbar-none overflow-y-auto overscroll-contain rounded-[1.5rem] border border-white/30 bg-white/30 p-3 contain-[layout_style_paint] outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/5"
        ref={scrollContainerRef}
        role="log"
        tabIndex={0}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : messages.length === 0 ? (
          <EmptyChat nickname={currentNickname} />
        ) : (
          <div className="flex min-h-full flex-col justify-end gap-2.5">
            <AnimatePresence initial={false}>
              {listItems.map((item) =>
                item.type === "date" ? (
                  <DateSeparator key={item.id} label={item.label} />
                ) : (
                  <MessageBubble
                    key={item.id}
                    message={item.message}
                    seenCount={seenCounts[item.message.id] ?? 0}
                    onEdit={onEditMessage}
                    onReact={onReactToMessage}
                    onReply={onReplyToMessage}
                    onRequestDelete={setMessageToDelete}
                  />
                ),
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showScrollButton ? (
        <Button
          className="absolute right-4 bottom-4 z-10 shadow-lg shadow-slate-900/15"
          size="sm"
          type="button"
          variant="secondary"
          onClick={scrollToBottom}
        >
          Latest
        </Button>
      ) : null}

      <ConfirmModal
        confirmLabel="Delete"
        description="This message will be permanently deleted."
        isOpen={Boolean(messageToDelete)}
        isProcessing={isDeleting}
        title="Delete this message?"
        variant="danger"
        onCancel={() => {
          setMessageToDelete(null);
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
    </div>
  );
}

export const MessageList = memo(MessageListComponent);
