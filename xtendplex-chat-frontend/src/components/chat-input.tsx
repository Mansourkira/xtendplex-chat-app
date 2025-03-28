import type React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Use null initially and set it after determining the actual group ID
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);

  // Use socket hook with actualGroupId when available
  const socket = useSocket(actualGroupId || undefined);

  // Handle drag events for file dropping
  const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Convert FileList to array and create a simulated event object
      const files = Array.from(e.dataTransfer.files);
      const simulatedEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      handleFileSelect(simulatedEvent);
    }
  };

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
            console.log(`Initializing DM chat with user: ${chatId}`);
            const response = await ChatService.getDirectMessages(chatId);

            if (response.group_id) {
              console.log(`Successfully got DM group ID: ${response.group_id}`);
              setActualGroupId(response.group_id);
              setError(null);
            } else {
              console.error("No group_id in response");
              setError("Unable to establish a direct message channel.");
              setActualGroupId(null);
            }
          } catch (err: any) {
            console.error("Error getting direct message group ID:", err);

            // More detailed error handling
            if (err.response?.status === 404) {
              setError("User not found. Please check the user ID.");
            } else if (err.response?.status === 500) {
              console.log("Server error. Retrying in 3 seconds...");
              setError("Setting up chat channel... Please wait it.");

              // Retry after delay
              setTimeout(() => {
                console.log("Retrying initialization...");
                initializeGroupId();
              }, 3000);
            } else {
              setError(
                err.response?.data?.message || "Unable to connect to this chat."
              );
            }

            setActualGroupId(null);
          }
        } else {
          // For group chats
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
    setError(null);

    try {
      // In a real app, you would upload files to your server/cloud storage
      // and get back URLs. For now, we'll create mock file paths
      const newAttachments: FileAttachment[] = [];

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];

        // Check file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File ${file.name} exceeds the maximum size of 10MB.`);
          continue;
        }

        // Create file reader to generate preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              // Update attachment with preview
              setAttachments((prev) =>
                prev.map((att) => {
                  if (
                    att.fileName === file.name &&
                    att.fileSize === file.size
                  ) {
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
    } catch (err) {
      console.error("Error processing files:", err);
      setError("Failed to process file attachments. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Get icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return "🖼️";
    } else if (fileType.startsWith("video/")) {
      return "🎬";
    } else if (fileType.startsWith("audio/")) {
      return "🔊";
    } else if (fileType.includes("pdf")) {
      return "📄";
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return "📝";
    } else if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return "📊";
    } else if (
      fileType.includes("presentation") ||
      fileType.includes("powerpoint")
    ) {
      return "📑";
    } else if (fileType.includes("zip") || fileType.includes("compressed")) {
      return "🗜️";
    } else if (fileType.includes("text")) {
      return "📝";
    } else {
      return "📎";
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

    setIsUploading(true);

    console.log("Sending message:", {
      content: message.trim(),
      groupId: actualGroupId,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    try {
      // In a real app, you would upload the attachments first and then send the message
      // For this demo, we'll simulate a short delay if there are attachments
      if (attachments.length > 0) {
        // Simulate file upload time based on number of attachments (0.5s per file)
        const simulatedUploadTime = attachments.length * 500;

        setTimeout(() => {
          // Send message via socket after "uploading" the files
          socket.sendMessage(
            message.trim(),
            undefined, // parentId for replies (not implemented yet)
            attachments.length > 0 ? attachments : undefined
          );

          // Clear inputs
          setMessage("");
          setAttachments([]);
          setError(null);
          setIsUploading(false);
        }, simulatedUploadTime);
      } else {
        // No attachments, send immediately
        socket.sendMessage(message.trim(), undefined, undefined);

        // Clear inputs
        setMessage("");
        setIsUploading(false);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
      setIsUploading(false);
    }
  };

  // Don't show input if no chat is selected
  if (!chatId) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "border-t p-4 mb-3 bg-background shadow-md relative",
        isDragging && "ring-2 ring-primary/50 bg-primary/5"
      )}
      ref={formRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary/30 z-10 pointer-events-none rounded-md">
          <div className="text-primary font-medium flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 mb-2 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            <span>Drop files to attach</span>
          </div>
        </div>
      )}
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
              className="flex items-center bg-muted p-2 rounded-md pr-1 group hover:bg-muted/80 transition-colors relative animate-slideInRight"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {attachment.preview ? (
                <div className="w-8 h-8 mr-2 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={attachment.preview}
                    alt={attachment.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 mr-2 flex items-center justify-center bg-background/80 rounded flex-shrink-0">
                  <span role="img" aria-label="file type">
                    {getFileIcon(attachment.fileType)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate max-w-40 block">
                  {attachment.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(attachment.fileSize / 1024)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-2 p-1 rounded-full hover:bg-background/90 transition-colors"
              >
                <XIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                <span className="sr-only">Remove attachment</span>
              </button>
              {isUploading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-background/80"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !actualGroupId}
          >
            <PaperclipIcon className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Attach file</span>
          </Button>
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
            className="min-h-10 max-h-24 flex-1 resize-none py-2 px-3 rounded-md border-none focus-visible:ring-0 bg-transparent"
          />

          {/* Emoji button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-background/80"
          >
            <SmileIcon className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Add emoji</span>
          </Button>

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={
              (!message.trim() && attachments.length === 0) ||
              isUploading ||
              !actualGroupId
            }
          >
            {isUploading ? (
              <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
