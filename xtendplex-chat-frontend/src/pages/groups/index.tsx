import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { GroupService } from "@/services";
import { Group } from "@/services/GroupService";
import {
  Edit2,
  MoreVertical,
  RefreshCw,
  Search,
  Trash,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const GroupManagementPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchGroups();
  }, [isAdmin]);

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = isAdmin
        ? await GroupService.getGroups()
        : await GroupService.getPublicGroups();
      setGroups(response);
      setFilteredGroups(response);
    } catch (err) {
      setError("Failed to load groups. Please try again.");
      console.error("Error fetching groups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters whenever search/type filters change
  useEffect(() => {
    let result = [...groups];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (group) =>
          group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter && typeFilter !== "all") {
      result = result.filter((group) =>
        typeFilter === "direct"
          ? group.is_direct_message
          : !group.is_direct_message
      );
    }

    setFilteredGroups(result);
  }, [groups, searchQuery, typeFilter]);

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      await GroupService.deleteGroup(selectedGroup.id);
      toast.success("Group deleted successfully");
      fetchGroups();
    } catch (err) {
      toast.error("Failed to delete group");
      console.error("Error deleting group:", err);
    } finally {
      setShowDeleteDialog(false);
      setSelectedGroup(null);
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await GroupService.removeMember(groupId, userId);
      toast.success("Member removed successfully");
      // Refresh the selected group's members
      if (selectedGroup && selectedGroup.id === groupId) {
        const updatedGroup = await GroupService.getGroupById(groupId);
        setSelectedGroup(updatedGroup);
      }
      fetchGroups();
    } catch (err) {
      toast.error("Failed to remove member");
      console.error("Error removing member:", err);
    }
  };

  const renderMemberAvatars = (group: Group) => {
    const maxDisplayed = 3;
    const members = group.members || [];
    const remainingCount = members.length - maxDisplayed;

    return (
      <div className="flex -space-x-2">
        {members.slice(0, maxDisplayed).map((member) => (
          <TooltipProvider key={member.user_id}>
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="border-2 border-background w-8 h-8">
                  <AvatarImage
                    src={member.user?.avatar}
                    alt={member.user?.username}
                  />
                  <AvatarFallback>
                    {member.user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{member.user?.username}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {remainingCount > 0 && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-xs font-medium border-2 border-background">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
  };

  return (
    <div className="h-full overflow-auto p-6">
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Groups</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Manage and organize your groups"
                  : "View and join available groups"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                className="flex items-center gap-2"
                onClick={() => navigate("/groups/add")}
              >
                <UserPlus className="h-4 w-4" />
                <span>Create Group</span>
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

          <div className="flex items-center gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search groups..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter || "all"} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="group">Groups</SelectItem>
                <SelectItem value="direct">Direct Messages</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || typeFilter) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchGroups}
              className="h-10 w-10"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderMemberAvatars(group)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowMembersDialog(true);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.is_direct_message ? "Direct Message" : "Group"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {isAdmin && !group.is_direct_message && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/groups/edit/${group.id}`)
                                }
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Group
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No groups found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              Delete Group
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete {selectedGroup?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-destructive"
              onClick={handleDeleteGroup}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              Manage members of {selectedGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGroup?.members?.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.user?.avatar}
                          alt={member.user?.username}
                        />
                        <AvatarFallback>
                          {member.user?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {member.user?.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.user?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell>
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isAdmin && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleRemoveMember(selectedGroup.id, member.user_id)
                          }
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupManagementPage;
