import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckSquare,
  Square,
  ChevronDown,
  Play,
  Edit,
  Trash2,
  Copy,
  Tag,
  Archive,
  Download,
  Upload,
  Filter,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TestTube,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BulkOperationItem {
  id: string;
  name: string;
  type: "test-case" | "test-suite" | "target" | "project";
  status: "active" | "inactive" | "draft" | "archived";
  tags: string[];
  lastModified: string;
  author: string;
  priority?: "low" | "medium" | "high";
  [key: string]: any; // Allow additional properties
}

interface BulkOperationsProps {
  items: BulkOperationItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkEdit: (itemIds: string[], updates: Partial<BulkOperationItem>) => void;
  onBulkDelete: (itemIds: string[]) => void;
  onBulkRun: (itemIds: string[], targetIds?: string[]) => void;
  onBulkDuplicate: (itemIds: string[]) => void;
  onBulkArchive: (itemIds: string[], archive: boolean) => void;
  onBulkExport: (itemIds: string[], format: string) => void;
  availableTargets?: { id: string; name: string }[];
  availableTags?: string[];
  className?: string;
}

interface BulkEditData {
  tags?: string[];
  status?: string;
  priority?: string;
  description?: string;
  addTags: string[];
  removeTags: string[];
}

export default function BulkOperations({
  items,
  selectedItems,
  onSelectionChange,
  onBulkEdit,
  onBulkDelete,
  onBulkRun,
  onBulkDuplicate,
  onBulkArchive,
  onBulkExport,
  availableTargets = [],
  availableTags = [],
  className,
}: BulkOperationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({
    addTags: [],
    removeTags: [],
  });
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Filter items based on search and filters
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedItems.includes(item.id));
  const isPartiallySelected = selectedItems.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredItems.map((item) => item.id));
    }
  };

  const handleItemSelect = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter((id) => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  const handleBulkEdit = () => {
    const updates: Partial<BulkOperationItem> = {};

    if (bulkEditData.status) {
      updates.status = bulkEditData.status as any;
    }

    if (bulkEditData.priority) {
      updates.priority = bulkEditData.priority as any;
    }

    // Handle tag operations
    if (bulkEditData.addTags.length > 0 || bulkEditData.removeTags.length > 0) {
      // This would be handled by the parent component to merge/remove tags
      updates.tags = [...bulkEditData.addTags]; // Simplified for demo
    }

    onBulkEdit(selectedItems, updates);
    setIsEditDialogOpen(false);
    setBulkEditData({ addTags: [], removeTags: [] });
  };

  const handleBulkRun = () => {
    onBulkRun(selectedItems, selectedTargets);
    setIsRunDialogOpen(false);
    setSelectedTargets([]);
  };

  const handleBulkDelete = () => {
    onBulkDelete(selectedItems);
    setIsDeleteDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "test-case":
        return <TestTube className="w-4 h-4" />;

      case "test-suite":
        return <FolderOpen className="w-4 h-4" />;

      case "target":
        return <Target className="w-4 h-4" />;

      case "project":
        return <FolderOpen className="w-4 h-4" />;

      default:
        return <TestTube className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="test-case">Test Cases</SelectItem>
              <SelectItem value="test-suite">Test Suites</SelectItem>
              <SelectItem value="target">Targets</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectionChange([])}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {/* Run Tests */}
              <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Play className="w-4 h-4 mr-1" />
                    Run
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Run Selected Items</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Run {selectedItems.length} selected item
                      {selectedItems.length !== 1 ? "s" : ""} on the following
                      targets:
                    </p>

                    {availableTargets.length > 0 && (
                      <div>
                        <Label>Select Targets</Label>
                        <div className="space-y-2 mt-2">
                          {availableTargets.map((target) => (
                            <div
                              key={target.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={target.id}
                                checked={selectedTargets.includes(target.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTargets([
                                      ...selectedTargets,
                                      target.id,
                                    ]);
                                  } else {
                                    setSelectedTargets(
                                      selectedTargets.filter(
                                        (id) => id !== target.id
                                      )
                                    );
                                  }
                                }}
                              />

                              <Label htmlFor={target.id} className="text-sm">
                                {target.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsRunDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleBulkRun}>Run Tests</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit */}
              <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Edit Items</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Edit {selectedItems.length} selected item
                      {selectedItems.length !== 1 ? "s" : ""}:
                    </p>

                    <div>
                      <Label>Status</Label>
                      <Select
                        value={bulkEditData.status || ""}
                        onValueChange={(value) =>
                          setBulkEditData({ ...bulkEditData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No change</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={bulkEditData.priority || ""}
                        onValueChange={(value) =>
                          setBulkEditData({ ...bulkEditData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No change</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Add Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableTags.map((tag) => (
                          <Button
                            key={tag}
                            size="sm"
                            variant={
                              bulkEditData.addTags.includes(tag)
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              if (bulkEditData.addTags.includes(tag)) {
                                setBulkEditData({
                                  ...bulkEditData,
                                  addTags: bulkEditData.addTags.filter(
                                    (t) => t !== tag
                                  ),
                                });
                              } else {
                                setBulkEditData({
                                  ...bulkEditData,
                                  addTags: [...bulkEditData.addTags, tag],
                                });
                              }
                            }}
                          >
                            <Tag className="w-3 h-3 mr-1" />

                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleBulkEdit}>Apply Changes</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onBulkDuplicate(selectedItems)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onBulkArchive(selectedItems, true)}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onBulkExport(selectedItems, "json")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onBulkExport(selectedItems, "csv")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isPartiallySelected;
              }}
              onCheckedChange={handleSelectAll}
            />

            <span className="text-sm font-medium text-gray-900">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="divide-y divide-gray-200">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-8 h-8 mx-auto text-gray-400 mb-2" />

              <p className="text-gray-500">
                No items found matching your criteria
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "px-4 py-4 hover:bg-gray-50 transition-colors",
                  selectedItems.includes(item.id) && "bg-blue-50"
                )}
              >
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemSelect(item.id)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(item.type)}
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </h3>
                      </div>

                      <Badge
                        variant="outline"
                        className={getStatusColor(item.status)}
                      >
                        {item.status}
                      </Badge>

                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={getPriorityColor(item.priority)}
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>By {item.author}</span>
                      <span>
                        Modified{" "}
                        {new Date(item.lastModified).toLocaleDateString()}
                      </span>
                      {item.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tag className="w-3 h-3" />

                          <span>{item.tags.slice(0, 2).join(", ")}</span>
                          {item.tags.length > 2 && (
                            <span>+{item.tags.length - 2} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />

              <span>Delete Items</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.length} selected
              item{selectedItems.length !== 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
