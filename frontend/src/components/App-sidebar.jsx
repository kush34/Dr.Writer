import {
  Calendar,
  ChevronUp,
  Home,
  Inbox,
  Search,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { signOutUser } from "../firebaseAuth/firebaseConfig";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
} from "@radix-ui/react-dropdown-menu";

import ThemeToggleBtn from './ThemeToggleBtn'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

import { useContext, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import { ThemeContext } from "@/context/ThemeContext";
import { Router, useNavigate } from "react-router-dom";
// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  // {
  //   title: "Inbox",
  //   url: "#",
  //   icon: Inbox,
  // },
  // {
  //   title: "Calendar",
  //   url: "#",
  //   icon: Calendar,
  // },
  // {
  //   title: "Search",
  //   url: "#",
  //   icon: Search,
  // },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar() {
  const themeCtx = useContext(ThemeContext);
  if (!themeCtx) {
    throw new Error("ThemeContext.Provider is missing");
  }
  const { theme } = themeCtx;
  const userCtx = useContext(UserContext);
  if (!userCtx) {
    throw new Error("UserContext.Provider is missing");
  }
  const { user, loading } = userCtx;
  const navigate = useNavigate();
  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;
  // console.log(user.photoURL)
  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/login')
    } catch (error) {

    }
  }
  return (
    <Sidebar className={`${theme === 'dark' ? "bg-zinc-950" : ""} !border-none`}>
      <SidebarContent className={`${theme === 'dark' ? "bg-zinc-950 text-white" : ""} !border-none`}>
        <SidebarGroup>
          <SidebarGroupLabel>Dr. Writer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`${theme === "dark" ? "bg-zinc-950" : ""} !border-none overflow-visible`}>
        <SidebarContent className="!p-2 !bg-transparent">
          <SidebarGroupContent className="p-0">
            <ThemeToggleBtn />
          </SidebarGroupContent>
        </SidebarContent>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full flex items-center gap-3 px-2 py-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={user.photoURL || "https://github.com/shadcn.png"}
                      className="w-8 h-8 object-cover rounded-full"
                    />
                    <AvatarFallback className="w-8 h-8">CN</AvatarFallback>
                  </Avatar>

                  <span className="truncate">{user.email}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent
                  side="top"
                  align="end"
                  sideOffset={8}
                  className={`${theme === "dark" ? "bg-zinc-950 text-white" : "bg-white text-black"} z-50 rounded-md shadow-lg w-56`}
                >
                  <DropdownMenuItem>
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span onClick={() => handleSignOut()}>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
