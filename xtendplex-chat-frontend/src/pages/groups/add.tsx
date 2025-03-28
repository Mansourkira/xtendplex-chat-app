import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import GroupService from "@/services/GroupService";
import UserService, { User } from "@/services/UserService";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Search, UserCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  type: z.enum(["public", "private"]),
});

type GroupFormData = z.infer<typeof groupSchema>;

const AddGroupPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      type: "public",
    },
  });

  useEffect(() => {
    // Fetch available users
    const fetchUsers = async () => {
      try {
        const response = await UserService.getUsers();
        // Filter out current user from the list
        const otherUsers = response.users.filter((u) => u.id !== user?.id);
        setUsers(otherUsers);
        setFilteredUsers(otherUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
      }
    };

    fetchUsers();
  }, [user?.id]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const toggleUserSelection = (selectedUser: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === selectedUser.id)
        ? prev.filter((u) => u.id !== selectedUser.id)
        : [...prev, selectedUser]
    );
  };

  const onSubmit = async (data: GroupFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const groupData = {
        name: data.name,
        description: data.description,
        memberIds: selectedUsers.map((u) => u.id),
        is_direct_message: false, // Regular group creation is always non-direct message
      };

      await GroupService.createGroup(groupData);

      setSuccess("Group created successfully!");
      setTimeout(() => {
        navigate("/groups");
      }, 2000);
    } catch (err) {
      setError("Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2"
                onClick={() => navigate("/groups")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Groups
              </Button>
              <CardTitle className="text-xl font-bold">
                Create New Group
              </CardTitle>
              <CardDescription>
                Create a new group to start collaborating with others
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-100 text-green-800">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="Enter group name"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter group description (optional)"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Add Members</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-1 bg-primary/10 rounded-full pl-2 pr-1 py-1"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-5 w-5" />
                      )}
                      <span className="text-sm">{user.username}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-primary/20"
                        onClick={() => toggleUserSelection(user)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* User List */}
              <div className="mt-2 border rounded-md divide-y max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 hover:bg-accent cursor-pointer ${
                      selectedUsers.some((u) => u.id === user.id)
                        ? "bg-primary/10"
                        : ""
                    }`}
                    onClick={() => toggleUserSelection(user)}
                  >
                    <div className="flex items-center gap-2">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <UserCircle className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    {selectedUsers.some((u) => u.id === user.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating group..." : "Create Group"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddGroupPage;
