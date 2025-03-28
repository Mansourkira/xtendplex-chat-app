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
  chatId: string | undefined;
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "📷";
    if (fileType.startsWith("video/")) return "🎥";
    if (fileType.startsWith("audio/")) return "🎵";
    return "📄";
  };

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
    // Don't fetch messages if no valid chatId is provided
    if (!chatId || chatId === "undefined") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let fetchedMessages: Message[] = [];

      if (type === "individual") {
        try {
          const response = await ChatService.getDirectMessages(chatId);
          fetchedMessages = response.messages || [];

          // If we got a group_id from the direct messages response, update our groupId
          if (response.group_id) {
            setActualGroupId(response.group_id);
            socket.joinGroup(response.group_id);
          }
        } catch (directMsgError: any) {
          console.error("Error fetching direct messages:", directMsgError);

          // Check if it's an authentication error
          if (
            directMsgError.response &&
            directMsgError.response.status === 401
          ) {
            setError("You must be signed in to access direct messages.");
          } else if (
            directMsgError.response &&
            directMsgError.response.status === 500
          ) {
            setError(
              "Server error while setting up direct messages. The system creates a private group for your conversation."
            );
          } else {
            setError(
              "Unable to load direct messages. The user may not exist or the server is unavailable."
            );
          }

          setLoading(false);
          return;
        }
      } else {
        // For group messages
        try {
          fetchedMessages = await ChatService.getGroupMessages(chatId);

          // Set the actual group ID for socket communication
          setActualGroupId(chatId);

          // Join the group for socket communication
          socket.joinGroup(chatId);
        } catch (groupMsgError) {
          console.error("Error fetching group messages:", groupMsgError);
          setError(
            "Unable to load group messages. The group may not exist or the server is unavailable."
          );
          setLoading(false);
          return;
        }
      }

      setMessages(fetchedMessages);
      lastMessageRef.current =
        fetchedMessages[fetchedMessages.length - 1]?.id || null;
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages. Please try again later.");
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
        // Check if message already exists
        if (prevMessages.some((m) => m.id === message.id)) {
          return prevMessages;
        }

        // Add new message and sort by timestamp
        const newMessages = [...prevMessages, message];
        return newMessages.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
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

    // Listen for message updates
    const handleMessageUpdate = (updatedMessage: Message) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === updatedMessage.id ? updatedMessage : msg
        )
      );
    };

    // Listen for message deletions
    const handleMessageDelete = (messageId: string) => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    };

    // Listen for reactions
    const handleReactionAdd = (reaction: {
      id: string;
      message_id: string;
      reaction: string;
      user: { id: string; username: string; avatar: string | null };
    }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.id === reaction.message_id) {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), reaction],
            };
          }
          return msg;
        })
      );
    };

    const handleReactionRemove = (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.id === data.messageId) {
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(
                (r) =>
                  !(r.user.id === data.userId && r.reaction === data.reaction)
              ),
            };
          }
          return msg;
        })
      );
    };

    // Register all event listeners
    socket.onMessage(handleNewMessage);
    socket.onMessageUpdate(handleMessageUpdate);
    socket.onMessageDelete(handleMessageDelete);
    socket.onReactionAdded(handleReactionAdd);
    socket.onReactionRemoved(handleReactionRemove);

    // Cleanup listeners on unmount or when chat changes
    return () => {
      socket.offMessage(handleNewMessage);
      socket.offMessageUpdate(handleMessageUpdate);
      socket.offMessageDelete(handleMessageDelete);
      socket.offReactionAdded(handleReactionAdd);
      socket.offReactionRemoved(handleReactionRemove);
    };
  }, [socket, actualGroupId, typingUsers]);

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

  // Show a message if no chat is selected
  if (!chatId || chatId === "undefined") {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">
          Select a member or group to start chatting
        </p>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground animate-pulse">
          Loading messages...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-destructive animate-fadeIn">{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground animate-fadeIn">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              isCurrentUser(message.user_id) ? "flex-row-reverse" : "flex-row",
              "max-w-[80%]",
              isCurrentUser(message.user_id) ? "ml-auto" : "mr-auto",
              isCurrentUser(message.user_id)
                ? "animate-slideInRight"
                : "animate-slideInLeft"
            )}
            style={{
              animationDelay: `${index * 100}ms`,
              opacity: 0,
              animation: `${
                isCurrentUser(message.user_id) ? "slideInRight" : "slideInLeft"
              } 0.3s ease-out ${index * 100}ms forwards`,
            }}
          >
            {/* Always show avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage
                src={
                  message.user?.avatar || "/placeholder.svg?height=40&width=40"
                }
                alt={message.user?.username || "User"}
              />
              <AvatarFallback
                className={cn(
                  "text-white",
                  isCurrentUser(message.user_id)
                    ? "bg-primary"
                    : "bg-muted-foreground"
                )}
              >
                {message.user?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                "flex flex-col",
                isCurrentUser(message.user_id) ? "items-end" : "items-start"
              )}
            >
              {/* Username */}
              <span className="text-xs text-muted-foreground mb-1">
                {message.user?.username || "Unknown User"}
              </span>

              {/* Message content */}
              <div
                className={cn(
                  "rounded-lg p-3",
                  isCurrentUser(message.user_id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm">{message.content}</p>

                {/* Attachments section */}
                {message.message_attachments &&
                  message.message_attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.message_attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 p-2 bg-background/80 rounded border text-xs transition-colors hover:bg-background relative overflow-hidden group"
                        >
                          {/* Show animated "new" badge if message is very recent (less than 10 seconds old) */}
                          {Date.now() - new Date(message.created_at).getTime() <
                            10000 && (
                            <div className="absolute top-0 right-0 bg-primary text-[10px] text-primary-foreground px-1 py-0.5 rounded-bl-md animate-pulse">
                              New
                            </div>
                          )}

                          {/* Show image preview if it's an image file */}
                          {attachment.file_type.startsWith("image/") ? (
                            <div className="relative group">
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={attachment.file_path}
                                  alt={attachment.file_name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              </div>
                              <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <a
                                  href={attachment.file_path}
                                  download={attachment.file_name}
                                  className="p-1 bg-background rounded-full hover:bg-primary hover:text-white transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center bg-muted rounded flex-shrink-0 text-base transition-transform group-hover:scale-110">
                              {getFileIcon(attachment.file_type)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <a
                              href={attachment.file_path}
                              download={attachment.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-medium truncate">
                                {attachment.file_name}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {Math.round(attachment.file_size / 1024)} KB •
                                Click to download
                              </span>
                            </a>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                            <a
                              href={attachment.file_path}
                              download={attachment.file_name}
                              className="p-1 bg-primary/10 rounded-full hover:bg-primary hover:text-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                />
                              </svg>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Edit indicator */}
                {message.is_edited && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (edited)
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(message.created_at)}
              </span>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div
                  className={cn(
                    "flex flex-wrap gap-1 mt-1",
                    isCurrentUser(message.user_id)
                      ? "justify-end"
                      : "justify-start"
                  )}
                >
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
        ))}

        {/* Typing indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="flex items-center gap-1">
              {Object.entries(typingUsers).map(([userId, username]) => (
                <div key={userId} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-muted-foreground text-white text-xs">
                      {username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{username}</span>
                </div>
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
