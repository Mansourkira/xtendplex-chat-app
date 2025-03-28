import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ChatNav } from "@/components/chat-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { SocketService } from "@/services";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// Message interface for chat
interface Message {
  id: string;
  text: string;
  sender: string; // User ID of the sender
  timestamp: Date;
  isCurrentUser: boolean;
}

// Socket error interface
interface SocketError {
  message?: string;
}

export function ChatComponent() {
  const { user } = useAuth();
  const params = useParams();
  const { id } = params;
  console.log("id", id);
  console.log("params", params);
  // Don't set a default chatId if none is provided
  const chatId = id;
  const chatType = params["*"]?.includes("group") ? "group" : "individual";
  console.log("chatType", chatType);
  const [authRequired, setAuthRequired] = useState<boolean>(false);
  const [socketStatus, setSocketStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");
  const [socketError, setSocketError] = useState<string | null>(null);

  // Check if user is authenticated when trying to access a direct message
  useEffect(() => {
    if (chatId && chatType === "individual" && !user) {
      setAuthRequired(true);
    } else {
      setAuthRequired(false);
    }
  }, [chatId, chatType, user]);

  // Initialize socket connection on component mount
  useEffect(() => {
    SocketService.init();
    SocketService.connect();

    // Set initial connection status
    setSocketStatus(SocketService.isConnected() ? "connected" : "disconnected");

    // Listen for socket events
    const connectListener = SocketService.on("connect", () => {
      setSocketStatus("connected");
      setSocketError(null);
    });

    const disconnectListener = SocketService.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    const reconnectingListener = SocketService.on("reconnecting", () => {
      setSocketStatus("reconnecting");
      setSocketError(null);
    });

    const errorListener = SocketService.on("error", (data: SocketError) => {
      setSocketError(
        data.message || "An error occurred with the chat connection"
      );
    });

    return () => {
      // Clean up listeners
      connectListener();
      disconnectListener();
      reconnectingListener();
      errorListener();
    };
  }, []);

  return (
    <div className="flex h-full">
      <ChatNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader>
          <h2 className="text-lg font-semibold">
            {id ? (
              <>
                {chatType === "group" ? "Group Chat" : "Chat"}
                {` #${id}`}
              </>
            ) : (
              "Select a chat"
            )}
          </h2>
        </ChatHeader>

        {/* Socket connection status */}
        {socketStatus === "reconnecting" && (
          <Alert className="bg-amber-100 border-amber-200">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-600 mr-2" />
            <AlertDescription>Reconnecting to chat server...</AlertDescription>
          </Alert>
        )}

        {socketError && (
          <Alert className="bg-red-100 border-red-200">
            <AlertDescription className="text-red-600">
              {socketError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto">
          {authRequired ? (
            <div className="flex-1 flex items-center justify-center p-4 flex-col gap-3">
              <p className="text-destructive font-medium">
                Authentication Required
              </p>
              <p className="text-muted-foreground text-center">
                You need to be signed in to start a direct message conversation.
                <br />
                Direct messages are handled as private groups between two users.
              </p>
            </div>
          ) : (
            <ChatMessages
              chatId={chatId}
              type={chatType as "individual" | "group"}
            />
          )}
        </div>
        {!authRequired && (
          <ChatInput
            chatId={chatId || ""}
            type={chatType as "individual" | "group"}
          />
        )}
      </div>
    </div>
  );
}
