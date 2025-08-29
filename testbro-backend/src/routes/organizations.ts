import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

/**
 * GET /api/organizations
 * Get user's organizations
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { data: memberships, error } = await supabaseAdmin
    .from('organization_members')
    .select(`
      role,
      status,
      joined_at,
      organizations (
        id,
        name,
        description,
        owner_id,
        settings,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch organizations',
    });
  }

  res.json({ data: memberships });
}));

/**
 * GET /api/organizations/:id
 * Get organization by ID
 */
router.get('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if user is a member of the organization
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this organization',
    });
  }

  const { data: organization, error } = await supabaseAdmin
    .from('organizations')
    .select(`
      *,
      organization_members (
        id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          email,
          user_metadata
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !organization) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Organization not found',
    });
  }

  res.json({ data: organization });
}));

/**
 * POST /api/organizations
 * Create new organization
 */
router.post('/', validate(schemas.createOrganization), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const orgData = req.body;

  const { data: organization, error } = await supabaseAdmin
    .from('organizations')
    .insert({
      ...orgData,
      owner_id: userId,
      settings: {
        max_users: 5,
        max_projects: 3,
        max_tests_per_month: 1000,
        features: ['basic', 'ai_generation'],
        ...orgData.settings,
      },
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create organization',
    });
  }

  // Add creator as admin member
  const { error: memberError } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: organization.id,
      user_id: userId,
      role: 'admin',
      invited_by: userId,
      joined_at: new Date().toISOString(),
      status: 'active',
    });

  if (memberError) {
    console.error('Failed to add organization member:', memberError);
    // Don't fail the request, but log the error
  }

  res.status(201).json({
    data: organization,
    message: 'Organization created successfully',
  });
}));

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put('/:id', validateParams(paramSchemas.id), validate(schemas.createOrganization), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updateData = req.body;

  // Check if user is admin of the organization
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership || membership.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only organization admins can update organization details',
    });
  }

  const { data: organization, error } = await supabaseAdmin
    .from('organizations')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update organization',
    });
  }

  if (!organization) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Organization not found',
    });
  }

  res.json({
    data: organization,
    message: 'Organization updated successfully',
  });
}));

/**
 * DELETE /api/organizations/:id
 * Delete organization (only owner can delete)
 */
router.delete('/:id', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if user is the owner of the organization
  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (orgError || !organization) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Organization not found',
    });
  }

  if (organization.owner_id !== userId) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only organization owners can delete organizations',
    });
  }

  // Check if organization has active projects
  const { data: projects, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('organization_id', id)
    .limit(1);

  if (projectError) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to check organization projects',
    });
  }

  if (projects && projects.length > 0) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Cannot delete organization with active projects. Please delete all projects first.',
    });
  }

  const { error } = await supabaseAdmin
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to delete organization',
    });
  }

  res.json({
    message: 'Organization deleted successfully',
  });
}));

/**
 * GET /api/organizations/:id/members
 * Get organization members
 */
router.get('/:id/members', validateParams(paramSchemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if user is a member of the organization
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied to this organization',
    });
  }

  const { data: members, error } = await supabaseAdmin
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      joined_at,
      invited_at,
      profiles (
        id,
        email,
        user_metadata
      )
    `)
    .eq('organization_id', id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch organization members',
    });
  }

  res.json({ data: members });
}));

/**
 * POST /api/organizations/:id/invite
 * Invite user to organization
 */
router.post('/:id/invite', validateParams(paramSchemas.id), validate(schemas.inviteUser), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { email, role } = req.body;

  // Check if user is admin of the organization
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership || membership.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only organization admins can invite users',
    });
  }

  // Check if user with this email exists
  const { data: existingUsers, error: userError } = await supabaseAdmin.auth.admin.listUsers();

  if (userError) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to check existing users',
    });
  }

  const invitedUser = (existingUsers as any).users?.find((user: any) => user.email === email);

  if (!invitedUser) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'User with this email does not exist. They must sign up first.',
    });
  }

  // Check if user is already a member
  const { data: existingMember, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .select('id, status')
    .eq('user_id', invitedUser.id)
    .eq('organization_id', id)
    .single();

  if (existingMember) {
    if (existingMember.status === 'active') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'User is already a member of this organization',
      });
    } else {
      // Re-invite pending user
      const { error: updateError } = await supabaseAdmin
        .from('organization_members')
        .update({
          role: role,
          invited_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id);

      if (updateError) {
        return res.status(500).json({
          error: 'DATABASE_ERROR',
          message: 'Failed to update invitation',
        });
      }

      return res.json({
        message: 'Invitation updated successfully',
      });
    }
  }

  // Create invitation
  const { error: inviteError } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: id,
      user_id: invitedUser.id,
      role: role,
      invited_by: userId,
      invited_at: new Date().toISOString(),
      status: 'pending',
    });

  if (inviteError) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create invitation',
    });
  }

  // TODO: Send invitation email

  res.status(201).json({
    message: 'Invitation sent successfully',
  });
}));

/**
 * PUT /api/organizations/:id/members/:memberId
 * Update member role
 */
router.put('/:id/members/:memberId', validateParams(paramSchemas.id), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id, memberId } = req.params;
  const userId = req.user!.id;
  const { role } = req.body;

  if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid role. Must be admin, editor, or viewer',
    });
  }

  // Check if user is admin of the organization
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership || membership.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only organization admins can update member roles',
    });
  }

  // Update member role
  const { data: updatedMember, error } = await supabaseAdmin
    .from('organization_members')
    .update({ role: role })
    .eq('id', memberId)
    .eq('organization_id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update member role',
    });
  }

  if (!updatedMember) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Organization member not found',
    });
  }

  res.json({
    data: updatedMember,
    message: 'Member role updated successfully',
  });
}));

/**
 * DELETE /api/organizations/:id/members/:memberId
 * Remove member from organization
 */
router.delete('/:id/members/:memberId', validateParams(paramSchemas.id), requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id, memberId } = req.params;
  const userId = req.user!.id;

  // Check if user is admin of the organization
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership || membership.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only organization admins can remove members',
    });
  }

  // Get member details before deletion
  const { data: member, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .select('*')
    .eq('id', memberId)
    .eq('organization_id', id)
    .single();

  if (memberError || !member) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Organization member not found',
    });
  }

  // Prevent removing the organization owner
  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (orgError || !organization) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to verify organization ownership',
    });
  }

  if (member.user_id === organization.owner_id) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Cannot remove the organization owner',
    });
  }

  // Remove member
  const { error } = await supabaseAdmin
    .from('organization_members')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to remove organization member',
    });
  }

  res.json({
    message: 'Member removed from organization successfully',
  });
}));

export default router;
