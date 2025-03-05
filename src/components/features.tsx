import { Zap, Globe, Shield, RefreshCw, Code, Database, LucideIcon } from "lucide-react";

type FeatureItem = {
	icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
	title: string;
	description: string;
};

// Custom Vercel icon component
const VercelIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
	<svg
		className="h-5 w-5 text-blue-400"
		viewBox="0 0 76 65"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
	</svg>
);

// Features configuration
const featuresConfig: FeatureItem[] = [
	{
		icon: Zap,
		title: "高速响应",
		description: "速度快，服务器响应时间在 10ms 以内",
	},
	{
		icon: Globe,
		title: "准确统计",
		description: "使用 POST 请求进行统计，不再使用不蒜子的过时 Referrer 方法，实现移动端 / Firefox / Safari 等浏览器的准确统计",
	},
	{
		icon: Shield,
		title: "安全可靠",
		description: "使用 Json 回调，不再使用不蒜子的 JSONP 回调方法，防止 CSRF 攻击",
	},
	{
		icon: RefreshCw,
		title: "自动同步",
		description: "初始化自动同步所有不蒜子的数据，无需手动操作，每访问一次，数据就会自动同步",
	},
	{
		icon: Code,
		title: "兼容性好",
		description: "兼容不蒜子的 span 标签，可以无缝切换",
	},
	{
		icon: Database,
		title: "数据可靠",
		description: "使用 Upstash Redis 作为数据存储，数据不会丢失，保证 99.99% 可用性",
	},
	{
		icon: VercelIcon,
		title: "Vercel 驱动",
		description: "使用 Vercel Serverless Functions 作为后端，保证 99.99% 可用性",
	},
	{
		icon: Globe,
		title: "全球加速",
		description: "可选使用中国加速版本（国内访问优化），或者使用 Vercel 全球 CDN，保证 99.99% 可用性",
	},
];

export default function Features() {
	return (
		<section id="features" className="w-full py-20 md:py-32 border-b border-white/10">
			<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center justify-center space-y-4 text-center mb-16 max-w-3xl mx-auto">
					<h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Features</h2>
					<p className="text-xl text-zinc-400">Vercount 是一个完美的不蒜子计数替代方案</p>
				</div>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
					{featuresConfig.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<div key={index} className="flex flex-col space-y-3 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
									<Icon className="h-5 w-5 text-zinc-400" />
								</div>
								<h3 className="text-lg font-bold">{feature.title}</h3>
								<p className="text-zinc-400 text-sm">{feature.description}</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}