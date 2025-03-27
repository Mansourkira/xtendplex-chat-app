import { AppSidebar } from "@/components/app-sidebar";
import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ChatNav } from "@/components/chat-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import UserManagementPage from "@/pages/users";
import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

// Message interface for chat
interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

// Chat component that combines all chat-related components
function ChatComponent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Welcome to Xtendplex Chat! How can I help you today?",
      sender: "System",
      timestamp: new Date(),
      isCurrentUser: false,
    },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: user?.username || "User",
      timestamp: new Date(),
      isCurrentUser: true,
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Here you would typically send the message to your backend
  };

  return (
    <div className="flex h-full">
      <ChatNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader>
          <h2 className="text-lg font-semibold">Chat</h2>
        </ChatHeader>
        <div className="flex-1 overflow-y-auto">
          <ChatMessages chatId="1" type="individual" />
        </div>
        <ChatInput chatId="1" type="individual" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const location = useLocation();

  // Function to determine breadcrumb title based on current path
  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path.includes("/users")) return "Users";
    if (path.includes("/chat")) return "Messages";
    return "Dashboard";
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Xtendplex Chat</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getBreadcrumbTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 pt-0">
          {/* Main content area that changes based on route */}
          <Routes>
            <Route index element={<ChatComponent />} />
            <Route path="chat/*" element={<ChatComponent />} />
            <Route path="users/*" element={<UserManagementPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
