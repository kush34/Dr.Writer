import React from "react";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "../components/App-sidebar";
import { Toaster } from "@/components/ui/toaster"

const Layout = ({ children }) => {
  return (
    <div className="flex">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 p-4 bg-gray-100">
          <SidebarTrigger />
          {children}
        </main>
        <Toaster />
      </SidebarProvider>
    </div>

  );
};

export default Layout;
