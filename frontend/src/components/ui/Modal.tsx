import { type ReactNode } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-[var(--radius-lg)] border p-5"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--ink-700)",
              boxShadow: "var(--shadow-modal)",
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  className="font-display"
                  style={{ fontSize: "var(--text-2xl)", color: "var(--fg-primary)" }}
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    className="mt-2"
                    style={{ fontSize: "var(--text-sm)", color: "var(--fg-secondary)" }}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                aria-label="Fermer"
                className="modal-close-btn p-2"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
