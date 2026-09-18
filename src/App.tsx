import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Edit from "./pages/Edit";
import Play from "./pages/Play";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/edit/:id" element={<Edit />} />
        <Route path="/play/:id" element={<Play />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
