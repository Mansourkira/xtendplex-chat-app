import apiClient from "./ApiClient";
import { User } from "./UserService";

// Types
export interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  parent_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  };
  message_attachments?: Array<{
    id: string;
    file_path: string;
    file_type: string;
    file_name: string;
    file_size: number;
    created_at: string;
  }>;
  reactions?: Array<{
    id: string;
    reaction: string;
    user: {
      id: string;
      username: string;
      avatar: string | null;
    };
  }>;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_path: string;
  file_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

export interface MessageReadStatus {
  userId: string;
  messageId: string;
  readAt: string;
  user?: User;
}

export interface SendMessageRequest {
  content: string;
  recipientId?: string;
  groupId?: string;
  parentId?: string;
  attachments?: {
    filePath: string;
    fileType: string;
    fileName: string;
    fileSize: number;
  }[];
}

export interface GetMessagesOptions {
  page?: number;
  limit?: number;
  before?: string; // timestamp or message ID
  after?: string; // timestamp or message ID
}

const ChatService = {
  // Get direct messages between current user and another user
  getDirectMessages: async (
    userId: string,
    options: GetMessagesOptions = {}
  ): Promise<{ group_id: string; messages: Message[] }> => {
    return apiClient.get<{ group_id: string; messages: Message[] }>(
      `/messages/direct/${userId}`,
      {
        params: options,
      }
    );
  },

  // Get group messages
  getGroupMessages: async (
    groupId: string,
    options: GetMessagesOptions = {}
  ): Promise<Message[]> => {
    return apiClient.get<Message[]>(`/messages/group/${groupId}`, {
      params: options,
    });
  },

  // Send message (to user or group)
  sendMessage: async (message: SendMessageRequest): Promise<Message> => {
    return apiClient.post<Message>("/messages", message);
  },

  // Delete message
  deleteMessage: async (messageId: string): Promise<void> => {
    return apiClient.delete(`/messages/${messageId}`);
  },

  // Update message
  updateMessage: async (
    messageId: string,
    content: string
  ): Promise<Message> => {
    return apiClient.put<Message>(`/messages/${messageId}`, { content });
  },

  // Mark message as read
  markAsRead: async (messageId: string): Promise<void> => {
    return apiClient.post(`/messages/${messageId}/read`);
  },

  // Mark all messages as read
  markAllAsRead: async (userId?: string, groupId?: string): Promise<void> => {
    return apiClient.post("/messages/read-all", { userId, groupId });
  },

  // Get unread message count
  getUnreadCount: async (): Promise<{
    direct: number;
    groups: { [groupId: string]: number };
  }> => {
    return apiClient.get<{
      direct: number;
      groups: { [groupId: string]: number };
    }>("/messages/unread-count");
  },

  // Add a reaction to a message
  addReaction: async (messageId: string, reaction: string): Promise<void> => {
    return apiClient.post(`/messages/${messageId}/reactions`, { reaction });
  },

  // Get attachments for a message
  getAttachments: async (messageId: string): Promise<Attachment[]> => {
    return apiClient.get<Attachment[]>(`/attachments/message/${messageId}`);
  },

  // Upload attachment
  uploadAttachment: async (
    messageId: string,
    file: {
      file_path: string;
      file_type: string;
      file_name: string;
      file_size: number;
    }
  ): Promise<Attachment> => {
    return apiClient.post<Attachment>(`/attachments/${messageId}`, file);
  },
};

export default ChatService;
