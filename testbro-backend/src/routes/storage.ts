import express, { Request, Response } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and common test artifacts
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/avi',
      'application/json',
      'text/plain',
      'text/html',
      'text/xml',
      'application/xml'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/storage/screenshots
 * Upload test execution screenshots
 */
router.post('/screenshots', upload.single('screenshot'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { execution_id, step_id, timestamp } = req.body;

  if (!req.file) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'No file provided',
    });
  }

  if (!execution_id) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'execution_id is required',
    });
  }

  try {
    // Verify user has access to the execution
    const { data: execution, error: execError } = await supabaseAdmin
      .from('test_executions')
      .select(`
        id,
        project_id,
        projects (
          organization_id,
          organization_members!inner (
            user_id
          )
        )
      `)
      .eq('id', execution_id)
      .eq('projects.organization_members.user_id', userId)
      .single();

    if (execError || !execution) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this execution',
      });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop() || 'png';
    const fileName = `screenshots/${execution_id}/${step_id || 'step'}-${timestamp || Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('test-artifacts')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          execution_id,
          step_id: step_id || null,
          uploaded_by: userId,
          original_name: req.file.originalname
        }
      });

    if (uploadError) {
      console.error('Screenshot upload error:', uploadError);
      return res.status(500).json({
        error: 'UPLOAD_ERROR',
        message: 'Failed to upload screenshot',
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('test-artifacts')
      .getPublicUrl(fileName);

    // Store metadata in database
    const { error: logError } = await supabaseAdmin
      .from('execution_logs')
      .insert({
        execution_id,
        step_id: step_id || null,
        level: 'info',
        message: 'Screenshot captured',
        timestamp: new Date().toISOString(),
        metadata: {
          screenshot_url: urlData.publicUrl,
          file_path: fileName,
          file_size: req.file.size,
          content_type: req.file.mimetype
        }
      });

    if (logError) {
      console.error('Screenshot log error:', logError);
    }

    res.status(201).json({
      data: {
        url: urlData.publicUrl,
        path: fileName,
        execution_id,
        step_id,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to upload screenshot',
    });
  }
}));

/**
 * POST /api/storage/videos
 * Upload test execution video recordings
 */
router.post('/videos', upload.single('video'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { execution_id, duration, resolution } = req.body;

  if (!req.file) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'No file provided',
    });
  }

  if (!execution_id) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'execution_id is required',
    });
  }

  try {
    // Verify user has access to the execution
    const { data: execution, error: execError } = await supabaseAdmin
      .from('test_executions')
      .select(`
        id,
        project_id,
        projects (
          organization_id,
          organization_members!inner (
            user_id
          )
        )
      `)
      .eq('id', execution_id)
      .eq('projects.organization_members.user_id', userId)
      .single();

    if (execError || !execution) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this execution',
      });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop() || 'mp4';
    const fileName = `videos/${execution_id}/recording-${Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('test-artifacts')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          execution_id,
          uploaded_by: userId,
          original_name: req.file.originalname,
          duration: duration || null,
          resolution: resolution || null
        }
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      return res.status(500).json({
        error: 'UPLOAD_ERROR',
        message: 'Failed to upload video',
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('test-artifacts')
      .getPublicUrl(fileName);

    // Store metadata in database
    const { error: logError } = await supabaseAdmin
      .from('execution_logs')
      .insert({
        execution_id,
        level: 'info',
        message: 'Video recording saved',
        timestamp: new Date().toISOString(),
        metadata: {
          video_url: urlData.publicUrl,
          file_path: fileName,
          file_size: req.file.size,
          content_type: req.file.mimetype,
          duration: duration || null,
          resolution: resolution || null
        }
      });

    if (logError) {
      console.error('Video log error:', logError);
    }

    res.status(201).json({
      data: {
        url: urlData.publicUrl,
        path: fileName,
        execution_id,
        size: req.file.size,
        duration,
        resolution
      }
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to upload video',
    });
  }
}));

/**
 * POST /api/storage/artifacts
 * Upload general test artifacts (logs, reports, etc.)
 */
router.post('/artifacts', upload.single('artifact'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { execution_id, artifact_type, description } = req.body;

  if (!req.file) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'No file provided',
    });
  }

  if (!execution_id) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'execution_id is required',
    });
  }

  try {
    // Verify user has access to the execution
    const { data: execution, error: execError } = await supabaseAdmin
      .from('test_executions')
      .select(`
        id,
        project_id,
        projects (
          organization_id,
          organization_members!inner (
            user_id
          )
        )
      `)
      .eq('id', execution_id)
      .eq('projects.organization_members.user_id', userId)
      .single();

    if (execError || !execution) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this execution',
      });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop() || 'txt';
    const artifactDir = artifact_type || 'general';
    const fileName = `artifacts/${execution_id}/${artifactDir}/${req.file.originalname}-${Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('test-artifacts')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          execution_id,
          artifact_type: artifact_type || 'general',
          uploaded_by: userId,
          original_name: req.file.originalname,
          description: description || null
        }
      });

    if (uploadError) {
      console.error('Artifact upload error:', uploadError);
      return res.status(500).json({
        error: 'UPLOAD_ERROR',
        message: 'Failed to upload artifact',
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('test-artifacts')
      .getPublicUrl(fileName);

    // Store metadata in database
    const { error: logError } = await supabaseAdmin
      .from('execution_logs')
      .insert({
        execution_id,
        level: 'info',
        message: `Artifact uploaded: ${artifact_type || 'general'}`,
        timestamp: new Date().toISOString(),
        metadata: {
          artifact_url: urlData.publicUrl,
          artifact_type: artifact_type || 'general',
          file_path: fileName,
          file_size: req.file.size,
          content_type: req.file.mimetype,
          description: description || null
        }
      });

    if (logError) {
      console.error('Artifact log error:', logError);
    }

    res.status(201).json({
      data: {
        url: urlData.publicUrl,
        path: fileName,
        execution_id,
        artifact_type: artifact_type || 'general',
        size: req.file.size,
        description
      }
    });

  } catch (error) {
    console.error('Artifact upload error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to upload artifact',
    });
  }
}));

/**
 * GET /api/storage/executions/:execution_id/files
 * Get all files for a specific execution
 */
router.get('/executions/:execution_id/files', asyncHandler(async (req: Request, res: Response) => {
  const { execution_id } = req.params;
  const userId = req.user!.id;
  const { type } = req.query; // Filter by file type: screenshots, videos, artifacts

  try {
    // Verify user has access to the execution
    const { data: execution, error: execError } = await supabaseAdmin
      .from('test_executions')
      .select(`
        id,
        project_id,
        projects (
          organization_id,
          organization_members!inner (
            user_id
          )
        )
      `)
      .eq('id', execution_id)
      .eq('projects.organization_members.user_id', userId)
      .single();

    if (execError || !execution) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this execution',
      });
    }

    // Get files from execution logs
    let query = supabaseAdmin
      .from('execution_logs')
      .select('timestamp, metadata, step_id, message')
      .eq('execution_id', execution_id)
      .not('metadata', 'is', null);

    // Apply type filter
    if (type === 'screenshots') {
      query = query.not('metadata->screenshot_url', 'is', null);
    } else if (type === 'videos') {
      query = query.not('metadata->video_url', 'is', null);
    } else if (type === 'artifacts') {
      query = query.not('metadata->artifact_url', 'is', null);
    }

    const { data: logs, error: logsError } = await query.order('timestamp', { ascending: true });

    if (logsError) {
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch execution files',
      });
    }

    // Transform the logs into file objects
    const files = logs?.map(log => {
      const metadata = log.metadata || {};
      return {
        timestamp: log.timestamp,
        step_id: log.step_id,
        message: log.message,
        type: metadata.screenshot_url ? 'screenshot' : 
              metadata.video_url ? 'video' : 
              metadata.artifact_url ? 'artifact' : 'unknown',
        url: metadata.screenshot_url || metadata.video_url || metadata.artifact_url,
        file_path: metadata.file_path,
        file_size: metadata.file_size,
        content_type: metadata.content_type,
        artifact_type: metadata.artifact_type,
        description: metadata.description,
        duration: metadata.duration,
        resolution: metadata.resolution
      };
    }).filter(file => file.url) || [];

    res.json({ data: files });

  } catch (error) {
    console.error('Get execution files error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch execution files',
    });
  }
}));

/**
 * DELETE /api/storage/files/:file_path
 * Delete a specific file from storage
 */
router.delete('/files/*', asyncHandler(async (req: Request, res: Response) => {
  const filePath = req.params[0]; // Get the full path after /files/
  const userId = req.user!.id;

  if (!filePath) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'File path is required',
    });
  }

  try {
    // Extract execution_id from file path
    const pathParts = filePath.split('/');
    const execution_id = pathParts[1]; // Assuming format: type/execution_id/filename

    if (!execution_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid file path format',
      });
    }

    // Verify user has access to the execution
    const { data: execution, error: execError } = await supabaseAdmin
      .from('test_executions')
      .select(`
        id,
        project_id,
        projects (
          organization_id,
          organization_members!inner (
            user_id
          )
        )
      `)
      .eq('id', execution_id)
      .eq('projects.organization_members.user_id', userId)
      .single();

    if (execError || !execution) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied to this execution',
      });
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('test-artifacts')
      .remove([filePath]);

    if (deleteError) {
      console.error('File deletion error:', deleteError);
      return res.status(500).json({
        error: 'DELETE_ERROR',
        message: 'Failed to delete file',
      });
    }

    // Remove metadata from execution logs
    const { error: logDeleteError } = await supabaseAdmin
      .from('execution_logs')
      .delete()
      .eq('execution_id', execution_id)
      .or(`metadata->>file_path.eq.${filePath}`);

    if (logDeleteError) {
      console.error('Log deletion error:', logDeleteError);
    }

    res.json({
      message: 'File deleted successfully',
      file_path: filePath
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete file',
    });
  }
}));

export default router;