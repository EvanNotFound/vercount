import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	ArrowRight,
	Zap,
	Globe,
	Shield,
	RefreshCw,
	Code,
	Database,
} from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import PageView from "@/components/pageview";
import HomeButtons from "@/components/home-buttons";
import Header from "@/components/header";
import Usage from "@/components/usage";
import Features from "@/components/features";
import OpenSource from "@/components/open-source";
import Sponsorship from "@/components/sponsorship";
import Footer from "@/components/footer";
import BlurFadeStagger from "@/components/animations/blur-fade-stagger";

export default function Home() {
	return (
		<>
			<Header />
			<main className="mt-8 flex min-h-screen flex-col bg-black text-white">
				{/* Hero Section */}
				<section className="w-full py-20 md:py-32 lg:py-40 border-b border-white/10 relative overflow-hidden">
					{/* Blur blobs */}
					<div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] opacity-50" />
					<div className="absolute top-24 left-1/3 -translate-x-1/2 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] opacity-40" />
					<div className="absolute top-16 left-2/3 -translate-x-1/2 w-72 h-72 bg-indigo-500/15 rounded-full blur-[110px] opacity-50" />

					<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
						<div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
							<div className="space-y-4">
								<BlurFadeStagger initialDelay={0.05} delayStep={0.1}>
									<h1 className="text-4xl md:text-8xl font-bold tracking-tighter">
										Vercount
									</h1>
									<p className="text-xl md:text-2xl text-zinc-400 max-w-[700px]">
										Straightforward, Fast, and Reliable Website Counter.
									</p>
									<p className="text-lg text-zinc-500 leading-normal">
										网站流量计数器，简单、快速、可靠
										<br />
										不蒜子计数器完美替代方案
									</p>
								</BlurFadeStagger>
							</div>

							<PageView />

							<HomeButtons />
						</div>
					</div>
				</section>

				<Usage />
				<Features />
				<Sponsorship />
				<OpenSource />
			</main>
			<Footer />
		</>
	);
}
