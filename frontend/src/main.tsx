import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from "react-dom/client";
import { lazy, Suspense } from "react";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet } from "react-router";
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserContextProvider } from './context/UserContext';
import { CommandSearch } from './components/CommandSearch';
import { Analytics } from "@vercel/analytics/react";
import { PageSkeleton } from './components/PageSkeleton';
import { AppErrorBoundary, ErrorPage, RouteError } from './components/ErrorPage';

// Lazy imports
const App = lazy(() => import('./App'));
const Settings = lazy(() => import('./pages/Settings'));
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
    <><CommandSearch /><Outlet /></>
  );
}

const root = document.getElementById("root");
const router = createBrowserRouter(createRoutesFromElements(
  <Route errorElement={<RouteError />}>
  <Route element={<UserContextProvider><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></UserContextProvider>}>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<App />} />
    <Route element={<ThemedRoutes />}>
      <Route path="/home" element={<Home />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/home/:id" element={<EditorPage />} />
    </Route>
  </Route>
  <Route path="*" element={<ErrorPage notFound />} />
  </Route>
));

if (root) {
  ReactDOM.createRoot(root).render(
    <AppErrorBoundary>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Analytics beforeSend={(event) => {
              const url = new URL(event.url);
              if (!['/', '/login', '/home', '/settings'].includes(url.pathname)) return null;
              const source = url.searchParams.get('utm_source');
              url.search = '';
              if (source === 'chatgpt.com') url.searchParams.set('utm_source', source);
              url.hash = '';
              return { ...event, url: url.toString() };
            }} />
      </QueryClientProvider >
    </ThemeProvider>
    </AppErrorBoundary>
  );
}
