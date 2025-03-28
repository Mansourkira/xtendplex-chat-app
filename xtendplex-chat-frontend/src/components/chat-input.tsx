import type React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { ChatService } from "@/services";
import { PaperclipIcon, SendIcon, SmileIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  chatId: string | undefined;
  type: "individual" | "group";
}

interface FileAttachment {
  filePath: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  preview?: string;
}

export function ChatInput({ chatId, type }: ChatInputProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use null initially and set it after determining the actual group ID
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);

  // Use socket hook with actualGroupId when available
  const socket = useSocket(actualGroupId || undefined);

  // Initialize the actual group ID
  useEffect(() => {
    const initializeGroupId = async () => {
      if (!chatId) {
        setActualGroupId(null);
        setError(null);
        return;
      }

      try {
        if (type === "individual") {
          try {
            // For individual chats, we need to get the group ID from the server
            const response = await ChatService.getDirectMessages(chatId);
            if (response.group_id) {
              setActualGroupId(response.group_id);
              setError(null);
            } else {
              setError("Unable to establish a direct message channel.");
              setActualGroupId(null);
            }
          } catch (err: any) {
            console.error("Error getting direct message group ID:", err);

            // Check if it's an authentication error
            if (err.response && err.response.status === 401) {
              setError(
                "You need to be signed in to start a direct message conversation."
              );
            } else if (err.response && err.response.status === 500) {
              setError(
                "Server error while creating direct message. Please try again later."
              );
            } else {
              setError(
                "Unable to connect to this chat. The user may not exist."
              );
            }

            setActualGroupId(null);
          }
        } else {
          // For group chats, the chat ID is the group ID
          setActualGroupId(chatId);
          setError(null);
        }
      } catch (error) {
        console.error("Unexpected error initializing chat:", error);
        setError("Unable to initialize chat. Please try again.");
        setActualGroupId(null);
      }
    };

    initializeGroupId();
  }, [chatId, type]);

  // Handle typing notification
  const handleTyping = () => {
    if (user?.username) {
      socket.sendTyping(user.username);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);

    // In a real app, you would upload files to your server/cloud storage
    // and get back URLs. For now, we'll create mock file paths
    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];

      // Create file reader to generate preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            // Update attachment with preview
            setAttachments((prev) =>
              prev.map((att) => {
                if (att.fileName === file.name && att.fileSize === file.size) {
                  return { ...att, preview: event.target?.result as string };
                }
                return att;
              })
            );
          }
        };
        reader.readAsDataURL(file);
      }

      // Create mock file path - in a real app this would be a URL from your storage
      const mockFilePath = `uploads/${Date.now()}_${file.name}`;

      newAttachments.push({
        filePath: mockFilePath,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    // Make sure we have a group ID before sending
    if (!actualGroupId) {
      console.error("Cannot send message: Group ID not available");
      setError("Unable to send message. Connection to chat not established.");
      return;
    }

    console.log("Sending message:", {
      content: message.trim(),
      groupId: actualGroupId,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    try {
      // Send message via socket
      socket.sendMessage(
        message.trim(),
        undefined, // parentId for replies (not implemented yet)
        attachments.length > 0 ? attachments : undefined
      );

      // Clear inputs
      setMessage("");
      setAttachments([]);
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  // Don't show input if no chat is selected
  if (!chatId) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      {error && (
        <div className="mb-3 p-2 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
      {/* Display attachments */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group rounded border p-2 bg-muted/50"
            >
              {attachment.preview ? (
                <div className="relative w-20 h-20">
                  <img
                    src={attachment.preview}
                    alt={attachment.fileName}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-20 h-20">
                  <span className="text-xs truncate max-w-full px-1">
                    {attachment.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(attachment.fileSize / 1024)} KB
                  </span>
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File input (hidden) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <PaperclipIcon className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>

        {/* Message input */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (message.trim() || attachments.length > 0) {
                handleSubmit(e);
              }
            }
          }}
          onInput={handleTyping}
          placeholder="Type a message..."
          className="min-h-10 flex-1 resize-none"
        />

        {/* Emoji button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <SmileIcon className="h-5 w-5" />
          <span className="sr-only">Add emoji</span>
        </Button>

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          className="rounded-full"
          disabled={
            (!message.trim() && attachments.length === 0) ||
            isUploading ||
            !actualGroupId
          }
        >
          <SendIcon className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
