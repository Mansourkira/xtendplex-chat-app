import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PermissionDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Permission Denied</h2>
        <p className="text-muted-foreground mb-6">
          You don't have sufficient permissions to access this area. Please
          contact an administrator if you need access.
        </p>
        <Button
          variant="default"
          className="gap-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};
