import * as React from "react";
import { cn } from "../../lib/utils";

type CardAccent = "default" | "cyan" | "orange";

const accentStyles: Record<CardAccent, string> = {
  default: "border-zinc-800 bg-zinc-900",
  cyan: "border-emerald-500/20 bg-emerald-500/[0.07]",
  orange: "border-amber-500/20 bg-amber-500/[0.06]",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
}

export function Card({ className, accent = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.16)]",
        accentStyles[accent],
        "transition-colors duration-200",
        className,
      )}
      {...props}
    />
  );
}
