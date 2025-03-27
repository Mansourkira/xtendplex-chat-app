import { cn } from "@/lib/utils";
import type React from "react";

interface ChatHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatHeader({ children, className }: ChatHeaderProps) {
  return (
    <div
      className={cn(
        "border-b p-4 flex items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}
