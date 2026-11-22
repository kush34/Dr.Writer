import { Toaster } from "@/components/ui/sonner"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { useSidebarSide } from "@/config/sidebar-side"
import { AppSidebar } from "@/components/App-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
    const side = useSidebarSide()
    return (
        <SidebarProvider className={side === "right" ? "flex-row-reverse" : undefined}>
            <Toaster />
            <AppSidebar side={side} />
            <main className="w-full mx-auto">
                <div className={side === "right" ? "flex justify-end" : undefined}><SidebarTrigger /></div>
                {children}
            </main>
        </SidebarProvider>
    )
}