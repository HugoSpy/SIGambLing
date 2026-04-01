import * as React from "react";
import { cn } from "../../lib/utils";

type CardAccent = "default" | "cyan" | "orange";

const accentStyles: Record<CardAccent, string> = {
  default: "border-brand-line",
  cyan: "border-brand-cyan/30 shadow-glow",
  orange: "border-brand-orange/30 shadow-glow-orange",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
}

export function Card({ className, accent = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[28px] p-6",
        accentStyles[accent],
        "transition-all duration-300 hover:scale-[1.02]",
        className,
      )}
      {...props}
    />
  );
}
