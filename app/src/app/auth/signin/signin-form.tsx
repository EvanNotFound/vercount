"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { SiGithub } from "@icons-pack/react-simple-icons";

export default function SignInForm() {

  const handleSignIn = async () => {
    await authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
  };  

  return (
    <Button
      onClick={handleSignIn}
    variant="outline"
    className="w-full rounded-full border border-white/20 bg-black/50 backdrop-blur-xs text-white 
    hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-200
    h-12 px-6 text-base font-medium hover:scale-[1.02] active:scale-[0.98]"
>
    <SiGithub className="mr-2.5 h-5 w-5" />
    Sign in with GitHub
</Button>
  );
}