import { Button } from "@/components/ui/button";
import { GroupService, UserService } from "@/services";
import { MessageSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function ChatWelcome() {
  const [firstUserId, setFirstUserId] = useState<string | null>(null);
  const [firstGroupId, setFirstGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get first user and group
        const [users, groups] = await Promise.all([
          UserService.getChatUsers(),
          GroupService.getGroups(),
        ]);

        if (users.length > 0) {
          setFirstUserId(users[0].id);
        }

        if (groups.length > 0) {
          setFirstGroupId(groups[0].id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">Welcome to Chat</h1>
        <p className="text-muted-foreground">
          Select a conversation from the sidebar or start a new one
        </p>

        {loading ? (
          <p className="text-muted-foreground">Loading available chats...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {firstUserId ? (
              <Link to={`/chat/individual/${firstUserId}`}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                >
                  <MessageSquare className="h-6 w-6" />
                  <span>Individual Chat</span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                disabled
              >
                <MessageSquare className="h-6 w-6" />
                <span>No Users Available</span>
              </Button>
            )}

            {firstGroupId ? (
              <Link to={`/chat/group/${firstGroupId}`}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                >
                  <Users className="h-6 w-6" />
                  <span>Group Chat</span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                disabled
              >
                <Users className="h-6 w-6" />
                <span>No Groups Available</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
