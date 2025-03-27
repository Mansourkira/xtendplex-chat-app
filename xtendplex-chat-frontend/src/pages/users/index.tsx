import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import UserService, { User } from "@/services/UserService";
import {
  MoreVertical,
  RefreshCw,
  Search,
  Trash,
  UserCircle,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  console.log(user);
  // Check if current user is admin
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Fetch users regardless of role (all authenticated users can view)
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await UserService.getUsers(1, 100); // Get up to 100 users
      setUsers(response.users);
      setFilteredUsers(response.users);
    } catch (err) {
      setError("Failed to load users. Please try again.");
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters whenever search/status/role filters change
  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter) {
      result = result.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, statusFilter, roleFilter]);

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    switch (status) {
      case "online":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
        );
      case "away":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Away</Badge>;
      case "offline":
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return <Badge variant="outline">User</Badge>;

    switch (role) {
      case "admin":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700">Admin</Badge>
        );
      case "user":
        return <Badge variant="outline">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
    setRoleFilter(null);
  };

  return (
    <div className="h-full overflow-auto">
      {!isAdmin && (
        <Alert className="mb-4">
          <AlertTitle className="flex items-center">
            <UserCircle className="mr-2 h-4 w-4" />
            View Only Mode
          </AlertTitle>
          <AlertDescription>
            You are viewing this page in read-only mode. Contact an
            administrator if you need access to add, edit, or delete users.
          </AlertDescription>
        </Alert>
      )}
      <Card className="h-full border-none shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                User Management
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Manage user accounts, roles and permissions"
                  : "View user accounts and status"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                className="flex items-center gap-2"
                onClick={() => navigate("/users/add")}
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by username or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? null : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="away">Away</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            {/* Role Filter - Only visible to admins */}
            {isAdmin && (
              <Select
                value={roleFilter || "all"}
                onValueChange={(value) =>
                  setRoleFilter(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchUsers}
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>

              {(searchQuery || statusFilter || roleFilter) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  title="Clear filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableCaption>
                {filteredUsers.length === 0
                  ? "No users found"
                  : `Showing ${filteredUsers.length} of ${users.length} users`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                        <span className="text-muted-foreground">
                          Loading users...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center">
                        <UserCircle className="h-12 w-12 text-muted-foreground mb-2" />
                        <span className="text-muted-foreground">
                          No users found
                        </span>
                        {(searchQuery || statusFilter || roleFilter) && (
                          <Button
                            variant="link"
                            onClick={clearFilters}
                            className="mt-2"
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
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
                          <span>{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/users/${user.id}`)}
                            >
                              <UserCircle className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/users/edit/${user.id}`)
                                  }
                                >
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    // Would implement delete functionality here
                                    alert(
                                      "Delete user functionality would go here"
                                    );
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;
