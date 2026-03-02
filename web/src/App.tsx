import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Feed from "./pages/Feed";
import BoardView from "./pages/BoardView";
import MyBoards from "./pages/MyBoards";

export default function App() {
  return (
    <div className="container">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/board/:id" element={<BoardView />} />
          <Route path="/my/boards" element={<MyBoards />} />
        </Routes>
      </main>
    </div>
  );
}
