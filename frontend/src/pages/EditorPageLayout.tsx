import React, { ReactNode, useContext } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GeminiChatBar } from "@/components/GeminiChatBar";
import './printer.css'
import { ThemeContext } from "@/context/ThemeContext";
import { useParams } from "react-router-dom";
const Layout = ({ children }:{children:ReactNode}) => {
  const { id } = useParams();
  return (
    <div className={`flex min-h-screen`}>
      <SidebarProvider>
        <GeminiChatBar
          className="geminichatbar flex-shrink-0"
          documentId={id}
        />
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
