import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ChatNav } from "@/components/chat-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { SocketService, UserService } from "@/services";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client"; // Import Socket.io client

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
  const [chatPartner, setChatPartner] = useState<{
    username?: string;
    avatar?: string;
    status?: string;
  }>({});

  // Fetch chat partner information for the header
  useEffect(() => {
    const fetchChatPartnerInfo = async () => {
      if (!chatId || !user) return;

      if (chatType === "individual") {
        try {
          const userData = await UserService.getUserById(chatId);
          console.log("userData", userData);
          setChatPartner({
            username: userData.username,
            avatar: userData.avatar,
            status: userData.status,
          });
          console.log("chatPartner", chatPartner);
        } catch (error) {
          console.error("Error fetching chat partner details:", error);
          setChatPartner({ username: "Unknown User" });
        }
      } else {
        // For groups, you could fetch group details here
        // For now, we'll just use a placeholder
        setChatPartner({ username: "Group Chat" });
      }
    };

    fetchChatPartnerInfo();
  }, [chatId, chatType, user]);

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
    // Explicitly connect with token, following the HTML test page approach
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.warn("No access token found for socket authentication");
      setSocketError(
        "Authentication token missing. You may need to log in again."
      );
      return;
    }

    console.log("Chat component mounting, initializing socket with token");

    // Try direct connection like in the test page
    try {
      // First, use our service
      SocketService.disconnect();
      SocketService.init();
      SocketService.connect();

      // Also try a direct connection exactly like the HTML test page
      console.log("Testing direct Socket.io connection like HTML test page");
      const directSocket = io("http://localhost:3000", {
        auth: { token },
      });

      directSocket.on("connect", () => {
        console.log("Direct socket connected successfully!");
        // If the direct connection works but our service doesn't,
        // there might be differences in implementation
      });

      directSocket.on("connect_error", (error) => {
        console.error("Direct socket connection error:", error);
      });

      // Clean up the test socket later
      setTimeout(() => {
        console.log("Cleaning up test socket");
        directSocket.disconnect();
      }, 10000);
    } catch (error) {
      console.error("Error creating test socket:", error);
    }

    // Set initial connection status
    setSocketStatus(SocketService.isConnected() ? "connected" : "disconnected");

    // Listen for socket events
    const connectListener = SocketService.on("connect", () => {
      console.log("Socket connected event in component");
      setSocketStatus("connected");
      setSocketError(null);
    });

    const disconnectListener = SocketService.on(
      "disconnect",
      (reason: string) => {
        console.log("Socket disconnected event in component:", reason);
        setSocketStatus("disconnected");
      }
    );

    const reconnectingListener = SocketService.on("reconnecting", () => {
      console.log("Socket reconnecting event in component");
      setSocketStatus("reconnecting");
      setSocketError(null);
    });

    const errorListener = SocketService.on("error", (data: SocketError) => {
      console.error("Socket error event in component:", data);
      setSocketError(
        data.message || "An error occurred with the chat connection"
      );
    });

    const connectErrorListener = SocketService.on(
      "connect_error",
      (error: any) => {
        console.error("Socket connect_error event in component:", error);
        setSocketStatus("disconnected");
        setSocketError(
          `Connection error: ${error.message || "Unknown connection error"}`
        );
      }
    );

    return () => {
      // Clean up listeners
      connectListener();
      disconnectListener();
      reconnectingListener();
      errorListener();
      connectErrorListener();
    };
  }, []);

  const handleManualReconnect = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setSocketError("No access token found. Please log in again.");
      return;
    }

    console.log("Manual reconnect requested with token");

    try {
      // Following exactly the HTML test page approach
      console.log("Disconnecting existing socket");
      SocketService.disconnect();

      console.log("Creating and connecting a fresh socket with token");
      SocketService.init();

      // Log the token format
      console.log(
        "Token format (first 10 chars):",
        token.substring(0, 10) + "..."
      );

      SocketService.connect();
      setSocketStatus("reconnecting");
    } catch (error) {
      console.error("Error during manual reconnection:", error);
      setSocketError(
        "Reconnection failed: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <ChatNav />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader>
          <div className="flex items-center gap-3">
            {chatPartner.username && (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={chatPartner.avatar || ""}
                    alt={chatPartner.username}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {chatPartner.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">
                    {chatPartner.username}
                  </h2>
                  {chatPartner.status && chatType === "individual" && (
                    <span
                      className={cn(
                        "text-xs",
                        chatPartner.status === "online" && "text-green-600",
                        chatPartner.status === "away" && "text-amber-600",
                        chatPartner.status === "offline" && "text-gray-600"
                      )}
                    >
                      {chatPartner.status}
                    </span>
                  )}
                </div>
              </>
            )}
            {!chatPartner.username && (
              <h2 className="text-lg font-semibold">
                {id ? (
                  <>
                    {chatType === "group" ? "Group Chat" : "Chat"}
                    {` #${id.substring(0, 8)}...`}
                  </>
                ) : (
                  "Select a chat"
                )}
              </h2>
            )}
          </div>
        </ChatHeader>

        {/* Socket connection status */}
        {socketStatus === "reconnecting" && (
          <Alert className="bg-amber-100 border-amber-200">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-600 mr-2" />
            <AlertDescription>Reconnecting to chat server...</AlertDescription>
          </Alert>
        )}

        {socketStatus === "disconnected" && (
          <Alert className="bg-red-100 border-red-200">
            <RefreshCw className="h-4 w-4 text-red-600 mr-2" />
            <AlertDescription className="flex items-center justify-between">
              <span>Disconnected from chat server</span>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleManualReconnect}
              >
                Reconnect
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {socketError && (
          <Alert className="bg-red-100 border-red-200">
            <AlertDescription className="text-red-600">
              {socketError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
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
