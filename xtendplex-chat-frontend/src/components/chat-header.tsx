import { cn } from "@/lib/utils";
import { SocketService } from "@/services";
import type React from "react";
import { useEffect, useState } from "react";

interface ChatHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatHeader({ children, className }: ChatHeaderProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Check initial connection
    setIsConnected(SocketService.isConnected());

    // Set up connection listeners
    const connectListener = SocketService.on("connect", () => {
      setIsConnected(true);
    });

    const disconnectListener = SocketService.on("disconnect", () => {
      setIsConnected(false);
    });

    // Check connection periodically
    const intervalId = setInterval(() => {
      setIsConnected(SocketService.isConnected());
    }, 3000);

    return () => {
      connectListener();
      disconnectListener();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className={cn(
        "border-b p-4 flex items-center justify-between",
        className
      )}
    >
      <div className="flex-1">{children}</div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span>Status:</span>
          <span
            className={cn(
              "flex items-center",
              isConnected ? "text-green-500" : "text-red-500"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full mr-1",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            ></span>
            {isConnected ? "Connected" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
