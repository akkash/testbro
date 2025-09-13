/**
 * Data Table Component
 * Advanced data table with sorting, filtering, pagination, and row actions
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn, getStateClasses } from '@/lib/component-utils';

// =============================================================================
// Data Table Types
// =============================================================================

export interface DataTableColumn<T = any> {
  /**
   * Unique column key
   */
  key: string;
  /**
   * Column header label
   */
  title: string;
  /**
   * Data key to access value from row data
   */
  dataKey?: keyof T;
  /**
   * Custom render function for cell content
   */
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /**
   * Column width
   */
  width?: number | string;
  /**
   * Whether column is sortable
   */
  sortable?: boolean;
  /**
   * Whether column is filterable
   */
  filterable?: boolean;
  /**
   * Filter type
   */
  filterType?: 'text' | 'select' | 'date' | 'number';
  /**
   * Filter options for select type
   */
  filterOptions?: Array<{ label: string; value: string | number }>;
  /**
   * Column alignment
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Whether column is fixed
   */
  fixed?: 'left' | 'right';
  /**
   * Whether column can be hidden
   */
  hideable?: boolean;
  /**
   * Whether column is initially hidden
   */
  hidden?: boolean;
  /**
   * Column CSS class
   */
  className?: string;
  /**
   * Header CSS class
   */
  headerClassName?: string;
}

export interface DataTableProps<T = any> extends VariantProps<typeof dataTableVariants> {
  /**
   * Table data
   */
  data: T[];
  /**
   * Column definitions
   */
  columns: DataTableColumn<T>[];
  /**
   * Whether data is loading
   */
  loading?: boolean;
  /**
   * Loading message
   */
  loadingMessage?: string;
  /**
   * Empty state message
   */
  emptyMessage?: string;
  /**
   * Whether to show row selection
   */
  rowSelection?: boolean;
  /**
   * Selected row keys
   */
  selectedRowKeys?: (string | number)[];
  /**
   * Row selection change handler
   */
  onSelectionChange?: (selectedKeys: (string | number)[], selectedRows: T[]) => void;
  /**
   * Row key accessor
   */
  rowKey?: keyof T | ((record: T) => string | number);
  /**
   * Row click handler
   */
  onRowClick?: (record: T, index: number) => void;
  /**
   * Row actions
   */
  rowActions?: (record: T, index: number) => React.ReactNode;
  /**
   * Whether to show pagination
   */
  pagination?: boolean;
  /**
   * Current page (1-based)
   */
  currentPage?: number;
  /**
   * Total number of items
   */
  totalItems?: number;
  /**
   * Items per page
   */
  pageSize?: number;
  /**
   * Page size options
   */
  pageSizeOptions?: number[];
  /**
   * Page change handler
   */
  onPageChange?: (page: number, pageSize: number) => void;
  /**
   * Whether to show search
   */
  searchable?: boolean;
  /**
   * Search placeholder
   */
  searchPlaceholder?: string;
  /**
   * Search value
   */
  searchValue?: string;
  /**
   * Search change handler
   */
  onSearchChange?: (value: string) => void;
  /**
   * Whether to show column filters
   */
  filterable?: boolean;
  /**
   * Filter values
   */
  filters?: Record<string, any>;
  /**
   * Filter change handler
   */
  onFilterChange?: (filters: Record<string, any>) => void;
  /**
   * Sort configuration
   */
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  /**
   * Sort change handler
   */
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  /**
   * Whether to show column visibility controls
   */
  columnVisibility?: boolean;
  /**
   * Hidden columns
   */
  hiddenColumns?: string[];
  /**
   * Column visibility change handler
   */
  onColumnVisibilityChange?: (hiddenColumns: string[]) => void;
  /**
   * Additional CSS class
   */
  className?: string;
  /**
   * Table container CSS class
   */
  containerClassName?: string;
}

// =============================================================================
// Data Table Variants
// =============================================================================

const dataTableVariants = cva('w-full', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
    density: {
      compact: '[&_td]:py-2 [&_th]:py-2',
      normal: '[&_td]:py-3 [&_th]:py-3',
      comfortable: '[&_td]:py-4 [&_th]:py-4',
    },
  },
  defaultVariants: {
    size: 'md',
    density: 'normal',
  },
});

// =============================================================================
// Data Table Component
// =============================================================================

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  loadingMessage = 'Loading...',
  emptyMessage = 'No data available',
  rowSelection = false,
  selectedRowKeys = [],
  onSelectionChange,
  rowKey = 'id',
  onRowClick,
  rowActions,
  pagination = true,
  currentPage = 1,
  totalItems,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filterable = true,
  filters = {},
  onFilterChange,
  sort,
  onSortChange,
  columnVisibility = true,
  hiddenColumns = [],
  onColumnVisibilityChange,
  size,
  density,
  className,
  containerClassName,
}: DataTableProps<T>) {
  // Get row key
  const getRowKey = React.useCallback((record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return (record as any)[rowKey] ?? index;
  }, [rowKey]);

  // Visible columns
  const visibleColumns = React.useMemo(() => {
    return columns.filter(col => !hiddenColumns.includes(col.key));
  }, [columns, hiddenColumns]);

  // Handle sort
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;

    const currentDirection = sort?.column === column.key ? sort.direction : null;
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column.key, newDirection);
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allKeys = data.map((record, index) => getRowKey(record, index));
      onSelectionChange(allKeys, data);
    } else {
      onSelectionChange([], []);
    }
  };

  const handleSelectRow = (record: T, index: number, checked: boolean) => {
    if (!onSelectionChange) return;

    const recordKey = getRowKey(record, index);
    let newSelectedKeys = [...selectedRowKeys];
    let newSelectedRows = data.filter((row, idx) => 
      selectedRowKeys.includes(getRowKey(row, idx))
    );

    if (checked) {
      if (!newSelectedKeys.includes(recordKey)) {
        newSelectedKeys.push(recordKey);
        newSelectedRows.push(record);
      }
    } else {
      newSelectedKeys = newSelectedKeys.filter(key => key !== recordKey);
      newSelectedRows = newSelectedRows.filter(row => 
        getRowKey(row, data.indexOf(row)) !== recordKey
      );
    }

    onSelectionChange(newSelectedKeys, newSelectedRows);
  };

  // Calculate pagination
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : Math.ceil(data.length / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || data.length);

  // All selected state
  const isAllSelected = data.length > 0 && selectedRowKeys.length === data.length;
  const isIndeterminate = selectedRowKeys.length > 0 && selectedRowKeys.length < data.length;

  return (
    <div className={cn('space-y-4', containerClassName)}>
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          {/* Search */}
          {searchable && onSearchChange && (
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Filter Controls */}
          {filterable && onFilterChange && (
            <div className="flex gap-2">
              {columns
                .filter(col => col.filterable && col.filterType === 'select' && col.filterOptions)
                .map(col => (
                  <Select
                    key={col.key}
                    value={filters[col.key] || ''}
                    onValueChange={(value) => 
                      onFilterChange({ ...filters, [col.key]: value || undefined })
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={`Filter ${col.title}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All {col.title}</SelectItem>
                      {col.filterOptions!.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
            </div>
          )}
        </div>

        {/* Column Visibility */}
        {columnVisibility && onColumnVisibilityChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FunnelIcon className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {columns
                .filter(col => col.hideable !== false)
                .map(col => (
                  <DropdownMenuItem
                    key={col.key}
                    onClick={() => {
                      const newHiddenColumns = hiddenColumns.includes(col.key)
                        ? hiddenColumns.filter(key => key !== col.key)
                        : [...hiddenColumns, col.key];
                      onColumnVisibilityChange(newHiddenColumns);
                    }}
                  >
                    <Checkbox
                      checked={!hiddenColumns.includes(col.key)}
                      className="mr-2"
                    />
                    {col.title}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table className={cn(dataTableVariants({ size, density }), className)}>
          <TableHeader>
            <TableRow>
              {/* Selection Header */}
              {rowSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}

              {/* Column Headers */}
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.headerClassName,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:bg-muted/50',
                    column.width && `w-[${column.width}]`
                  )}
                  onClick={() => handleSort(column)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        {sort?.column === column.key ? (
                          sort.direction === 'asc' ? (
                            <ChevronUpIcon className="h-3 w-3" />
                          ) : (
                            <ChevronDownIcon className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowsUpDownIcon className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}

              {/* Actions Header */}
              {rowActions && (
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length + (rowSelection ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="text-center py-12"
                >
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-muted-foreground">{loadingMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length + (rowSelection ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="text-center py-12"
                >
                  <span className="text-muted-foreground">{emptyMessage}</span>
                </TableCell>
              </TableRow>
            ) : (
              data.map((record, index) => {
                const recordKey = getRowKey(record, index);
                const isSelected = selectedRowKeys.includes(recordKey);

                return (
                  <TableRow
                    key={recordKey}
                    className={cn(
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                      isSelected && 'bg-muted/30'
                    )}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {/* Selection Cell */}
                    {rowSelection && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            handleSelectRow(record, index, Boolean(checked))
                          }
                          aria-label={`Select row ${index + 1}`}
                        />
                      </TableCell>
                    )}

                    {/* Data Cells */}
                    {visibleColumns.map((column) => {
                      const value = column.dataKey ? (record as any)[column.dataKey] : record;
                      const content = column.render ? column.render(value, record, index) : value;

                      return (
                        <TableCell
                          key={column.key}
                          className={cn(
                            column.className,
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {content}
                        </TableCell>
                      );
                    })}

                    {/* Actions Cell */}
                    {rowActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {rowActions(record, index)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {totalItems || data.length} results
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => onPageChange(1, Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(size => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1, pageSize)}
                disabled={currentPage <= 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1, pageSize)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Action Dropdown Helper
// =============================================================================

export interface DataTableActionProps {
  actions: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
  }>;
}

export function DataTableActions({ actions }: DataTableActionProps) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <EllipsisHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, index) => (
          <React.Fragment key={action.key}>
            <DropdownMenuItem
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(action.destructive && 'text-destructive focus:text-destructive')}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
            {action.destructive && index < actions.length - 1 && (
              <DropdownMenuSeparator />
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type {
  DataTableColumn,
  DataTableProps,
  DataTableActionProps,
};
