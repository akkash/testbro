import express, { Request, Response } from 'express';
import { supabaseAdmin, TABLES } from '../config/database';
import { authenticateUser, requireProjectAccess } from '../middleware/auth';
import { validate, validateParams, paramSchemas } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { paginationService } from '../services/paginationService';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * GET /api/projects
 * Get projects with filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const paginationParams = paginationService.parsePaginationParams(req.query);

    // Get user's organization IDs first using Supabase
    const { data: orgMemberships, error: orgError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    if (orgError) {
      throw new Error(orgError.message);
    }

    const organizationIds = orgMemberships.map(row => row.organization_id);

    if (organizationIds.length === 0) {
      return res.json({
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: paginationParams.limit,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        },
        meta: {
          sortField: paginationParams.sortField,
          sortOrder: paginationParams.sortOrder,
          executionTime: 0,
        }
      });
    }

    // Build query