import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PermissionDeniedProps {
  message?: string;
  backUrl?: string;
}

const PermissionDenied = ({
  message = "You don't have permission to access this page.",
  backUrl = "/",
}: PermissionDeniedProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full">
      <Alert variant="destructive" className="max-w-md">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Access Denied</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{message}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(backUrl)}
          >
            Go Back
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PermissionDenied;
