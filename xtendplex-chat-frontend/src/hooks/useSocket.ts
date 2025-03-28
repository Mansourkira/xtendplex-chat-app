import { useEffect, useRef, useState } from "react";
import { SocketService } from "../services";
import { Message } from "../services/ChatService";

// Hook for using the socket service in React components
export const useSocket = (groupId?: string) => {
  const unsubscribe = useRef<Array<() => void>>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to socket on mount
  useEffect(() => {
    SocketService.init();
    SocketService.connect();

    // Set up connection status listener
    const connectionStatusListener = SocketService.on("connect", () => {
      console.log("Socket connected event in hook");
      setIsConnected(true);
    });

    const disconnectListener = SocketService.on("disconnect", () => {
      console.log("Socket disconnected event in hook");
      setIsConnected(false);
    });

    const connectErrorListener = SocketService.on(
      "connect_error",
      (error: Error) => {
        console.error("Socket connect_error in hook:", error);
        setIsConnected(false);
      }
    );

    // Check initial connection status
    setIsConnected(SocketService.isConnected());

    // Cleanup on unmount
    return () => {
      // Don't disconnect so socket stays alive between route changes
      // Just clean up listeners
      unsubscribe.current.forEach((unsub) => unsub());
      connectionStatusListener();
      disconnectListener();
      connectErrorListener();
      unsubscribe.current = [];
    };
  }, []);

  // Join group if groupId provided and socket is connected
  useEffect(() => {
    if (groupId && isConnected) {
      console.log("Joining group in hook", groupId);
      SocketService.joinGroup(groupId);
    }
  }, [groupId, isConnected]);

  // Function to send a message
  const sendMessage = (
    content: string,
    parentId?: string,
    attachments?: Array<{
      filePath: string;
      fileType: string;
      fileName: string;
      fileSize: number;
    }>
  ) => {
    if (!groupId) {
      console.error("Group ID is required to send a message");
      return;
    }

    if (!isConnected) {
      console.error("Socket not connected, cannot send message", {
        socketStatus: SocketService.isConnected()
          ? "connected (service)"
          : "disconnected (service)",
        hookStatus: isConnected ? "connected (hook)" : "disconnected (hook)",
      });

      // Try to reconnect
      SocketService.connect();
      setTimeout(() => {
        if (SocketService.isConnected()) {
          console.log("Socket reconnected, sending message");
          SocketService.sendMessage({
            content,
            groupId,
            parentId,
            attachments,
          });
        }
      }, 1000);
      return;
    }

    SocketService.sendMessage({
      content,
      groupId,
      parentId,
      attachments,
    });
  };

  // Function to send typing notification
  const sendTyping = (groupIdOrUsername: string, username?: string) => {
    if (!isConnected) return;

    if (!username) {
      // Called with just username, use the current groupId
      if (!groupId) return;
      SocketService.sendTyping(groupId, groupIdOrUsername); // groupIdOrUsername is actually username
    } else {
      // Called with both groupId and username
      SocketService.sendTyping(groupIdOrUsername, username);
    }
  };

  // Function to add reaction to a message
  const addReaction = (messageId: string, reaction: string) => {
    if (!groupId || !isConnected) return;

    console.log(
      `Adding reaction ${reaction} to message ${messageId} in group ${groupId}`
    );
    SocketService.addReaction(messageId, groupId, reaction);
  };

  // Register a listener for incoming messages
  const onMessage = (callback: (message: Message) => void) => {
    const unsub = SocketService.on("message", callback);
    unsubscribe.current.push(unsub);
    return unsub;
  };

  // Register a listener for typing notifications
  const onTyping = (
    callback: (data: {
      userId: string;
      username: string;
      groupId: string;
    }) => void
  ) => {
    const unsub = SocketService.on("typing", callback);
    unsubscribe.current.push(unsub);
    return unsub;
  };

  // Register a listener for reaction events
  const onReactionAdded = (callback: (reaction: any) => void) => {
    const unsub = SocketService.on("reaction_added", callback);
    unsubscribe.current.push(unsub);
    return unsub;
  };

  const onReactionRemoved = (
    callback: (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => void
  ) => {
    const unsub = SocketService.on("reaction_removed", callback);
    unsubscribe.current.push(unsub);
    return unsub;
  };

  const onMessageUpdate = (callback: (message: Message) => void) => {
    const unsub = SocketService.on("message_update", callback);
    unsubscribe.current.push(unsub);
    return unsub;
  };

  const onMessageDelete = (callback: (messageId: string) => void) => {
    const unsub = SocketService.on("message_delete", callback);
    unsubscribe.current.push(unsub);
    return unsub;
  };

  // Function to off a listener for incoming messages
  const offMessage = (callback: (message: Message) => void) => {
    SocketService.offMessage(callback);
  };

  // Function to off a listener for message updates
  const offMessageUpdate = (callback: (message: Message) => void) => {
    SocketService.offMessageUpdate(callback);
  };

  // Function to off a listener for message deletes
  const offMessageDelete = (callback: (messageId: string) => void) => {
    SocketService.offMessageDelete(callback);
  };

  // Function to off a listener for reaction adds
  const offReactionAdd = (callback: (reaction: any) => void) => {
    SocketService.offReactionAdd(callback);
  };

  // Function to off a listener for reaction removes
  const offReactionRemove = (
    callback: (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => void
  ) => {
    SocketService.offReactionRemove(callback);
  };

  const offReactionAdded = (callback: (reaction: any) => void) => {
    SocketService.offReactionAdd(callback);
  };

  const offReactionRemoved = (
    callback: (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => void
  ) => {
    SocketService.offReactionRemove(callback);
  };

  return {
    sendMessage,
    sendTyping,
    addReaction,
    onMessage,
    onMessageUpdate,
    onMessageDelete,
    onTyping,
    onReactionAdded,
    onReactionRemoved,
    offMessageUpdate,
    offMessageDelete,
    offMessage,
    offReactionAdded,
    offReactionRemoved,
    offReactionAdd,
    offReactionRemove,
    isConnected,
    joinGroup: (id: string) => {
      if (isConnected) {
        SocketService.joinGroup(id);
      }
    },
  };
};
