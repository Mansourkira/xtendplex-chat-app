import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogOut, MessageCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Xtendplex Chat
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.username || "User"}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col w-full h-full">
          {/* Chat container */}
          <Card className="flex-1 overflow-hidden flex flex-col mb-4">
            {/* Chat messages area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-center py-10">
                <p className="text-gray-500 text-sm">
                  No messages yet. Start chatting!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Message input */}
          <div className="flex gap-2">
            <Input className="flex-1" placeholder="Type your message here..." />
            <Button>Send</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
