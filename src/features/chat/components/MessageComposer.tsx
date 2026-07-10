import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";

import { MAX_MESSAGE_LENGTH } from "@/features/chat/useMessages";
import { Button } from "@/shared/ui/Button";
import { EmojiPicker } from "@/shared/ui/EmojiPicker";

type MessageComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSend: (message: string) => Promise<void>;
};

function MessageComposerComponent({
  disabled = false,
  isSending = false,
  onSend,
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

  const handleEmojiSelect = useCallback((emoji: string) => {
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
  }, [message]);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedMessage || disabled) {
      return;
    }

    await onSend(trimmedMessage);
    setMessage("");
    textareaRef.current?.focus();
  }

  return (
    <form
      aria-label="Send a message"
      className="space-y-2"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
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
