import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ChatNav } from "@/components/chat-nav";
import { useAuth } from "@/contexts/AuthContext";
import { SocketService } from "@/services";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

// Message interface for chat
interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

export function ChatComponent() {
  const { user } = useAuth();
  const params = useParams();
  const { id } = params;

  // Default to individual chat with ID 1 if not specified
  const chatId = id || "1";
  const chatType = params["*"]?.includes("group") ? "group" : "individual";

  // Initialize socket connection on component mount
  useEffect(() => {
    SocketService.init();
    SocketService.connect();

    return () => {
      // Don't disconnect from socket when unmounting, just clean up listeners
      // This allows the socket to stay connected between route changes
    };
  }, []);

  return (
    <div className="flex h-full">
      <ChatNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader>
          <h2 className="text-lg font-semibold">
            {chatType === "group" ? "Group Chat" : "Chat"}
            {id && ` #${id}`}
          </h2>
        </ChatHeader>
        <div className="flex-1 overflow-y-auto">
          <ChatMessages
            chatId={chatId}
            type={chatType as "individual" | "group"}
          />
        </div>
        <ChatInput chatId={chatId} type={chatType as "individual" | "group"} />
      </div>
    </div>
  );
}
