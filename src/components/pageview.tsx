"use client";
import { useVercount } from "vercount-react";
import BlurFadeStagger from "./animations/blur-fade-stagger";

export default function PageView() {
	const { sitePv, pagePv, siteUv } = useVercount();

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full mt-8 md:mt-12">
			<BlurFadeStagger initialDelay={0.4} delayStep={0.04}>
				<div className="flex flex-col items-center p-4 md:pl-10 md:p-6 bg-white/5 rounded-lg md:rounded-l-[100px] md:rounded-r-lg border border-white/10 backdrop-blur-sm">
					<h3 className="text-xs md:text-sm font-medium text-zinc-400">
						Page View
					</h3>
					<p className="text-2xl md:text-4xl font-mono font-bold mt-1 md:mt-2">
						{pagePv}
					</p>
				</div>
				<div className="flex flex-col items-center p-4 md:p-6 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
					<h3 className="text-xs md:text-sm font-medium text-zinc-400">
						Site Total Visits
					</h3>
					<p className="text-2xl md:text-4xl font-mono font-bold mt-1 md:mt-2">
						{sitePv}
					</p>
				</div>
				<div className="flex flex-col items-center p-4 md:pr-10 md:p-6 bg-white/5 rounded-lg md:rounded-r-[100px] md:rounded-l-lg border border-white/10 backdrop-blur-sm">
					<h3 className="text-xs md:text-sm font-medium text-zinc-400">
						Site Total Visitors
					</h3>
					<p className="text-2xl md:text-4xl font-mono font-bold mt-1 md:mt-2">
						{siteUv}
					</p>
				</div>
			</BlurFadeStagger>
		</div>
	);
}
