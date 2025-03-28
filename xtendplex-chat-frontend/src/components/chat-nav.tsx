import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { GroupService, UserService } from "@/services";
import { Group } from "@/services/GroupService";
import { User } from "@/services/UserService";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Menu, MessageSquare, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function ChatNav() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPublicGroups, setLoadingPublicGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Fetch users and my groups on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [chatUsers, userGroups] = await Promise.all([
          UserService.getChatUsers(),
          GroupService.getGroups(),
        ]);

        // Get only non-direct message groups for "My Groups"
        const regularGroups = userGroups.filter(
          (group) => !group.is_direct_message
        );

        // Sort by last message time
        const sortedGroups = regularGroups.sort((a, b) => {
          const aTime = a.last_message?.created_at || a.updated_at;
          const bTime = b.last_message?.created_at || b.updated_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setUsers(chatUsers);
        setMyGroups(sortedGroups);
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to fetch public groups
  const fetchPublicGroups = async () => {
    try {
      setLoadingPublicGroups(true);
      console.log("Fetching public groups...");
      const groups = await GroupService.getGroups();
      console.log(groups);
      // Filter out any groups that I'm already a member of
      // to avoid duplicates between "My Groups" and "Public Groups"
      const myGroupIds = myGroups.map((g) => g.id);
      const filteredPublicGroups = groups.filter(
        (group) => !myGroupIds.includes(group.id)
      );

      console.log(
        `Retrieved ${groups.length} public groups, ${filteredPublicGroups.length} after filtering`
      );
      setPublicGroups(filteredPublicGroups);
    } catch (err) {
      console.error("Error fetching public groups:", err);
    } finally {
      setLoadingPublicGroups(false);
    }
  };

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
          <Tabs
            defaultValue="individual"
            onValueChange={(value) => {
              if (value === "group") {
                fetchPublicGroups();
              }
            }}
          >
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

            {/* Individual tab content */}
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
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={user.avatar}
                                alt={user.username}
                              />
                              <AvatarFallback>
                                {user.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {user.status && (
                              <span
                                className={cn(
                                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                                  user.status === "online" && "bg-green-500",
                                  user.status === "away" && "bg-amber-500",
                                  user.status === "offline" && "bg-gray-500"
                                )}
                              ></span>
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{user.username}</h3>
                              <span
                                className={cn(
                                  "text-xs px-1.5 py-0.5 rounded-full",
                                  user.status === "online" &&
                                    "bg-green-100 text-green-700",
                                  user.status === "away" &&
                                    "bg-amber-100 text-amber-700",
                                  user.status === "offline" &&
                                    "bg-gray-100 text-gray-700"
                                )}
                              >
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

            {/* Group tab content */}
            <TabsContent value="group" className="m-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                {/* Create New Group button */}
                <div className="mb-4">
                  <Button
                    className="w-full flex items-center justify-center"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Group
                  </Button>
                </div>

                {/* My Groups section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground px-1">
                    MY GROUPS
                  </h3>
                  {loading ? (
                    <div className="flex items-center justify-center p-4">
                      <p className="text-muted-foreground">Loading groups...</p>
                    </div>
                  ) : myGroups.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-muted-foreground text-sm">
                        No groups found. Create a group or join one below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myGroups.map((group) => (
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
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={group.avatar}
                                  alt={group.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {group.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
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
                </div>

                {/* Public Groups section */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground px-1">
                    PUBLIC GROUPS
                  </h3>
                  {loadingPublicGroups ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      <span className="ml-2 text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : publicGroups.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-muted-foreground text-sm">
                        No public groups available.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {publicGroups.map((group) => (
                        <Link
                          key={group.id}
                          to={`/chat/group/${group.id}`}
                          onClick={() => isMobile && setOpen(false)}
                        >
                          <div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={group.avatar}
                                  alt={group.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {group.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">{group.name}</h3>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                                  {group.is_public ? "Public" : "Private"}
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <span>{group.member_count || 0} members</span>
                                <span className="mx-1">•</span>
                                <span>
                                  Created {formatTimestamp(group.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {group.description || "No description"}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
