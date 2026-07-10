import type { RefObject } from "react";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

type EmojiPickerProps = {
  anchorRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
};

const popoverVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 22, stiffness: 320 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 8,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

function EmojiPickerComponent({
  anchorRef,
  isOpen,
  onClose,
  onEmojiSelect,
}: EmojiPickerProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [position, setPosition] = useState({ bottom: 0, right: 0 });

  useEffect(() => {
    if (!isOpen || !anchorRef.current) {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const popoverWidth = 352;
    const gap = 6;

    setPosition({
      bottom: window.innerHeight - rect.top + gap,
      right: Math.min(
        window.innerWidth - rect.right,
        window.innerWidth - popoverWidth - 12,
      ),
    });

    const frameId = requestAnimationFrame(() => {
      setIsPickerReady(true);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) {
      setIsPickerReady(false);
    }
  }, [isOpen]);

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

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
        >
          <motion.div
            ref={popoverRef}
            className="absolute overflow-hidden rounded-xl shadow-2xl shadow-slate-900/25 [will-change:transform,opacity]"
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              bottom: position.bottom,
              right: position.right,
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {isPickerReady ? (
              <div className="[&_em-emoji-picker]:!h-[380px] [&_em-emoji-picker]:!w-[352px]">
                <Picker
                  data={data}
                  emojiSize={22}
                  maxSearchResults={12}
                  navPosition="top"
                  perLine={8}
                  set="native"
                  skin={0}
                  theme="auto"
                  onEmojiSelect={(emoji: { native?: string }) => {
                    if (emoji.native) {
                      onEmojiSelect(emoji.native);
                    }
                    onClose();
                  }}
                />
              </div>
            ) : (
              <div className="h-[380px] w-[352px]" />
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export const EmojiPicker = memo(EmojiPickerComponent);
