import { motion } from "motion/react";
import { memo } from "react";

type EmptyChatProps = {
  nickname: string;
};

function EmptyChatComponent({ nickname }: EmptyChatProps) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto grid min-h-full max-w-sm place-items-center px-4 py-10 text-center"
      initial={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-3xl border border-white/40 bg-white/50 text-2xl shadow-lg shadow-slate-900/10 dark:border-white/10 dark:bg-white/10"
      >
        #
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">
        No messages yet
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {nickname}, this room is ready. New messages will appear here.
      </p>
    </motion.div>
  );
}

export const EmptyChat = memo(EmptyChatComponent);
