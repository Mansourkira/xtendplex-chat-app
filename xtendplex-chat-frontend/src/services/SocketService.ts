import { io, Socket } from "socket.io-client";
import { Message } from "./ChatService";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;

  // Initialize socket connection
  public init(): void {
    if (this.socket) return;

    // Get the API URL from environment or use default
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

    this.socket = io(API_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
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

      // Authenticate the socket connection with token
      this.authenticate();
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
    });

    // Chat events
    this.socket.on("receive_message", (message: Message) => {
      this.trigger("message", message);
    });

    this.socket.on(
      "user_typing",
      (data: { userId: string; username: string; groupId: string }) => {
        this.trigger("typing", data);
      }
    );

    this.socket.on("reaction_added", (reaction) => {
      this.trigger("reaction_added", reaction);
    });

    this.socket.on("reaction_removed", (data) => {
      this.trigger("reaction_removed", data);
    });

    // Auth events
    this.socket.on("authenticated", (data) => {
      console.log("Socket authenticated:", data);
      this.trigger("authenticated", data);
    });

    this.socket.on("auth_error", (error) => {
      console.error("Authentication error:", error);
      this.trigger("auth_error", error);
    });
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

  // Authenticate the socket connection
  private async authenticate(): Promise<void> {
    if (!this.socket?.connected) return;

    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        this.socket.emit("authenticate", token);
      } else {
        console.error("No authentication token available");
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
  }

  // Join a group chat
  public joinGroup(groupId: string): void {
    if (!this.socket?.connected) return;
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
    if (!this.socket?.connected) return;
    this.socket.emit("new_message", messageData);
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
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;
