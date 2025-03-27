"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { ChatService } from "@/services";
import { Message } from "@/services/ChatService";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";

interface ChatMessagesProps {
  chatId: string;
  type: "individual" | "group";
}

export function ChatMessages({ chatId, type }: ChatMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>(
    {}
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<{ [userId: string]: NodeJS.Timeout }>({});
  const lastMessageRef = useRef<string | null>(null);

  // Convert chat type and ID to a group ID for socket communication
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);

  // Initialize socket with actualGroupId when it's available
  const socket = useSocket(actualGroupId || undefined);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      let fetchedMessages: Message[] = [];

      if (type === "individual") {
        const response = await ChatService.getDirectMessages(chatId);
        fetchedMessages = response.messages || [];

        // If we got a group_id from the direct messages response, update our groupId
        if (response.group_id) {
          setActualGroupId(response.group_id);
          socket.joinGroup(response.group_id);
        }
      } else {
        // For group messages
        fetchedMessages = await ChatService.getGroupMessages(chatId);

        // Set the actual group ID for socket communication
        setActualGroupId(chatId);

        // Join the group for socket communication
        socket.joinGroup(chatId);
      }

      setMessages(fetchedMessages);
      lastMessageRef.current =
        fetchedMessages[fetchedMessages.length - 1]?.id || null;
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages on mount and when chat changes
  useEffect(() => {
    fetchMessages();
    // Clear typing users when changing chats
    setTypingUsers({});
    // Clear typing timeouts
    Object.values(typingTimeoutRef.current).forEach((timeout) =>
      clearTimeout(timeout)
    );
    typingTimeoutRef.current = {};
  }, [chatId, type]);

  // Listen for new messages
  useEffect(() => {
    if (!actualGroupId) return;

    const handleNewMessage = (message: Message) => {
      console.log("New message received:", message);

      // Only add message if it's not already in the list
      setMessages((prevMessages) => {
        if (prevMessages.some((m) => m.id === message.id)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });

      // If this is a new message, scroll to bottom
      if (lastMessageRef.current !== message.id) {
        lastMessageRef.current = message.id;
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }

      // Remove user from typing list when they send a message
      if (message.user_id && typingUsers[message.user_id]) {
        setTypingUsers((prev) => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[message.user_id];
          return newTypingUsers;
        });
      }
    };

    socket.onMessage(handleNewMessage);

    return () => {
      // Clean up the message listener when the component unmounts or changes
    };
  }, [socket, actualGroupId, messages, typingUsers]);

  // Listen for typing notifications
  useEffect(() => {
    if (!actualGroupId) return;

    const handleTyping = (data: {
      userId: string;
      username: string;
      groupId: string;
    }) => {
      // Make sure typing notification is for this group
      if (data.groupId !== actualGroupId) return;

      // Add user to typing list
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.username }));

      // Clear previous timeout for this user if exists
      if (typingTimeoutRef.current[data.userId]) {
        clearTimeout(typingTimeoutRef.current[data.userId]);
      }

      // Set timeout to remove user from typing list after 3 seconds
      typingTimeoutRef.current[data.userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[data.userId];
          return newTypingUsers;
        });
      }, 3000);
    };

    socket.onTyping(handleTyping);

    return () => {
      // Clear all timeouts on unmount
      Object.values(typingTimeoutRef.current).forEach((timeout) =>
        clearTimeout(timeout)
      );
    };
  }, [socket, actualGroupId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check if a message is from the current user
  const isCurrentUser = (userId: string) => {
    return userId === user?.id;
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 max-w-[80%]",
              isCurrentUser(message.user_id) ? "ml-auto" : "mr-auto"
            )}
          >
            {!isCurrentUser(message.user_id) && message.user && (
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={
                    message.user.avatar || "/placeholder.svg?height=40&width=40"
                  }
                  alt={message.user.username}
                />
                <AvatarFallback>
                  {message.user.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              {type === "group" &&
                !isCurrentUser(message.user_id) &&
                message.user && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {message.user.username}
                  </p>
                )}
              <div className="flex flex-col gap-1">
                <div
                  className={cn(
                    "rounded-lg p-3",
                    isCurrentUser(message.user_id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm">{message.content}</p>

                  {/* Display attachments if any */}
                  {message.message_attachments &&
                    message.message_attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.message_attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 p-2 bg-background rounded border text-xs"
                          >
                            <a
                              href={attachment.file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline"
                            >
                              <span>{attachment.file_name}</span>
                              <span className="text-muted-foreground">
                                ({Math.round(attachment.file_size / 1024)} KB)
                              </span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Show edit indicator */}
                  {message.is_edited && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (edited)
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(message.created_at)}
                </span>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {message.reactions.map((reaction) => (
                      <div
                        key={reaction.id}
                        className="inline-flex items-center bg-muted px-2 py-1 rounded-full text-xs"
                      >
                        <span>{reaction.reaction}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isCurrentUser(message.user_id) && message.user && (
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={
                    message.user.avatar || "/placeholder.svg?height=40&width=40"
                  }
                  alt={message.user.username}
                />
                <AvatarFallback>
                  {message.user.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {/* Typing indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="flex items-center gap-1">
              {Object.values(typingUsers).map((username) => (
                <span key={username}>{username}</span>
              ))}
              <span>
                {Object.keys(typingUsers).length === 1
                  ? " is typing"
                  : " are typing"}
              </span>
            </div>
            <span className="animate-pulse">...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
