import { motion } from "motion/react";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

const transition = {
  duration: 0.22,
  ease: "easeOut",
} as const;

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
