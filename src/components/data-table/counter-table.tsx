"use client";

import { DataTable } from "./data-table";
import { columns } from "./columns";
import { PageViewData, CounterTableMeta } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CounterTableProps {
	data: PageViewData[];
	handlePageViewChange: (path: string, value: number) => void;
	handleUpdatePageView: (path: string) => Promise<void>;
	handleDeleteMonitoredPage: (path: string) => Promise<void>;
}

export function CounterTable({
	data,
	handlePageViewChange,
	handleUpdatePageView,
	handleDeleteMonitoredPage,
}: CounterTableProps) {
	// Create meta object with proper typing
	const tableMeta: CounterTableMeta = {
		handlePageViewChange,
		handleUpdatePageView,
		handleDeleteMonitoredPage,
	};

	return (
		<DataTable
			columns={columns}
			data={data}
			searchKey="path"
			meta={tableMeta}
		/>
	);
}
