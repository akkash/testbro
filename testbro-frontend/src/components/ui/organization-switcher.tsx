import React, { useState } from 'react';
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function OrganizationSwitcher({ className }: { className?: string }) {
  const {
    organizations,
    currentOrganization,
    userRole,
    switchOrganization,
    createOrganization,
  } = useOrganization();

  const [open, setOpen] = useState(false);
  const [showNewOrgDialog, setShowNewOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;

    setCreating(true);
    const { error } = await createOrganization({
      name: newOrgName,
      description: newOrgDescription,
    });

    if (!error) {
      setNewOrgName('');
      setNewOrgDescription('');
      setShowNewOrgDialog(false);
    }
    setCreating(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select organization"
            className={cn('w-[200px] justify-between', className)}
          >
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">
                {currentOrganization?.name || 'No organization'}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>No organizations found.</CommandEmpty>
              <CommandGroup heading="Organizations">
                {organizations.map((membership) => (
                  <CommandItem
                    key={membership.organizations.id}
                    onSelect={() => {
                      switchOrganization(membership.organizations.id);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4" />
                        <span>{membership.organizations.name}</span>
                        {currentOrganization?.id === membership.organizations.id && (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {membership.role}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewOrgDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewOrgDialog} onOpenChange={setShowNewOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="Enter organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Enter organization description"
                value={newOrgDescription}
                onChange={(e) => setNewOrgDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewOrgDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}