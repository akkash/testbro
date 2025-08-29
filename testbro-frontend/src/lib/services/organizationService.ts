import { apiClient } from '../api'

export interface Organization {
  id: string
  name: string
  description: string
  owner_id: string
  settings: {
    max_users: number
    max_projects: number
    max_tests_per_month: number
    features: string[]
  }
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  joined_at: string
  invited_at?: string
  profiles: {
    id: string
    email: string
    user_metadata: {
      name?: string
      avatar_url?: string
    }
  }
}

export interface OrganizationMembership {
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  joined_at: string
  organizations: Organization
}

export interface CreateOrganizationRequest {
  name: string
  description?: string
  settings?: {
    max_users?: number
    max_projects?: number
    max_tests_per_month?: number
    features?: string[]
  }
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
  settings?: {
    max_users?: number
    max_projects?: number
    max_tests_per_month?: number
    features?: string[]
  }
}

export interface InviteMemberRequest {
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

export interface UpdateMemberRoleRequest {
  role: 'admin' | 'editor' | 'viewer'
}

export class OrganizationService {
  /**
   * Get user's organizations
   */
  static async getOrganizations() {
    try {
      const result = await apiClient.get('/api/organizations')
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching organizations:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(id: string) {
    try {
      const result = await apiClient.get(`/api/organizations/${id}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching organization:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Create new organization
   */
  static async createOrganization(organizationData: CreateOrganizationRequest) {
    try {
      const result = await apiClient.post('/api/organizations', organizationData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error creating organization:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(id: string, updateData: UpdateOrganizationRequest) {
    try {
      const result = await apiClient.put(`/api/organizations/${id}`, updateData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error updating organization:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(id: string) {
    try {
      await apiClient.delete(`/api/organizations/${id}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error deleting organization:', error)
      return { error: error.message }
    }
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(id: string) {
    try {
      const result = await apiClient.get(`/api/organizations/${id}/members`)
      return { data: result.data || [], error: null }
    } catch (error: any) {
      console.error('Error fetching organization members:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Invite member to organization
   */
  static async inviteMember(id: string, inviteData: InviteMemberRequest) {
    try {
      const result = await apiClient.post(`/api/organizations/${id}/members`, inviteData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error inviting member:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(organizationId: string, memberId: string, roleData: UpdateMemberRoleRequest) {
    try {
      const result = await apiClient.put(`/api/organizations/${organizationId}/members/${memberId}`, roleData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error updating member role:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Remove member from organization
   */
  static async removeMember(organizationId: string, memberId: string) {
    try {
      await apiClient.delete(`/api/organizations/${organizationId}/members/${memberId}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error removing member:', error)
      return { error: error.message }
    }
  }

  /**
   * Calculate role statistics for organization members
   */
  static calculateRoleStats(members: OrganizationMember[]) {
    return {
      total: members.length,
      admin: members.filter(m => m.role === 'admin').length,
      editor: members.filter(m => m.role === 'editor').length,
      viewer: members.filter(m => m.role === 'viewer').length,
    }
  }

  /**
   * Transform backend member data to frontend format
   */
  static transformMemberData(member: OrganizationMember) {
    return {
      id: member.id,
      name: member.profiles?.user_metadata?.name || member.profiles?.email?.split('@')[0] || 'Unknown User',
      email: member.profiles?.email || '',
      role: member.role,
      avatar: member.profiles?.user_metadata?.avatar_url || '',
      lastActive: member.joined_at,
      testsCreated: 0, // Would need additional API to get test statistics
      testsExecuted: 0, // Would need additional API to get execution statistics
      status: member.status,
      joined_at: member.joined_at,
      invited_at: member.invited_at,
    }
  }
}