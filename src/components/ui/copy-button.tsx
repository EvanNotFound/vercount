"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  code: string;
  className?: string;
}

export function CopyButton({ code, className = "" }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      toast.success("Copied to clipboard", {
        description: "Code has been copied to your clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Copy failed", {
        description: "Failed to copy code to clipboard",
      });
    }
  };

  return (
    <Button
      onClick={copyToClipboard}
      className={`p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border-border border transition-colors flex items-center gap-1 ${className} z-10`}
      aria-label="Copy code"
    >
      {isCopied ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <Copy className="h-4 w-4 text-white" />
      )}
      <span className="text-xs text-white hidden sm:inline">
        {isCopied ? "Copied!" : "Copy"}
      </span>
    </Button>
  );
} 