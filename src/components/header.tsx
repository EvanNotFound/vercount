import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiGithub } from "@icons-pack/react-simple-icons";

export default function Header() {
	return (
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-bold tracking-tighter">Vercount</Link>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#usage"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Usage
              </Link>
              <Link href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#opensource" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Open Source
              </Link>
              <Link href="#sponsorship" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Sponsorship
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white py-4"
                asChild
              >
                <Link href="https://github.com/EvanNotFound/vercount" target="_blank" rel="noopener noreferrer">
                  <SiGithub className="h-4 w-4 mr-1" />
                  GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
	);
}