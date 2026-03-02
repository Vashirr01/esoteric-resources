import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Feed from "./pages/Feed";

export default function App() {
  return (
    <div className="container">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
        </Routes>
      </main>
    </div>
  );
}
