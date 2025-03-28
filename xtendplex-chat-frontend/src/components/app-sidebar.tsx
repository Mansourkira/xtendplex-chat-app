import { GalleryVerticalEnd, Group, UserIcon } from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
// Get user from localStorage
const storedUser = localStorage.getItem("user");
const userFromStorage = storedUser ? JSON.parse(storedUser) : null;

const data = {
  user: userFromStorage || {
    name: "Guest",
    email: "",
    avatar: "/avatars/default.jpg",
  },
  teams: [
    {
      name: userFromStorage?.username || "Guest",
      logo: GalleryVerticalEnd,
      plan: "XtendPlex Chat",
    },
  ],
  navMain: [
    {
      title: "Chat",
      url: "/chat",
      icon: GalleryVerticalEnd,
      isActive: true,
      items: [
        {
          title: "Messages",
          url: "/chat",
        },
        {
          title: "Settings",
          url: "/chat/settings",
        },
      ],
    },
    {
      title: "Users",
      url: "/users",
      icon: UserIcon,
      items: [
        {
          title: "User Management",
          url: "/users",
        },
        {
          title: "Add User",
          url: "/users/add",
        },
      ],
    },
    {
      title: "Groups",
      url: "#",
      icon: Group,
      items: [
        {
          title: "Create",
          url: "/groups/add",
        },
        {
          title: "Manage",
          url: "/groups",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
