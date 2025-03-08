import { LucideIcon } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbLink,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

export default function DashboardHeader({
	items,
}: {
	items: { label: string; href?: string; icon?: LucideIcon; }[];
}) {
	return (
		<div className="border-b">
			<div className="flex h-12 items-center px-4 lg:px-8">
				<Breadcrumb>
					<BreadcrumbList>
						{items.map((item, index) => (
							<React.Fragment key={index}>
								<BreadcrumbItem>
									{index === items.length - 1 ? (
										<BreadcrumbPage className="flex items-center gap-1.5 text-sm">
											{item.icon && <item.icon className="h-3.5 w-3.5" />}
											<span>{item.label}</span>
										</BreadcrumbPage>
									) : (
										<BreadcrumbLink href={item.href || "#"} className="flex items-center gap-1.5 text-sm">
											{item.icon && <item.icon className="h-3.5 w-3.5" />}
											<span>{item.label}</span>
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
								{index < items.length - 1 && <BreadcrumbSeparator />}
							</React.Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</div>
	);
}
