"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ExternalLink, RefreshCw, Trash2, MoreHorizontal, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageViewData, CounterTableMeta } from "@/types/domain"
import { safeDecodeURIComponent } from "@/utils/url"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState, useRef, useEffect } from "react"

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
          className="w-full justify-start font-semibold"
        >
          Path
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const path = row.getValue("path") as string
      const decodedPath = safeDecodeURIComponent(path)
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="font-medium max-w-[300px] truncate hover:text-blue-600 transition-colors">
                {decodedPath}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px]">
              <p className="break-words">{decodedPath}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
  {
    accessorKey: "views",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start font-semibold"
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
      
      // Create a self-contained EditableCell component to avoid focus issues
      const EditableCell = () => {
        const [localValue, setLocalValue] = useState(views.toString())
        const [hasFocus, setHasFocus] = useState(false)
        
        // Only update parent when focus is lost or Enter is pressed
        const commitChange = () => {
          if (handlePageViewChange) {
            const numValue = parseInt(localValue, 10)
            handlePageViewChange(path, isNaN(numValue) ? 0 : numValue)
          }
        }
        
        return (
          <Input
            type="number"
            value={hasFocus ? localValue : views.toString()}
            onChange={(e) => {
              setLocalValue(e.target.value)
            }}
            onFocus={() => setHasFocus(true)}
            onBlur={() => {
              setHasFocus(false)
              commitChange()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                commitChange()
                setHasFocus(false)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="w-24 text-center no-spinners"
            step="1"
            min="0"
          />
        )
      }
      
      // Return the isolated component
      return <EditableCell />
    },
  },
  {
    id: "actions",
    enableHiding: false,
    meta: {
      align: "right",
    },
    cell: ({ row, table }) => {
      const path = row.getValue("path") as string
      
      // Access the meta data from the table
      const { handleUpdatePageView, handleDeleteMonitoredPage } = table.options.meta || {}
      
      // State for alert dialog
      const [showDeleteAlert, setShowDeleteAlert] = useState(false)
      
      return (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (handleUpdatePageView) {
                    handleUpdatePageView(path)
                  }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Refresh</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.open(path, '_blank')
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                <span>View page</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Add edit functionality here
                  console.log(`Edit ${path}`)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteAlert(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Delete Alert Dialog */}
          <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the monitored page "{path}".
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (handleDeleteMonitoredPage) {
                      handleDeleteMonitoredPage(path)
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  },
] 