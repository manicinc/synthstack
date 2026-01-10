import type { FastifyInstance } from 'fastify'
import crypto from 'crypto'

// OpenAI client - optional, only used for moderation
let openai: any = null
async function initOpenAI() {
  try {
    const OpenAI = (await import('openai')).default
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
  } catch {
    console.warn('OpenAI module not available - moderation features disabled')
  }
}
initOpenAI()

interface UploadSubmission {
  title: string
  description: string
  category: string
  tags: string[]
  license: string
  material: string
  supportedMaterials: string[]
  layerHeightMin: number
  layerHeightMax: number
  infillMin: number
  infillMax: number
  supportsRequired: string
  copyrightHolder: string
  copyrightYear: number
  isOriginal: boolean
  originalCreator?: string
  originalSource?: string
}

interface ModerationResult {
  approved: boolean
  requiresHumanReview: boolean
  score: number
  flags: string[]
  reasoning: string
}

export default async function uploadsRoutes(fastify: FastifyInstance) {
  // =========================================
  // COMMUNITY UPLOADS
  // =========================================

  // Submit new model for review
  fastify.post('/community/uploads', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      // Get file buffer and metadata
      const buffer = await data.toBuffer()
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')
      const fileSize = buffer.length
      const fileName = data.filename
      const fileType = fileName.split('.').pop()?.toLowerCase() || ''

      // Validate file type
      const allowedTypes = ['stl', 'obj', '3mf']
      if (!allowedTypes.includes(fileType)) {
        return reply.status(400).send({ error: 'Invalid file type. Allowed: STL, OBJ, 3MF' })
      }

      // Check file size (100MB max)
      if (fileSize > 100 * 1024 * 1024) {
        return reply.status(400).send({ error: 'File too large. Max 100MB' })
      }

      // Parse form fields
      const fields = data.fields as any
      const submission: UploadSubmission = {
        title: fields.title?.value || '',
        description: fields.description?.value || '',
        category: fields.category?.value || '',
        tags: JSON.parse(fields.tags?.value || '[]'),
        license: fields.license?.value || 'cc-by-sa',
        material: fields.material?.value || 'PLA',
        supportedMaterials: JSON.parse(fields.supportedMaterials?.value || '[]'),
        layerHeightMin: parseFloat(fields.layerHeightMin?.value || '0.12'),
        layerHeightMax: parseFloat(fields.layerHeightMax?.value || '0.28'),
        infillMin: parseInt(fields.infillMin?.value || '10'),
        infillMax: parseInt(fields.infillMax?.value || '30'),
        supportsRequired: fields.supportsRequired?.value || 'none',
        copyrightHolder: fields.copyrightHolder?.value || '',
        copyrightYear: parseInt(fields.copyrightYear?.value || new Date().getFullYear().toString()),
        isOriginal: fields.isOriginal?.value === 'true',
        originalCreator: fields.originalCreator?.value,
        originalSource: fields.originalSource?.value
      }

      // Validate required fields
      if (!submission.title || !submission.description || !submission.copyrightHolder) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Check for duplicate file
      const existing = await fastify.pg.query(
        'SELECT id FROM uploaded_models WHERE file_hash = $1',
        [fileHash]
      )
      
      if (existing.rows.length > 0) {
        return reply.status(409).send({ 
          error: 'This file has already been uploaded',
          existingId: existing.rows[0].id
        })
      }

      // TODO: Upload file to storage (S3/R2)
      const storagePath = `community/${userId}/${fileHash}.${fileType}`

      // Insert into database (pending moderation)
      const result = await fastify.pg.query(`
        INSERT INTO uploaded_models (
          user_id, original_filename, file_hash, file_size_bytes, file_type,
          storage_path, is_public, public_consent_acknowledged
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
        RETURNING id
      `, [userId, fileName, fileHash, fileSize, fileType, storagePath])

      const modelId = result.rows[0].id

      // Insert metadata
      await fastify.pg.query(`
        INSERT INTO community_model_metadata (
          model_id, title, description, category, tags, license,
          recommended_material, supported_materials, layer_height_min, layer_height_max,
          infill_min, infill_max, supports_required, copyright_holder, copyright_year,
          is_original, original_creator, original_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        modelId, submission.title, submission.description, submission.category,
        submission.tags, submission.license, submission.material, submission.supportedMaterials,
        submission.layerHeightMin, submission.layerHeightMax, submission.infillMin, submission.infillMax,
        submission.supportsRequired, submission.copyrightHolder, submission.copyrightYear,
        submission.isOriginal, submission.originalCreator, submission.originalSource
      ])

      // Queue for AI moderation
      await queueAIModeration(fastify, modelId, submission)

      return {
        success: true,
        modelId,
        status: 'pending_review',
        message: 'Your model has been submitted and is being reviewed. You will be notified when it is approved.'
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to upload model' })
    }
  })

  // Get user's uploads
  fastify.get('/community/uploads/mine', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const { status, page = 1, limit = 20 } = request.query as any
      const offset = (page - 1) * limit

      let query = `
        SELECT 
          um.*,
          cmm.title,
          cmm.description,
          cmm.category,
          cmm.license,
          (SELECT COUNT(*) FROM votes WHERE model_id = um.id) as vote_count,
          (SELECT COUNT(*) FROM comments WHERE model_id = um.id AND is_hidden = FALSE) as comment_count
        FROM uploaded_models um
        LEFT JOIN community_model_metadata cmm ON um.id = cmm.model_id
        WHERE um.user_id = $1
      `
      
      const params: any[] = [userId]
      
      if (status) {
        if (status === 'pending') {
          query += ' AND um.is_approved IS NULL'
        } else if (status === 'approved') {
          query += ' AND um.is_approved = TRUE'
        } else if (status === 'rejected') {
          query += ' AND um.is_approved = FALSE'
        }
      }
      
      query += ' ORDER BY um.created_at DESC LIMIT $2 OFFSET $3'
      params.push(limit, offset)

      const result = await fastify.pg.query(query, params)
      
      return { uploads: result.rows, page, limit }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch uploads' })
    }
  })

  // Browse community models
  fastify.get('/community/models', async (request: any, reply) => {
    try {
      const { 
        category, material, license, search, 
        sort = 'trending', page = 1, limit = 24 
      } = request.query as any
      const offset = (page - 1) * limit

      let query = `
        SELECT 
          um.id,
          um.thumbnail_url,
          um.created_at,
          cmm.title,
          cmm.category,
          cmm.license,
          cmm.recommended_material as material,
          u.display_name as creator,
          u.id as creator_id,
          (SELECT COUNT(*) FROM votes WHERE model_id = um.id) as votes,
          (SELECT COUNT(*) FROM comments WHERE model_id = um.id AND is_hidden = FALSE) as comments,
          um.download_count as downloads
        FROM uploaded_models um
        INNER JOIN community_model_metadata cmm ON um.id = cmm.model_id
        LEFT JOIN users u ON um.user_id = u.id
        WHERE um.is_public = TRUE AND um.is_approved = TRUE AND um.is_flagged = FALSE
      `
      
      const params: any[] = []
      let paramCount = 0

      if (category) {
        paramCount++
        query += ` AND cmm.category = $${paramCount}`
        params.push(category)
      }

      if (material) {
        paramCount++
        query += ` AND cmm.recommended_material = $${paramCount}`
        params.push(material)
      }

      if (license) {
        paramCount++
        query += ` AND cmm.license = $${paramCount}`
        params.push(license)
      }

      if (search) {
        paramCount++
        query += ` AND (cmm.title ILIKE $${paramCount} OR cmm.description ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      // Sort
      switch (sort) {
        case 'trending':
          query += ' ORDER BY (SELECT COUNT(*) FROM votes WHERE model_id = um.id AND created_at > NOW() - INTERVAL \'7 days\') DESC'
          break
        case 'recent':
          query += ' ORDER BY um.created_at DESC'
          break
        case 'popular':
          query += ' ORDER BY (SELECT COUNT(*) FROM votes WHERE model_id = um.id) DESC'
          break
        case 'downloads':
          query += ' ORDER BY um.download_count DESC'
          break
        default:
          query += ' ORDER BY um.created_at DESC'
      }

      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(limit)
      
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(offset)

      const result = await fastify.pg.query(query, params)

      return { models: result.rows, page, limit }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch models' })
    }
  })

  // Get single model details
  fastify.get('/community/models/:id', async (request: any, reply) => {
    try {
      const modelId = request.params.id

      const result = await fastify.pg.query(`
        SELECT 
          um.*,
          cmm.*,
          u.display_name as creator_name,
          u.id as creator_id,
          u.avatar_url as creator_avatar,
          (SELECT COUNT(*) FROM votes WHERE model_id = um.id) as vote_count,
          (SELECT COUNT(*) FROM comments WHERE model_id = um.id AND is_hidden = FALSE) as comment_count
        FROM uploaded_models um
        INNER JOIN community_model_metadata cmm ON um.id = cmm.model_id
        LEFT JOIN users u ON um.user_id = u.id
        WHERE um.id = $1 AND um.is_approved = TRUE
      `, [modelId])

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Model not found' })
      }

      return { model: result.rows[0] }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch model' })
    }
  })

  // Download model
  fastify.post('/community/models/:id/download', async (request: any, reply) => {
    try {
      const modelId = request.params.id

      // Increment download count
      await fastify.pg.query(
        'UPDATE uploaded_models SET download_count = download_count + 1 WHERE id = $1',
        [modelId]
      )

      // Get download URL
      const result = await fastify.pg.query(
        'SELECT storage_path, original_filename FROM uploaded_models WHERE id = $1 AND is_approved = TRUE',
        [modelId]
      )

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Model not found' })
      }

      // TODO: Generate signed download URL from storage
      return { 
        downloadUrl: `/api/v1/storage/${result.rows[0].storage_path}`,
        filename: result.rows[0].original_filename
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to initiate download' })
    }
  })

  // =========================================
  // CREATOR PROFILES
  // =========================================

  // Get creator profile
  fastify.get('/community/creators/:id', async (request: any, reply) => {
    try {
      const creatorId = request.params.id

      const userResult = await fastify.pg.query(`
        SELECT 
          id, display_name, avatar_url, created_at,
          (SELECT COUNT(*) FROM uploaded_models WHERE user_id = users.id AND is_approved = TRUE) as model_count,
          (SELECT COUNT(*) FROM votes v 
           INNER JOIN uploaded_models um ON v.model_id = um.id 
           WHERE um.user_id = users.id) as total_votes,
          (SELECT SUM(download_count) FROM uploaded_models WHERE user_id = users.id) as total_downloads
        FROM users
        WHERE id = $1
      `, [creatorId])

      if (userResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Creator not found' })
      }

      const profileResult = await fastify.pg.query(
        'SELECT * FROM creator_profiles WHERE user_id = $1',
        [creatorId]
      )

      const modelsResult = await fastify.pg.query(`
        SELECT 
          um.id, um.thumbnail_url, cmm.title, cmm.category,
          (SELECT COUNT(*) FROM votes WHERE model_id = um.id) as votes
        FROM uploaded_models um
        INNER JOIN community_model_metadata cmm ON um.id = cmm.model_id
        WHERE um.user_id = $1 AND um.is_approved = TRUE
        ORDER BY (SELECT COUNT(*) FROM votes WHERE model_id = um.id) DESC
        LIMIT 12
      `, [creatorId])

      return {
        user: userResult.rows[0],
        profile: profileResult.rows[0] || null,
        topModels: modelsResult.rows
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch creator profile' })
    }
  })

  // Update creator profile
  fastify.put('/community/creators/me', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const { bio, website, github, twitter, youtube, joinProgram, allowTips, revenueShare, paymentEmail } = request.body as any

      // Upsert creator profile
      await fastify.pg.query(`
        INSERT INTO creator_profiles (user_id, bio, website, github, twitter, youtube, join_program, allow_tips, revenue_share, payment_email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id) DO UPDATE SET
          bio = EXCLUDED.bio,
          website = EXCLUDED.website,
          github = EXCLUDED.github,
          twitter = EXCLUDED.twitter,
          youtube = EXCLUDED.youtube,
          join_program = EXCLUDED.join_program,
          allow_tips = EXCLUDED.allow_tips,
          revenue_share = EXCLUDED.revenue_share,
          payment_email = EXCLUDED.payment_email,
          updated_at = NOW()
      `, [userId, bio, website, github, twitter, youtube, joinProgram, allowTips, revenueShare, paymentEmail])

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to update profile' })
    }
  })
}

// =========================================
// AI MODERATION
// =========================================

async function queueAIModeration(fastify: FastifyInstance, modelId: string, submission: UploadSubmission) {
  // Run AI moderation in background
  setTimeout(async () => {
    try {
      const result = await runAIModeration(submission)
      
      if (result.approved && !result.requiresHumanReview) {
        // Auto-approve
        await fastify.pg.query(`
          UPDATE uploaded_models SET 
            is_approved = TRUE,
            moderated_at = NOW()
          WHERE id = $1
        `, [modelId])
        
        fastify.log.info(`Model ${modelId} auto-approved by AI`)
      } else if (result.requiresHumanReview) {
        // Flag for human review
        await fastify.pg.query(`
          UPDATE uploaded_models SET 
            is_flagged = TRUE,
            flag_reason = $1
          WHERE id = $2
        `, [result.reasoning, modelId])
        
        fastify.log.info(`Model ${modelId} flagged for human review: ${result.reasoning}`)
      } else {
        // Auto-reject
        await fastify.pg.query(`
          UPDATE uploaded_models SET 
            is_approved = FALSE,
            moderated_at = NOW(),
            flag_reason = $1
          WHERE id = $2
        `, [result.reasoning, modelId])
        
        fastify.log.info(`Model ${modelId} auto-rejected by AI: ${result.reasoning}`)
      }

      // Log moderation
      await fastify.pg.query(`
        INSERT INTO moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
        VALUES (NULL, 'ai_moderation', 'model', $1, $2, $3)
      `, [modelId, result.reasoning, JSON.stringify(result)])
    } catch (error) {
      fastify.log.error({ err: error }, `AI moderation failed for model ${modelId}`)
    }
  }, 2000) // Wait 2 seconds before starting moderation
}

async function runAIModeration(submission: UploadSubmission): Promise<ModerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    // No API key, require human review
    return {
      approved: false,
      requiresHumanReview: true,
      score: 0.5,
      flags: ['no_ai_available'],
      reasoning: 'AI moderation unavailable, requires human review'
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a content moderator for a 3D printing community. Review submissions for:
1. Inappropriate content (violence, adult, hate)
2. Copyright/trademark violations
3. Spam or low-quality submissions
4. Misleading descriptions

Respond with JSON:
{
  "approved": boolean,
  "requiresHumanReview": boolean,
  "score": 0-1 (confidence),
  "flags": string[],
  "reasoning": string
}

Be permissive for legitimate 3D printing content. Flag for human review if uncertain.`
        },
        {
          role: 'user',
          content: `Review this submission:
Title: ${submission.title}
Description: ${submission.description}
Category: ${submission.category}
Tags: ${submission.tags.join(', ')}
License: ${submission.license}
Copyright: ${submission.copyrightHolder}
Is Original: ${submission.isOriginal}
${submission.originalSource ? `Original Source: ${submission.originalSource}` : ''}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content || '{}'
    return JSON.parse(content) as ModerationResult
  } catch (error) {
    console.error('AI moderation error:', error)
    return {
      approved: false,
      requiresHumanReview: true,
      score: 0.5,
      flags: ['ai_error'],
      reasoning: 'AI moderation failed, requires human review'
    }
  }
}



