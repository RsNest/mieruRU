'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
      if (event.key === 'Tab' && rootRef.current) {
        const focusables = rootRef.current.querySelectorAll<HTMLElement>('button')
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onCancel}
        >
          <motion.div
            className="modal"
            variants={{
              hidden: { opacity: 0, y: -32, scale: 0.97 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: 'spring', damping: 28, stiffness: 380 },
              },
              exit: { opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.18 } },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            ref={rootRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 className="modal-title">{title}</h3>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                className="modal-close-btn"
                onClick={onCancel}
                aria-label={cancelLabel}
              >
                <X size={14} />
              </Button>
            </div>
            <p>{message}</p>
            <div className="modal-actions">
              <Button type="button" variant="secondary" size="md" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button type="button" variant="danger" size="md" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}