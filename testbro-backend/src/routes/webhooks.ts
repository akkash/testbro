import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import crypto from 'crypto';

const router = express.Router();

// Apply authentication to all routes (supports both JWT and API key)
router.use(authenticate);

/**
 * GET /api/webhooks
 * Get user's webhooks
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { data: webhooks, error } = await supabaseAdmin
    .from('webhooks')
    .select(`
      *,
      projects (
        id,
        name
      )
    `)
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch webhooks',
    });
  }

  res.json({ data: webhooks });
}));

/**
 * POST /api/webhooks
 * Create new webhook
 */
router.post('/', validate(schemas.createWebhook), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const webhookData = req.body;

  // Generate secret if not provided
  const secret = webhookData.secret || crypto.randomBytes(32).toString('hex');

  const { data: webhook, error } = await supabaseAdmin
    .from('webhooks')
    .insert({
      ...webhookData,
      user_id: userId,
      secret: secret,
      active: webhookData.active !== false,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create webhook',
    });
  }

  res.status(201).json({
    data: webhook,
    message: 'Webhook created successfully',
  });
}));

/**
 * PUT /api/webhooks/:id
 * Update webhook
 */
router.put('/:id', validate(schemas.createWebhook), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updateData = req.body;

  const { data: webhook, error } = await supabaseAdmin
    .from('webhooks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update webhook',
    });
  }

  if (!webhook) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Webhook not found',
    });
  }

  res.json({
    data: webhook,
    message: 'Webhook updated successfully',
  });
}));

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { error } = await supabaseAdmin
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to delete webhook',
    });
  }

  res.json({
    message: 'Webhook deleted successfully',
  });
}));

/**
 * POST /api/webhooks/:id/test
 * Test webhook
 */
router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Get webhook details
  const { data: webhook, error: webhookError } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (webhookError || !webhook) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Webhook not found',
    });
  }

  // Create test payload
  const testPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook',
      webhook_id: id,
      user_id: userId,
    },
  };

  try {
    // Send test webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(testPayload))
          .digest('hex'),
        'X-Webhook-ID': id,
        'X-Webhook-Event': 'test',
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    res.json({
      message: 'Test webhook sent successfully',
      status_code: response.status,
    });

  } catch (error) {
    console.error('Webhook test failed:', error);
    res.status(500).json({
      error: 'WEBHOOK_TEST_FAILED',
      message: 'Failed to send test webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * POST /api/webhooks/incoming/:id
 * Handle incoming webhooks (public endpoint)
 */
router.post('/incoming/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];

  // Get webhook details
  const { data: webhook, error: webhookError } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .eq('active', true)
    .single();

  if (webhookError || !webhook) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Webhook not found or inactive',
    });
  }

  // Verify webhook signature
  if (webhook.secret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed',
      });
    }
  }

  // Process webhook based on event type
  try {
    switch (event) {
      case 'execution_complete':
        await handleExecutionComplete(webhook, payload);
        break;
      case 'execution_failed':
        await handleExecutionFailed(webhook, payload);
        break;
      case 'test_created':
        await handleTestCreated(webhook, payload);
        break;
      case 'project_updated':
        await handleProjectUpdated(webhook, payload);
        break;
      default:
        console.log(`Unknown webhook event: ${event}`);
    }

    res.json({
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: 'Failed to process webhook',
    });
  }
}));

/**
 * Webhook event handlers
 */
async function handleExecutionComplete(webhook: any, payload: any) {
  console.log('Processing execution_complete webhook:', payload);

  // Log webhook delivery
  await supabaseAdmin
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhook.id,
      event: 'execution_complete',
      payload: payload,
      delivered_at: new Date().toISOString(),
      status: 'success',
    });
}

async function handleExecutionFailed(webhook: any, payload: any) {
  console.log('Processing execution_failed webhook:', payload);

  // Log webhook delivery
  await supabaseAdmin
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhook.id,
      event: 'execution_failed',
      payload: payload,
      delivered_at: new Date().toISOString(),
      status: 'success',
    });
}

async function handleTestCreated(webhook: any, payload: any) {
  console.log('Processing test_created webhook:', payload);

  // Log webhook delivery
  await supabaseAdmin
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhook.id,
      event: 'test_created',
      payload: payload,
      delivered_at: new Date().toISOString(),
      status: 'success',
    });
}

async function handleProjectUpdated(webhook: any, payload: any) {
  console.log('Processing project_updated webhook:', payload);

  // Log webhook delivery
  await supabaseAdmin
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhook.id,
      event: 'project_updated',
      payload: payload,
      delivered_at: new Date().toISOString(),
      status: 'success',
    });
}

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { page = 1, limit = 20 } = req.query;

  const { data: deliveries, error, count } = await supabaseAdmin
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', id)
    .eq('user_id', userId)
    .order('delivered_at', { ascending: false })
    .range((parseInt(page as string) - 1) * parseInt(limit as string), parseInt(page as string) * parseInt(limit as string) - 1);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch webhook deliveries',
    });
  }

  res.json({
    data: deliveries,
    meta: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: count,
      total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
    },
  });
}));

export default router;
