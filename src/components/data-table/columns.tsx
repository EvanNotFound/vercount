"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageViewData, CounterTableMeta } from "@/types/domain"
import { safeDecodeURIComponent } from "@/utils/url"

// Declare module augmentation for TableMeta
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends unknown> {
    handlePageViewChange?: (path: string, value: number) => void;
    handleUpdatePageView?: (path: string) => Promise<void>;
    handleDeleteMonitoredPage?: (path: string) => Promise<void>;
  }
}

export const columns: ColumnDef<PageViewData>[] = [
  {
    accessorKey: "path",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Path
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const path = row.getValue("path") as string
      return <div className="font-medium">{safeDecodeURIComponent(path)}</div>
    },
  },
  {
    accessorKey: "views",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Views
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row, table }) => {
      const views = row.getValue("views") as number
      const path = row.getValue("path") as string
      
      // Access the meta data from the table
      const { handlePageViewChange } = table.options.meta || {}
      
      return (
        <Input
          type="number"
          value={views}
          onChange={(e) => {
            if (handlePageViewChange) {
              handlePageViewChange(path, parseInt(e.target.value) || 0)
            }
          }}
          className="w-24"
        />
      )
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const path = row.getValue("path") as string
      
      // Access the meta data from the table
      const { handleUpdatePageView, handleDeleteMonitoredPage } = table.options.meta || {}
      
      return (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (handleUpdatePageView) {
                handleUpdatePageView(path)
              }
            }}
          >
            Update
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => {
              if (handleDeleteMonitoredPage) {
                handleDeleteMonitoredPage(path)
              }
            }}
          >
            Delete
          </Button>
        </div>
      )
    },
  },
] 