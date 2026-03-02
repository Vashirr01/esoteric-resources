import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Feed from "./pages/Feed";
import BoardView from "./pages/BoardView";
import MyBoards from "./pages/MyBoards";
import AddResource from "./pages/AddResource";
import Login from "./pages/Login";

export default function App() {
  return (
    <div className="container">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/board/:id" element={<BoardView />} />
          <Route path="/my/boards" element={<MyBoards />} />
          <Route path="/my/boards/:id/add" element={<AddResource />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}
