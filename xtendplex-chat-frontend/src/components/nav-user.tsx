"use client";

import { BadgeCheck, ChevronsUpDown, Circle, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useToaster } from "@/hooks/use-toaster";
import AuthService, { UserStatus } from "@/services/AuthService";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
export function NavUser({
  user,
}: {
  user: {
    username: string;
    email: string;
    avatar: string;
    status?: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { logout, user: authUser, setUser } = useAuth();
  const { success, error, info, warning } = useToaster();
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState<UserStatus>(
    (authUser?.status as UserStatus) || "online"
  );
  console.log("Current status:", currentStatus);

  const handleAccount = () => {
    // Handle account click
    navigate("/profile");
    console.log("Account clicked");
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleStatusChange = async (status: UserStatus) => {
    try {
      const response = await AuthService.updateStatus(status);
      setCurrentStatus(status);

      // Update user object in auth context
      if (authUser) {
        setUser({
          ...authUser,
          status,
        });
      }

      success(`Your status is now ${status}`);
    } catch (err) {
      console.error("Error updating status:", err);
      // Use error toast instead of calling error as a function
      error(
        `Failed to update your status: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "away":
        return "text-amber-500";
      case "offline":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <Circle
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full fill-current ${getStatusColor(
                    currentStatus
                  )} stroke-background stroke-2`}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.username}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="relative">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <Circle
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full fill-current ${getStatusColor(
                      currentStatus
                    )} stroke-background stroke-2`}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.username}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Circle
                    className={`mr-2 h-4 w-4 ${getStatusColor(currentStatus)}`}
                  />
                  <span>Status: {currentStatus || "online"}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("online")}
                  >
                    <Circle className="mr-2 h-4 w-4 text-green-500" />
                    <span>Online</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("away")}>
                    <Circle className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Away</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("offline")}
                  >
                    <Circle className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Offline</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={handleAccount}>
                <BadgeCheck className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
