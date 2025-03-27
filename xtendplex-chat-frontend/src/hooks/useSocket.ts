import { useEffect, useRef } from "react";
import { SocketService } from "../services";
import { Message } from "../services/ChatService";

// Hook for using the socket service in React components
export const useSocket = (groupId?: string) => {
  const unsubscribe = useRef<Array<() => void>>([]);

  // Connect to socket on mount
  useEffect(() => {
    SocketService.init();
    SocketService.connect();

    // Cleanup on unmount
    return () => {
      // Don't disconnect so socket stays alive between route changes
      // Just clean up listeners
      unsubscribe.current.forEach((unsub) => unsub());
      unsubscribe.current = [];
    };
  }, []);

  // Join group if groupId provided
  useEffect(() => {
    if (groupId && SocketService.isConnected()) {
      SocketService.joinGroup(groupId);
    }
  }, [groupId, SocketService.isConnected()]);

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

    SocketService.sendMessage({
      content,
      groupId,
      parentId,
      attachments,
    });
  };

  // Function to send typing notification
  // This function can be called with either:
  // - Just a username (using the hook's groupId)
  // - Specific groupId and username
  const sendTyping = (groupIdOrUsername: string, username?: string) => {
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
    if (!groupId) return;
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

  return {
    sendMessage,
    sendTyping,
    addReaction,
    onMessage,
    onTyping,
    onReactionAdded,
    onReactionRemoved,
    isConnected: SocketService.isConnected,
    joinGroup: (id: string) => SocketService.joinGroup(id),
  };
};
