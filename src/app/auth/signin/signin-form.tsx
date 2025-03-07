"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { SiGithub } from "@icons-pack/react-simple-icons";

export default function SignInForm() {
  return (
    <Button
    onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
    variant="outline"
    className="w-full rounded-full border border-white/20 bg-black/50 backdrop-blur-sm text-white 
    hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-200
    h-12 px-6 text-base font-medium hover:scale-[1.02] active:scale-[0.98]"
>
    <SiGithub className="mr-2.5 h-5 w-5" />
    Sign in with GitHub
</Button>
  );
}