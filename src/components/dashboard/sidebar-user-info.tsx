import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Settings, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SidebarUserInfo() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const handleSignOut = () => {
    toast.promise(signOut(), {
      loading: "Signing out...",
      success: "Signed out successfully",
      error: "Failed to sign out",
    });
  };
  
  if (isLoading) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex flex-col items-start">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-2 py-2">
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full focus:outline-none">
        <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || ""} alt="User" />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                {session?.user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="font-medium">{session?.user?.name}</span>
              <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium">{session?.user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
        <div className="flex items-center justify-center px-4 py-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Vercount</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
}