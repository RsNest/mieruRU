'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useToastItems } from './useToast'

export function Toasts() {
  const toasts = useToastItems()
  const toastVariants = {
    initial: { opacity: 0, x: 40, scale: 0.95 },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { type: 'spring' as const, damping: 22, stiffness: 300 },
    },
    exit: { opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.15 } },
  }
  return (
    <div className="toast-container" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast ${toast.kind}`}
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}