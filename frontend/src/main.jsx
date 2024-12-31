import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from "react-dom/client";
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from "react-router";
import Home from './pages/Home.jsx';
import { ThemeProvider } from './context/ThemeContext';
import EditorPage from './pages/EditorPage';

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <ThemeProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/home" element={<Home />} />
          <Route path="/home/:id" element={<EditorPage />} />
        </Routes>
    </ThemeProvider>

  </BrowserRouter>
);
