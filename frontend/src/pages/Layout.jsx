import React, { useContext } from "react";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "../components/App-sidebar";
import { Toaster } from "@/components/ui/toaster"
import { ThemeContext } from "@/context/ThemeContext";
const Layout = ({ children }) => {
  const {theme} = useContext(ThemeContext);
  return (
    <div className={`flex ${theme=='dark' ? "bg-zinc-900 text-white":"bg-zinc-100 text-black" }`}>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 p-4 ">
          <SidebarTrigger />
          {children}
        </main>
        <Toaster />
      </SidebarProvider>
    </div>

  );
};

export default Layout;
