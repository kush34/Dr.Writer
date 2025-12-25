import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from "react-dom/client";
import App from './App.jsx'
import { BrowserRouter, Routes, Route, Outlet } from "react-router";
import Home from './pages/Home.jsx';
import { ThemeProvider } from './context/ThemeContext';
import EditorPage from './pages/EditorPage';
import Landing from './pages/Landing.jsx'
const root = document.getElementById("root");

function ThemedRoutes() {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<ThemedRoutes />}>
        <Route path="/login" element={<App />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home/:id" element={<EditorPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
