import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { GeminiChatBar } from "../components/GeminiChatBar";
import './printer.css'

const Layout = ({ children }) => {
  return (
    <div className="flex">
      <SidebarProvider>
        <GeminiChatBar className='geminichatbar'/>
            <main className="flex-1 p-4 bg-gray-100">
              <SidebarTrigger className='trigger' />
              {children}
            </main>
            <Toaster />
      </SidebarProvider>
    </div>

  );
};

export default Layout;
