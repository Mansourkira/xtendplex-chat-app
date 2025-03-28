import PermissionDenied from "@/components/auth/PermissionDenied";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services";
import { ArrowLeft, Check, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const EditUserPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (id) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      const userData = await UserService.getUserById(id!);
      setUsername(userData.username);
      setEmail(userData.email);
      setRole(userData.role || "user");
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to load user data");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setError("You don't have permission to edit users");
      return;
    }

    if (!username || !email) {
      setError("Username and email are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await UserService.updateUser(id!, {
        username,
        email,
        role,
      });

      setSuccess("User updated successfully!");
      toast({
        title: "Success",
        description: "User updated successfully!",
        variant: "default",
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/users");
      }, 2000);
    } catch (err: any) {
      console.error("Error updating user:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to update user. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not an admin, show permission denied
  if (!isAdmin) {
    return (
      <PermissionDenied
        message="You don't have permission to edit users."
        backUrl="/users"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2"
                onClick={() => navigate("/users")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
              <CardTitle className="text-2xl font-bold">Edit User</CardTitle>
              <CardDescription>
                Update user account information and permissions
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Regular User</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins have full access to all features and user management.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating user..." : "Update User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditUserPage;
