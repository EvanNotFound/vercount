import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiGithub } from "@icons-pack/react-simple-icons";
import BlurFadeStagger from "./animations/blur-fade-stagger";

export default function HomeButtons() {
	return (
		<div className="flex flex-col sm:flex-row gap-4 mt-12">
			<BlurFadeStagger initialDelay={0.55} delayStep={0.04}>
				<Button
					size="lg"
					className="rounded-full bg-white text-black hover:bg-white/90 pl-8 pr-6 py-6 group"
					asChild
				>
					<Link href="#usage">
						Get Started{" "}
						<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
					</Link>
				</Button>
				<Button
					size="lg"
					variant="outline"
					className="rounded-full border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white px-8 py-6"
					asChild
				>
					<Link href="https://github.com/EvanNotFound/vercount" target="_blank">
						<SiGithub className="mr-2 h-4 w-4" /> GitHub
					</Link>
				</Button>
			</BlurFadeStagger>
		</div>
	);
}
