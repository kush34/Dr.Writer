import React, { useContext } from "react";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { GeminiChatBar } from "../components/GeminiChatBar";
import './printer.css'
import { ThemeContext } from "@/context/ThemeContext";
import { useParams } from "react-router-dom";
const Layout = ({ children }) => {
  const { theme } = useContext(ThemeContext);
  const { id } = useParams();
  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100"}`}>
      <SidebarProvider>
        <GeminiChatBar documentId={id} className="geminichatbar flex-shrink-0" />
        <main className="flex-1 overflow-x-auto">
          <SidebarTrigger className="trigger" />
          <div className="w-full">{children}</div>
        </main>
        <Toaster />
      </SidebarProvider>
    </div>


  );
};

export default Layout;
