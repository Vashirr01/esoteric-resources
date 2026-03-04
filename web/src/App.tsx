import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import Feed from "./pages/Feed";
import BoardView from "./pages/BoardView";
import MyBoards from "./pages/MyBoards";
import AddResource from "./pages/AddResource";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";

export default function App() {
  return (
    <div className="container">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/board/:id" element={<BoardView />} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/my/boards" element={<ProtectedRoute><MyBoards /></ProtectedRoute>} />
          <Route path="/my/boards/:id/add" element={<ProtectedRoute><AddResource /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </main>
    </div>
  );
}
