import { motion } from "framer-motion";

export function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md rounded-[28px] p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
      >
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-brand-cyan/20 border-t-brand-cyan" />
        <p className="font-display text-2xl text-brand-text">SIGambling</p>
        <p className="mt-2 text-sm text-brand-muted">{label}</p>
      </motion.div>
    </main>
  );
}
