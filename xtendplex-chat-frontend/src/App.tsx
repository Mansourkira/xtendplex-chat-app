import {
  Navigate,
  Outlet,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { Toaster } from "./components/ui/toaster";
import DashboardPage from "./pages/dashboard";
import UserManagementPage from "./pages/users";
import AddUserPage from "./pages/users/add";

// Import ChatComponent
import { ChatComponent } from "./components/chat-component";
import GroupManagementPage from "./pages/groups";
import AddGroupPage from "./pages/groups/add";
import ProfilePage from "./pages/profile";
import EditUserPage from "./pages/users/edit";
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes - All inside Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage>
                  <Outlet />
                </DashboardPage>
              </ProtectedRoute>
            }
          >
            {/* Nested routes inside dashboard */}
            <Route path="users" element={<UserManagementPage />} />
            <Route path="users/add" element={<AddUserPage />} />
            <Route path="users/edit/:id" element={<EditUserPage />} />

            {/* Chat routes */}
            <Route path="chat" element={<ChatComponent />} />
            <Route path="chat/individual/:id" element={<ChatComponent />} />
            <Route path="chat/group/:id" element={<ChatComponent />} />
            <Route
              path="chat/settings"
              element={<div className="h-full">Chat Settings</div>}
            />

            {/* Group routes */}
            <Route path="groups" element={<GroupManagementPage />} />
            <Route path="groups/add" element={<AddGroupPage />} />
            <Route path="groups/edit/:id" element={<AddGroupPage />} />
            <Route path="groups/:id" element={<GroupManagementPage />} />

            {/* Profile route */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
