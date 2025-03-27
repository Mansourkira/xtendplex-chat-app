import { Button } from "@/components/ui/button";
import { MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";
export function ChatWelcome() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">Welcome to Chat</h1>
        <p className="text-muted-foreground">
          Select a conversation from the sidebar or start a new one
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/chat/individual/1">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
            >
              <MessageSquare className="h-6 w-6" />
              <span>Individual Chat</span>
            </Button>
          </Link>
          <Link to="/chat/group/1">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
            >
              <Users className="h-6 w-6" />
              <span>Group Chat</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
