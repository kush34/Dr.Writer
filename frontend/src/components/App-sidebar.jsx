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
// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar() {
  const {theme} = useContext(ThemeContext);
  const { user, loading } = useContext(UserContext);
  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;
  // console.log(user.photoURL)

  return (
    <Sidebar className={`${theme=='dark' ? "bg-zinc-900":""}`}>
      <SidebarContent className={`${theme=='dark' ? "bg-zinc-900 text-white":""}`}>
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
      
      <SidebarFooter className={`${theme=='dark' ? "bg-zinc-900":""}`}>
        <SidebarContent>
          <SidebarGroupContent>
            <ThemeToggleBtn/>
          </SidebarGroupContent>
        </SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu className={`${theme=='dark' ? "bg-zinc-900":""}`}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                  <Avatar>
                    <AvatarImage src={user.photoURL || "https://github.com/shadcn.png"} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  {user.email}
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className={`${theme=='dark' ? "bg-zinc-900 text-white":""} w-[--radix-popper-anchor-width]`}
                >
                  <DropdownMenuItem>
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span onClick={signOutUser}>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
