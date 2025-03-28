import { io, Socket } from "socket.io-client";
import { Message } from "./ChatService";

class SocketService {
  private socket: Socket | null = null;
  private messageHandler: ((message: Message) => void) | null = null;
  private messageUpdateHandler: ((message: Message) => void) | null = null;
  private messageDeleteHandler: ((messageId: string) => void) | null = null;
  private reactionAddHandler:
    | ((reaction: {
        id: string;
        message_id: string;
        reaction: string;
        user: { id: string; username: string; avatar: string | null };
      }) => void)
    | null = null;
  private reactionRemoveHandler:
    | ((data: { messageId: string; userId: string; reaction: string }) => void)
    | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;

  // Initialize socket connection
  public init(): void {
    if (this.socket) return;

    // Get the API URL from environment or use default
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

    // Get auth token - ensure we get the correct token format
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.warn("No access token found for socket connection");
    } else {
      console.log("Initializing socket with token");
    }

    this.socket = io(API_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: token ? { token } : undefined,
      query: token ? { token } : undefined,
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    this.setupEventListeners();
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("Socket connected");
      this.reconnectionAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      this.reconnectionAttempts = attempt;

      if (this.reconnectionAttempts > this.maxReconnectionAttempts) {
        this.socket?.disconnect();
      }

      // Update the token on reconnect attempt - in case it was refreshed
      if (this.socket) {
        const token = localStorage.getItem("access_token");
        if (token) {
          this.socket.auth = { token };
          (this.socket.io.opts as any).query = { token };
        }
      }
    });

    // Chat events
    if (this.messageHandler) {
      this.socket.on("message", this.messageHandler);
    }
    if (this.messageUpdateHandler) {
      this.socket.on("message_update", this.messageUpdateHandler);
    }
    if (this.messageDeleteHandler) {
      this.socket.on("message_delete", this.messageDeleteHandler);
    }
    if (this.reactionAddHandler) {
      this.socket.on("reaction_added", this.reactionAddHandler);
    }
    if (this.reactionRemoveHandler) {
      this.socket.on("reaction_removed", this.reactionRemoveHandler);
    }

    // Auth events
    this.socket.on("authenticated", (data) => {
      console.log("Socket authenticated:", data);
      this.trigger("authenticated", data);
    });

    this.socket.on("auth_error", (error) => {
      console.error("Authentication error:", error);

      // Check for session expired errors
      if (
        error.message &&
        (error.message.includes("Auth session missing") ||
          error.message.includes("Session expired"))
      ) {
        console.warn("Session expired, attempting token refresh");
        this.refreshAuthToken();
      }

      this.trigger("auth_error", error);
    });
  }

  // Attempt to refresh the auth token
  private async refreshAuthToken(): Promise<void> {
    try {
      const AuthService = (await import("./AuthService")).default;
      const newSession = await AuthService.refreshToken();

      if (newSession) {
        console.log("Token refreshed, updating socket connection");
        if (this.socket) {
          this.socket.auth = { token: newSession.access_token };
          this.socket.disconnect().connect();
        }
      } else {
        console.warn("Failed to refresh token, redirecting to login");
        this.trigger("session_expired", {});
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }

  // Connect to socket server
  public connect(): void {
    if (!this.socket) this.init();
    this.socket?.connect();
  }

  // Disconnect from socket server
  public disconnect(): void {
    this.socket?.disconnect();
  }

  // Join a group chat
  public joinGroup(groupId: string): void {
    if (!this.socket?.connected) return;
    console.log("Joining group:", groupId);
    this.socket.emit("join_group", groupId);
  }

  // Send a new message
  public sendMessage(messageData: {
    content: string;
    groupId: string;
    parentId?: string;
    attachments?: Array<{
      filePath: string;
      fileType: string;
      fileName: string;
      fileSize: number;
    }>;
  }): void {
    // Check connection state and token
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No auth token available for socket connection");
      this.trigger("error", {
        message: "Authentication required to send messages",
      });
      return;
    }

    if (!this.socket) {
      console.error("Socket not initialized, initializing now");
      this.init();
      this.connect();

      // Schedule message sending after connection
      const retryTimeout = setTimeout(() => {
        if (this.socket?.connected) {
          console.log("Socket connected, sending delayed message");
          this.socket.emit("send_message", messageData);
          this.trigger("message_sent", { success: true });
        } else {
          console.error("Socket failed to connect after initialization");
          this.trigger("error", {
            message: "Failed to connect to chat server",
          });
        }
        clearTimeout(retryTimeout);
      }, 1500);

      return;
    }

    if (!this.socket.connected) {
      console.error("Socket not connected, attempting to reconnect", {
        hasSocket: !!this.socket,
        connected: this.socket?.connected,
        authToken: !!token,
      });

      // Reinitialize with fresh token
      this.init();
      this.connect();

      // Emit an event for UI feedback
      this.trigger("reconnecting", {});

      // Attempt to send after reconnection
      const retryTimeout = setTimeout(() => {
        if (this.socket?.connected) {
          console.log("Socket reconnected, sending delayed message");
          this.socket.emit("send_message", messageData);
          this.trigger("message_sent", { success: true });
        } else {
          console.error("Socket failed to reconnect", {
            hasSocket: !!this.socket,
            connected: this.socket?.connected,
          });
          this.trigger("error", {
            message: "Failed to reconnect to chat server",
          });
        }
        clearTimeout(retryTimeout);
      }, 2000);

      return;
    }

    console.log("Sending message to group:", messageData.groupId);
    this.socket.emit("send_message", messageData);
  }

  // Send a typing notification
  public sendTyping(groupId: string, username: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("typing", { groupId, username });
  }

  // Add a reaction to a message
  public addReaction(
    messageId: string,
    groupId: string,
    reaction: string
  ): void {
    if (!this.socket?.connected) return;
    this.socket.emit("add_reaction", { messageId, groupId, reaction });
  }

  // Register an event listener
  public on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)?.push(callback);

    // Return a function to remove this listener
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index !== -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }

  // Trigger event listeners
  private trigger(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Check if socket is connected
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public onMessage(handler: (message: Message) => void) {
    this.messageHandler = handler;
    if (this.socket) {
      this.socket.on("message", handler);
    }
  }

  public offMessage(handler: (message: Message) => void) {
    if (this.socket && this.messageHandler === handler) {
      this.socket.off("message", handler);
      this.messageHandler = null;
    }
  }

  public onMessageUpdate(handler: (message: Message) => void) {
    this.messageUpdateHandler = handler;
    if (this.socket) {
      this.socket.on("message_update", handler);
    }
  }

  public offMessageUpdate(handler: (message: Message) => void) {
    if (this.socket && this.messageUpdateHandler === handler) {
      this.socket.off("message_update", handler);
      this.messageUpdateHandler = null;
    }
  }

  public onMessageDelete(handler: (messageId: string) => void) {
    this.messageDeleteHandler = handler;
    if (this.socket) {
      this.socket.on("message_delete", handler);
    }
  }

  public offMessageDelete(handler: (messageId: string) => void) {
    if (this.socket && this.messageDeleteHandler === handler) {
      this.socket.off("message_delete", handler);
      this.messageDeleteHandler = null;
    }
  }

  public onReactionAdd(
    handler: (reaction: {
      id: string;
      message_id: string;
      reaction: string;
      user: { id: string; username: string; avatar: string | null };
    }) => void
  ) {
    this.reactionAddHandler = handler;
    if (this.socket) {
      this.socket.on("reaction_added", handler);
    }
  }

  public offReactionAdd(
    handler: (reaction: {
      id: string;
      message_id: string;
      reaction: string;
      user: { id: string; username: string; avatar: string | null };
    }) => void
  ) {
    if (this.socket && this.reactionAddHandler === handler) {
      this.socket.off("reaction_added", handler);
      this.reactionAddHandler = null;
    }
  }

  public onReactionRemove(
    handler: (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => void
  ) {
    this.reactionRemoveHandler = handler;
    if (this.socket) {
      this.socket.on("reaction_removed", handler);
    }
  }

  public offReactionRemove(
    handler: (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => void
  ) {
    if (this.socket && this.reactionRemoveHandler === handler) {
      this.socket.off("reaction_removed", handler);
      this.reactionRemoveHandler = null;
    }
  }

  private cleanupEventListeners() {
    if (!this.socket) return;

    if (this.messageHandler) {
      this.socket.off("message", this.messageHandler);
    }
    if (this.messageUpdateHandler) {
      this.socket.off("message_update", this.messageUpdateHandler);
    }
    if (this.messageDeleteHandler) {
      this.socket.off("message_delete", this.messageDeleteHandler);
    }
    if (this.reactionAddHandler) {
      this.socket.off("reaction_added", this.reactionAddHandler);
    }
    if (this.reactionRemoveHandler) {
      this.socket.off("reaction_removed", this.reactionRemoveHandler);
    }
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;
