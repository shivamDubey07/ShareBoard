import { Routes, Route } from "react-router-dom";

import Board from "./pages/Board";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/:slug" element={<Board />} />
        </Routes>
    );
}