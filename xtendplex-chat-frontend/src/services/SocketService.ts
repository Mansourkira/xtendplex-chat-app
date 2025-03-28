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

    // Use the exact URL that worked in the HTML test page
    const API_URL = "http://localhost:3000";
    console.log("Using API URL for socket:", API_URL);

    // Get auth token - ensure we get the correct token format
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.warn("No access token found for socket connection");
    } else {
      console.log("Initializing socket with token available");
    }

    try {
      // Following EXACTLY the working HTML test page approach
      this.socket = io(API_URL, {
        autoConnect: false,
        auth: { token },
      });

      console.log("Socket.io instance created");
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing socket:", error);
    }
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("Socket connected successfully with ID:", this.socket?.id);
      this.reconnectionAttempts = 0;
      this.trigger("connect", {});
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.trigger("disconnect", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connect error:", error);
      this.trigger("connect_error", error);
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.trigger("error", error);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      this.reconnectionAttempts = attempt;
      this.trigger("reconnecting", {});

      // Update the token on reconnect attempt - in case it was refreshed
      if (this.socket) {
        const token = localStorage.getItem("access_token");
        if (token) {
          this.socket.auth = { token };
        }
      }
    });

    // Chat events - always set these up regardless of handlers
    // This ensures events are captured even if handlers are registered later
    this.socket.on("message", (message) => {
      console.log("Socket received message event:", message);
      if (this.messageHandler) {
        this.messageHandler(message);
      }
      this.trigger("message", message);
    });

    this.socket.on("message_update", (message) => {
      console.log("Socket received message_update event:", message);
      if (this.messageUpdateHandler) {
        this.messageUpdateHandler(message);
      }
      this.trigger("message_update", message);
    });

    this.socket.on("message_delete", (messageId) => {
      console.log("Socket received message_delete event:", messageId);
      if (this.messageDeleteHandler) {
        this.messageDeleteHandler(messageId);
      }
      this.trigger("message_delete", messageId);
    });

    this.socket.on("reaction_added", (reaction) => {
      console.log("Socket received reaction_added event:", reaction);
      if (this.reactionAddHandler) {
        this.reactionAddHandler(reaction);
      }
      this.trigger("reaction_added", reaction);
    });

    this.socket.on("reaction_removed", (data) => {
      console.log("Socket received reaction_removed event:", data);
      if (this.reactionRemoveHandler) {
        this.reactionRemoveHandler(data);
      }
      this.trigger("reaction_removed", data);
    });

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
    if (!this.socket) {
      console.log("Socket not initialized, initializing before connecting");
      this.init();
    }

    // Log token presence before connecting
    const token = localStorage.getItem("access_token");
    console.log("Connect method: token available:", !!token);

    console.log("Attempting to connect socket");
    this.socket?.connect();

    // Add small delay and check connection
    setTimeout(() => {
      console.log(
        "Connection status after connect attempt:",
        this.socket?.connected
      );
    }, 1000);
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
    if (!this.socket) {
      console.error("Socket not initialized, cannot send message");
      this.trigger("error", { message: "Socket connection not initialized" });
      return;
    }

    if (!this.socket.connected) {
      console.error("Socket not connected, cannot send message");
      this.trigger("error", { message: "Not connected to chat server" });

      // Try to reconnect
      const token = localStorage.getItem("access_token");
      if (token) {
        console.log("Attempting to reconnect before sending message...");
        this.socket.auth = { token };
        this.connect();
      }
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
    if (!this.socket?.connected) {
      console.error("Socket not connected, cannot add reaction");
      return;
    }

    console.log(
      `Emitting add_reaction: ${reaction} to message ${messageId} in group ${groupId}`
    );

    // Follow the server-side route structure
    this.socket.emit("add_reaction", {
      messageId,
      groupId,
      reaction,
      // The server needs to know which message to add the reaction to
      message_id: messageId,
    });
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
      console.log("Registering reaction_added handler");
      this.socket.on("reaction_added", handler);
    }
    return () => this.offReactionAdd(handler);
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
      console.log("Removing reaction_added handler");
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
      console.log("Registering reaction_removed handler");
      this.socket.on("reaction_removed", handler);
    }
    return () => this.offReactionRemove(handler);
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
