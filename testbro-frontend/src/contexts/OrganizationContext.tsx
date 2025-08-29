import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrganizationService, Organization, OrganizationMembership } from '@/lib/services/organizationService';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  // State
  organizations: OrganizationMembership[];
  currentOrganization: Organization | null;
  userRole: string;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (data: any) => Promise<{ data: Organization | null; error: string | null }>;
  switchOrganization: (organizationId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load organizations when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshOrganizations();
    } else {
      // Clear state when user logs out
      setOrganizations([]);
      setCurrentOrganization(null);
      setUserRole('viewer');
    }
  }, [isAuthenticated, user]);

  const refreshOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: orgsError } = await OrganizationService.getOrganizations();
      
      if (orgsError) {
        setError(orgsError);
        setOrganizations([]);
        setCurrentOrganization(null);
      } else {
        setOrganizations(data || []);
        
        // Set current organization if not already set
        if (!currentOrganization && data && data.length > 0) {
          const firstMembership = data[0];
          setCurrentOrganization(firstMembership.organizations);
          setUserRole(firstMembership.role);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organizations';
      setError(errorMessage);
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    
    // Update user role for this organization
    const membership = organizations.find(m => m.organizations.id === org.id);
    if (membership) {
      setUserRole(membership.role);
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const createOrganization = async (data: any) => {
    try {
      const result = await OrganizationService.createOrganization(data);
      
      if (!result.error) {
        // Refresh organizations list to include the new one
        await refreshOrganizations();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create organization';
      return { data: null, error: errorMessage };
    }
  };

  const switchOrganization = (organizationId: string) => {
    const membership = organizations.find(m => m.organizations.id === organizationId);
    if (membership) {
      handleSetCurrentOrganization(membership.organizations);
    }
  };

  // Load saved organization on initialization
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      if (savedOrgId) {
        const savedMembership = organizations.find(m => m.organizations.id === savedOrgId);
        if (savedMembership) {
          handleSetCurrentOrganization(savedMembership.organizations);
          return;
        }
      }
      
      // Fallback to first organization
      const firstMembership = organizations[0];
      handleSetCurrentOrganization(firstMembership.organizations);
    }
  }, [organizations]);

  const contextValue: OrganizationContextType = {
    organizations,
    currentOrganization,
    userRole,
    loading,
    error,
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshOrganizations,
    createOrganization,
    switchOrganization,
  };

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}