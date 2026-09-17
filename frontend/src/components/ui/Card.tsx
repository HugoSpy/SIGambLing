import * as React from "react";
import { cn } from "../../lib/utils";

type CardAccent = "default" | "win" | "jackpot" | "cyan" | "orange";

const accentClass: Record<CardAccent, string> = {
  default: "card-default",
  win:     "card-win",
  jackpot: "card-jackpot",
  cyan:    "card-win",    // alias → win
  orange:  "card-jackpot", // alias → jackpot
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
}

export function Card({ className, accent = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(accentClass[accent], "transition-colors duration-200", className)}
      {...props}
    />
  );
}
