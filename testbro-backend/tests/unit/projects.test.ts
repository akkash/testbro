import request from 'supertest';
import express from 'express';
import projectRoutes from '../../src/routes/projects';
import { supabaseAdmin } from '../../src/config/database';

// Mock Supabase admin
jest.mock('../../src/config/database', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  TABLES: {
    PROJECTS: 'projects',
  },
}));

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticateUser: jest.fn((_req: any, _res: any, next: any) => {
    _req.user = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {},
      app_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    next();
  }),
  requireRole: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  requireProjectAccess: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('Project Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should return user\'s projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          description: 'First test project',
          organization_id: 'org-1',
          owner_id: 'user-123',
          settings: { default_browser: 'chromium' },
          tags: ['test'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          organizations: {
            id: 'org-1',
            name: 'Test Organization',
          },
        },
      ];

      const mockMemberships = [
        { organization_id: 'org-1' },
      ];

      // Mock the organization memberships query
      (supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockMemberships,
              error: null,
            }),
          }),
        })
        // Mock the projects query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockProjects,
                  error: null,
                  count: 1,
                }),
              }),
            }),
          }),
        });

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Project 1');
      expect(response.body.meta.total).toBe(1);
    });

    it('should handle database errors', async () => {
      // Mock organization memberships query to return error
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const response = await request(app)
        .get('/api/projects')
        .expect(500);

      expect(response.body.error).toBe('DATABASE_ERROR');
    });
  });

  describe('POST /api/projects', () => {
    const validProjectData = {
      name: 'New Test Project',
      description: 'A new project for testing',
      organization_id: 'org-123',
      settings: {
        default_browser: 'chromium',
        timeout_seconds: 30,
      },
      tags: ['automation', 'testing'],
    };

    it('should create new project successfully', async () => {
      const mockMembership = [{ role: 'admin' }];
      const mockCreatedProject = {
        id: 'project-new',
        ...validProjectData,
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock organization membership check
      (supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockMembership,
                error: null,
              }),
            }),
          }),
        })
        // Mock project creation
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCreatedProject,
                error: null,
              }),
            }),
          }),
        });

      const response = await request(app)
        .post('/api/projects')
        .send(validProjectData)
        .expect(201);

      expect(response.body.data.name).toBe('New Test Project');
      expect(response.body.message).toBe('Project created successfully');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field',
      };

      const response = await request(app)
        .post('/api/projects')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should deny access when user lacks permissions', async () => {
      // Mock organization membership check to return no membership
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No membership found' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/projects')
        .send(validProjectData)
        .expect(403);

      expect(response.body.error).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Project description',
        organization_id: 'org-123',
        owner_id: 'user-123',
        settings: { default_browser: 'chromium' },
        tags: ['test'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        organizations: {
          id: 'org-123',
          name: 'Test Organization',
          description: 'Org description',
        },
        test_targets: [
          {
            id: 'target-1',
            name: 'Test Target',
            url: 'https://example.com',
            platform: 'web',
            environment: 'production',
          },
        ],
        test_cases: [
          {
            id: 'case-1',
            name: 'Test Case',
            description: 'Case description',
            priority: 'high',
            status: 'active',
            tags: ['smoke'],
            ai_generated: false,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockProject,
            error: null,
          }),
        }),
      });

      const response = await request(app)
        .get('/api/projects/project-123')
        .expect(200);

      expect(response.body.data.name).toBe('Test Project');
      expect(response.body.data.test_targets).toHaveLength(1);
      expect(response.body.data.test_cases).toHaveLength(1);
    });

    it('should return 404 for non-existent project', async () => {
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Project not found' },
          }),
        }),
      });

      const response = await request(app)
        .get('/api/projects/non-existent')
        .expect(404);

      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/projects/:id', () => {
    const updateData = {
      name: 'Updated Project Name',
      description: 'Updated description',
      settings: {
        default_browser: 'firefox',
        timeout_seconds: 60,
      },
      tags: ['updated', 'test'],
    };

    it('should update project successfully', async () => {
      const mockUpdatedProject = {
        id: 'project-123',
        name: 'Updated Project Name',
        description: 'Updated description',
        settings: { default_browser: 'firefox', timeout_seconds: 60 },
        tags: ['updated', 'test'],
        updated_at: '2024-01-02T00:00:00Z',
      };

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedProject,
                error: null,
              }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/projects/project-123')
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe('Updated Project Name');
      expect(response.body.message).toBe('Project updated successfully');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully', async () => {
      // Mock no active executions
      (supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        // Mock successful deletion
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      const response = await request(app)
        .delete('/api/projects/project-123')
        .expect(200);

      expect(response.body.message).toBe('Project deleted successfully');
    });

    it('should prevent deletion with active executions', async () => {
      // Mock active executions
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'execution-1' }],
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .delete('/api/projects/project-123')
        .expect(409);

      expect(response.body.error).toBe('CONFLICT');
    });
  });

  describe('GET /api/projects/:id/stats', () => {
    it('should return project statistics', async () => {
      const mockStats = {
        total_test_cases: 10,
        active_test_cases: 8,
        total_executions: 25,
        successful_executions: 20,
        failed_executions: 5,
        average_execution_time: 45.5,
      };

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStats,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/projects/project-123/stats')
        .expect(200);

      expect(response.body.data.total_test_cases).toBe(10);
      expect(response.body.data.successful_executions).toBe(20);
    });
  });

  describe('POST /api/projects/:id/clone', () => {
    const cloneData = {
      name: 'Cloned Project',
      description: 'A cloned project',
    };

    it('should clone project successfully', async () => {
      const mockOriginalProject = {
        id: 'project-123',
        name: 'Original Project',
        description: 'Original description',
        organization_id: 'org-123',
        owner_id: 'user-123',
        settings: { default_browser: 'chromium' },
        tags: ['original'],
      };

      const mockClonedProject = {
        id: 'project-cloned',
        name: 'Cloned Project',
        description: 'A cloned project',
        organization_id: 'org-123',
        owner_id: 'user-123',
        settings: { default_browser: 'chromium' },
        tags: ['original', 'cloned'],
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      // Mock getting original project
      (supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockOriginalProject,
              error: null,
            }),
          }),
        })
        // Mock getting test cases
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        })
        // Mock creating cloned project
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClonedProject,
                error: null,
              }),
            }),
          }),
        });

      const response = await request(app)
        .post('/api/projects/project-123/clone')
        .send(cloneData)
        .expect(201);

      expect(response.body.data.name).toBe('Cloned Project');
      expect(response.body.message).toBe('Project cloned successfully');
    });

    it('should require name for cloning', async () => {
      const response = await request(app)
        .post('/api/projects/project-123/clone')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
