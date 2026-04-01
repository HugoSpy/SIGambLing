import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, open, onClose, children }: ModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass-panel w-full max-w-lg rounded-[28px] p-6"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-brand-text">{title}</h2>
                {description ? <p className="mt-2 text-sm text-brand-muted">{description}</p> : null}
              </div>
              <Button size="sm" variant="secondary" onClick={onClose}>
                Fermer
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
