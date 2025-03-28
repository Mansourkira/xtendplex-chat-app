import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { GroupService, UserService } from "@/services";
import { Group } from "@/services/GroupService";
import { User } from "@/services/UserService";
import { Menu, MessageSquare, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function ChatNav() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Fetch users and groups
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [chatUsers, userGroups] = await Promise.all([
          UserService.getChatUsers(),
          GroupService.getGroups(),
        ]);
        setUsers(chatUsers);
        setGroups(userGroups);
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <>
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Chat</h1>
          <div className="w-9" />
        </div>
      )}
      <div
        className={cn(
          "border-r bg-background transition-all duration-300 ease-in-out",
          isMobile
            ? open
              ? "fixed inset-y-0 left-0 z-50 w-3/4 max-w-xs"
              : "fixed inset-y-0 -left-full z-50 w-3/4 max-w-xs"
            : "relative w-80"
        )}
      >
        {isMobile && open && (
          <div className="absolute right-4 top-4">
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Messages</h2>
          <Tabs defaultValue="individual">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="individual">
                <MessageSquare className="h-4 w-4 mr-2" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="group">
                <Users className="h-4 w-4 mr-2" />
                Groups
              </TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="m-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-muted-foreground">Loading contacts...</p>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-destructive">{error}</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-muted-foreground">
                      No users found. Add friends to start chatting!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <Link
                        key={user.id}
                        to={`/chat/individual/${user.id}`}
                        onClick={() => isMobile && setOpen(false)}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent",
                            isActive(`/chat/individual/${user.id}`) &&
                              "bg-accent"
                          )}
                        >
                          <div className="relative">
                            <img
                              src={
                                user.avatar ||
                                "/placeholder.svg?height=40&width=40"
                              }
                              alt={user.username}
                              className="h-10 w-10 rounded-full"
                            />
                            {user.status === "online" && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{user.username}</h3>
                              <span className="text-xs text-muted-foreground">
                                {user.status || "offline"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              Click to start chatting
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="group" className="m-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-muted-foreground">Loading groups...</p>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-destructive">{error}</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-muted-foreground">
                      No groups found. Create a group to start chatting!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <Link
                        key={group.id}
                        to={`/chat/group/${group.id}`}
                        onClick={() => isMobile && setOpen(false)}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent",
                            isActive(`/chat/group/${group.id}`) && "bg-accent"
                          )}
                        >
                          <div className="relative">
                            <img
                              src={
                                group.avatar ||
                                "/placeholder.svg?height=40&width=40"
                              }
                              alt={group.name}
                              className="h-10 w-10 rounded-full"
                            />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{group.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {group.last_message
                                  ? formatTimestamp(
                                      group.last_message.created_at
                                    )
                                  : formatTimestamp(group.updated_at)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {group.last_message
                                ? group.last_message.content
                                : group.description || "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
