import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from "react-dom/client";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router";
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserContextProvider } from './context/UserContext';

// Lazy imports
const App = lazy(() => import('./App'));
const Home = lazy(() => import('./pages/Home'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const Landing = lazy(() => import('@/pages/Landing'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ThemedRoutes() {
  return (
    <Outlet />
  );
}

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UserContextProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<App />} />
                <Route element={<ThemedRoutes />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/home/:id" element={<EditorPage />} />
                </Route>
              </Routes>
            </Suspense>
          </UserContextProvider>
        </BrowserRouter>
      </QueryClientProvider >
    </ThemeProvider>
  );
}