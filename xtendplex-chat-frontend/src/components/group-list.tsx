import { useSocket } from "@/hooks/useSocket";
import GroupService from "@/services/GroupService";
import { useEffect, useState } from "react";

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  member_count: number;
  created_at: string;
}

export function GroupList({
  onSelectGroup,
}: {
  onSelectGroup: (groupId: string) => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket(); // No specific group ID for the main connection

  useEffect(() => {
    async function fetchPublicGroups() {
      try {
        setLoading(true);
        const fetchedGroups = await GroupService.getGroups();
        setGroups(fetchedGroups as unknown as Group[]);
        setError(null);
      } catch (err) {
        console.error("Error fetching public groups:", err);
        setError("Failed to load groups. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchPublicGroups();
  }, []);

  if (loading) {
    return <div className="p-4">Loading groups...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">{error}</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        No public groups available
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h2 className="text-lg font-semibold mb-4">Public Groups</h2>
      {groups.map((group) => (
        <div
          key={group.id}
          className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
          onClick={() => onSelectGroup(group.id)}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {group.avatar ? (
                <img
                  src={group.avatar}
                  alt={group.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                group.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{group.name}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {group.description || "No description"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {group.member_count}{" "}
              {group.member_count === 1 ? "member" : "members"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
