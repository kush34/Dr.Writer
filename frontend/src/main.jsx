import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from "react-dom/client";
import App from './App.jsx'
import { BrowserRouter, Routes, Route, Outlet } from "react-router";
import Home from './pages/Home.jsx';
import { ThemeProvider } from './context/ThemeContext';
import EditorPage from './pages/EditorPage';
import Landing from './pages/Landing.jsx'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserContextProvider } from './context/UserContext';

const root = document.getElementById("root");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min cache (reasonable)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ThemedRoutes() {
  return (
    <ThemeProvider>
      <UserContextProvider>
        <Outlet />
      </UserContextProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(root).render(
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);
