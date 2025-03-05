import Link from "next/link";
import { SiGithub } from "@icons-pack/react-simple-icons";

export default function Footer() {
	return (
		<footer className="w-full border-t border-white/10 py-4 md:py-6">
			<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center justify-center gap-4 md:flex-row md:justify-between">
					<div className="flex flex-col items-center md:items-start justify-center gap-1">
						<p className="text-center md:text-left text-xs md:text-sm text-zinc-500">
							{new Date().getFullYear()} © EvanNotFound. All Rights Reserved.
						</p>
						<p className="text-center md:text-left text-xs md:text-sm text-zinc-500">
							An{" "}
							<Link
								href="https://evannotfound.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-white/80 hover:text-white transition-colors underline underline-offset-4 decoration-white/30"
							>
								evannotfound
							</Link>{" "}
							production.
						</p>
					</div>

					<div className="flex items-center gap-4 mt-2 md:mt-0">
						<Link
							href="https://github.com/EvanNotFound/vercount"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-medium text-zinc-500 hover:text-white transition-colors"
						>
							<SiGithub className="h-5 w-5 md:h-6 md:w-6" />
							<span className="sr-only">GitHub</span>
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
