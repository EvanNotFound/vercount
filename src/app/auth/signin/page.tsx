import { Separator } from "@/components/ui/separator";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SignInForm from "./signin-form";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignIn() {
	const session = await getServerSession();

	if (session) {
		redirect("/dashboard");
	}

	return (
		<>
			<Header />
			<main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
				<section className="w-full py-12 md:py-16 lg:py-20 relative flex items-center justify-center">
					{/* Blur blobs */}
					<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 md:w-80 h-64 md:h-80 bg-blue-500/20 rounded-full blur-[100px] opacity-50" />
					<div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-56 md:w-72 h-56 md:h-72 bg-purple-500/20 rounded-full blur-[90px] opacity-40" />
					<div className="absolute top-1/4 left-2/3 -translate-x-1/2 w-48 md:w-64 h-48 md:h-64 bg-indigo-500/15 rounded-full blur-[80px] opacity-50" />

					<div className="container mx-auto max-w-md px-4 sm:px-6 relative z-10">
						<div className="flex flex-col items-center text-center gap-6 mx-auto">
							<div className="flex flex-col gap-3">
								<h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2">
									Sign in
								</h1>
								<div className="flex flex-col gap-1">
									<p className="text-base md:text-lg text-zinc-400">
										Access Vercount dashboard
									</p>
									<p className="text-base md:text-lg text-zinc-500">
										登录即可修改你的网站流量统计数据
									</p>
								</div>
							</div>
							<Separator className="w-[100px] my-3" />
							<SignInForm />
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</>
	);
}
