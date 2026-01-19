import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GeminiChatBar } from "@/components/GeminiChatBar";
import './printer.css'
import { useParams } from "react-router-dom";

const Layout = ({ children }: { children: ReactNode }) => {
  const { id } = useParams();
  if (!id) return null;
  return (
    <SidebarProvider>
      <GeminiChatBar documentId={id} />
      <main className="w-full mx-auto">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
};

export default Layout;
