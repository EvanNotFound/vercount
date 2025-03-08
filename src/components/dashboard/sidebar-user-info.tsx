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
      <div className="p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full focus:outline-none">
        <div className="p-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={session?.user?.image || ""} alt="User" />
            <AvatarFallback className="text-xs">
              {session?.user?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium truncate max-w-[140px]">{session?.user?.name}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{session?.user?.email}</span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium truncate">{session?.user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-sm py-1.5">
          <User className="mr-2 h-3.5 w-3.5" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer text-sm py-1.5">
          <Settings className="mr-2 h-3.5 w-3.5" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-sm py-1.5 text-red-500 focus:text-red-500" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Log out</span>
        </DropdownMenuItem>
        <div className="flex items-center justify-center px-2 py-2 text-xs text-muted-foreground/70 border-t mt-1">
          <span>© {new Date().getFullYear()} Vercount</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}