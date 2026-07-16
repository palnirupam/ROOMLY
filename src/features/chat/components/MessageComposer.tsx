import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { X } from "lucide-react";

import { MAX_MESSAGE_LENGTH } from "@/features/chat/useMessages";
import type { MessageReply } from "@/features/chat/types";
import { Button } from "@/shared/ui/Button";
import { EmojiPicker } from "@/shared/ui/EmojiPicker";

type MessageComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onCancelReply: () => void;
  onSend: (message: string, replyTo?: MessageReply) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
  replyTo?: MessageReply;
  typingText?: string;
};

function MessageComposerComponent({
  disabled = false,
  isSending = false,
  onCancelReply,
  onSend,
  onTypingChange,
  replyTo,
  typingText,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const trimmedMessage = message.trim();
  const characterCountId = "message-composer-count";

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144).toString()}px`;
  }, [message]);

  useEffect(() => {
    if (disabled || !trimmedMessage) {
      onTypingChange(false);
      return;
    }

    onTypingChange(true);
    const idleTimeoutId = window.setTimeout(() => {
      onTypingChange(false);
    }, 1500);

    return () => {
      window.clearTimeout(idleTimeoutId);
    };
  }, [disabled, message, onTypingChange, trimmedMessage]);

  useEffect(() => {
    return () => {
      onTypingChange(false);
    };
  }, [onTypingChange]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;

      if (!textarea) {
        setMessage((currentMessage) => currentMessage + emoji);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);

      setMessage(newMessage);

      requestAnimationFrame(() => {
        const newCursorPosition = start + emoji.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        textarea.focus();
      });
    },
    [message],
  );

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH));
  }

  async function performSend() {
    if (!trimmedMessage || disabled) {
      return;
    }

    await onSend(trimmedMessage, replyTo);
    setMessage("");
    onCancelReply();
    onTypingChange(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void performSend();
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await performSend();
  }

  return (
    <form
      aria-label="Send a message"
      className="space-y-2"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {replyTo ? (
        <div className="flex items-start gap-3 rounded-lg border-l-2 border-cyan-500 bg-white/45 px-3 py-2 dark:bg-white/5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              Replying to {replyTo.nickname}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
              {replyTo.text}
            </p>
          </div>
          <Button
            aria-label="Cancel reply"
            className="size-7 p-0"
            size="sm"
            title="Cancel reply"
            type="button"
            variant="ghost"
            onClick={onCancelReply}
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <p
        aria-live="polite"
        className="h-4 truncate text-xs text-slate-500 dark:text-slate-400"
      >
        {typingText ?? ""}
      </p>

      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="message-composer">
          Message
        </label>
        <textarea
          aria-describedby={characterCountId}
          className="max-h-36 min-h-12 flex-1 resize-none scrollbar-none rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-base text-slate-950 transition outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500"
          disabled={disabled}
          enterKeyHint="send"
          id="message-composer"
          maxLength={MAX_MESSAGE_LENGTH}
          name="message"
          placeholder="Message"
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <Button
          aria-label="Pick emoji"
          className="size-10 shrink-0 rounded-xl p-0 text-lg leading-none"
          disabled={disabled}
          ref={emojiButtonRef}
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => {
            setShowEmojiPicker((currentValue) => !currentValue);
          }}
        >
          😊
        </Button>
        <Button
          aria-busy={isSending ? "true" : undefined}
          disabled={disabled || !trimmedMessage}
          type="submit"
        >
          {isSending ? (
            <span className="inline-flex items-center gap-1">
              Sending
              <span aria-hidden="true" className="inline-flex w-4 gap-0.5">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce [animation-delay:120ms]">
                  .
                </span>
                <span className="animate-bounce [animation-delay:240ms]">
                  .
                </span>
              </span>
            </span>
          ) : (
            "Send"
          )}
        </Button>
      </div>
      <p
        aria-live="polite"
        className="text-right text-xs text-slate-500 dark:text-slate-400"
        id={characterCountId}
      >
        {message.length}/{MAX_MESSAGE_LENGTH}
      </p>

      <EmojiPicker
        anchorRef={emojiButtonRef}
        isOpen={showEmojiPicker}
        onClose={() => {
          setShowEmojiPicker(false);
        }}
        onEmojiSelect={handleEmojiSelect}
      />
    </form>
  );
}

export const MessageComposer = memo(MessageComposerComponent);
