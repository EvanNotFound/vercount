import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiGithub } from '@icons-pack/react-simple-icons';

export default function OpenSource() {
  return (
    <section id="opensource" className="w-full py-20 md:py-32 border-t border-white/10">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-3xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Open Source</h2>
            <p className="text-xl text-zinc-400">This project falls under GPL-3.0 License.</p>
            <p className="text-lg text-zinc-500">本项目基于 GPL-3.0 协议</p>
          </div>
          <Button size="lg" className="rounded-full bg-white text-black hover:bg-white/90 px-8 py-6" asChild>
            <Link href="https://github.com/EvanNotFound/vercount" target="_blank" rel="noopener noreferrer">
              <SiGithub className="mr-2 h-5 w-5" /> Star on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
} 