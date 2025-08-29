import React, { useState } from "react";
import {
  Plus,
  X,
  Globe,
  Smartphone,
  Monitor,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Project, CreateProjectData } from "@/lib/services/projectService";

interface ProjectCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (project: CreateProjectData) => void;
}

const projectTemplates = [
  {
    id: "web-app",
    name: "Web Application",
    description: "Standard web application testing project",
    icon: Globe,
    defaultTags: ["web", "frontend", "ui"],
  },
  {
    id: "mobile-app",
    name: "Mobile Application",
    description: "Mobile app testing for iOS and Android",
    icon: Smartphone,
    defaultTags: ["mobile", "ios", "android"],
  },
  {
    id: "api-testing",
    name: "API Testing",
    description: "Backend API and service testing",
    icon: Target,
    defaultTags: ["api", "backend", "integration"],
  },
  {
    id: "e-commerce",
    name: "E-commerce Platform",
    description: "Complete e-commerce testing suite",
    icon: Monitor,
    defaultTags: ["e-commerce", "checkout", "payments"],
  },
];

export default function ProjectCreationDialog({
  open,
  onOpenChange,
  onCreateProject,
}: ProjectCreationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    template: "",
  });
  const [newTag, setNewTag] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    const template = projectTemplates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        template: templateId,
        name: prev.name || template.name,
        description: prev.description || template.description,
        tags: [...new Set([...prev.tags, ...template.defaultTags])],
      }));
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsCreating(true);

    const newProject: CreateProjectData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      tags: formData.tags,
    };

    onCreateProject(newProject);

    // Reset form
    setFormData({
      name: "",
      description: "",
      tags: [],
      template: "",
    });
    setIsCreating(false);
    onOpenChange(false);
  };

  const selectedTemplate = projectTemplates.find(
    (t) => t.id === formData.template
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new testing project with targets, team members, and
            configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Template Selection */}
          <div className="space-y-3">
            <Label>Project Template (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              {projectTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.template === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="w-5 h-5 text-gray-600 mt-0.5" />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                type="text"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Describe your project and testing goals"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 w-4 h-4"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddTag())
                }
                className="flex-1"
              />

              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
