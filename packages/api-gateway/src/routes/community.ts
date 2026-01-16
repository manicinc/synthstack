import type { FastifyInstance } from 'fastify'
import { config } from '../config/index.js'

type CMSItem = Record<string, any>

async function fetchFromDirectus(collection: string) {
  if (!config.directusUrl || !config.directusToken) return null
  const url = `${config.directusUrl}/items/${collection}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.directusToken}`,
      'Content-Type': 'application/json'
    }
  })
  if (!res.ok) throw new Error(`Directus ${collection} failed: ${res.status}`)
  const json = await res.json()
  return json.data as CMSItem[] | CMSItem
}

async function fetchFromSupabase(table: string) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null
  const url = `${config.supabaseUrl}/rest/v1/${table}?select=*`
  const res = await fetch(url, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  })
  if (!res.ok) throw new Error(`Supabase ${table} failed: ${res.status}`)
  return await res.json() as CMSItem[]
}

async function getCached<T>(fastify: FastifyInstance, key: string, loader: () => Promise<T>, ttlSeconds = 60): Promise<T> {
  if (fastify.redis) {
    const cached = await fastify.redis.get(key)
    if (cached) return JSON.parse(cached) as T
  }
  const value = await loader()
  if (fastify.redis) {
    await fastify.redis.setex(key, ttlSeconds, JSON.stringify(value))
  }
  return value
}

export default async function communityRoutes(fastify: FastifyInstance) {
  // =========================================
  // Community Stats / Listings (mock + CMS-ready)
  // =========================================

  const mockStats = {
    modelsShared: 12458,
    creators: 3241,
    downloads: 156789
  }

  const mockCreators = [
    { id: 'printmaster3d', handle: 'PrintMaster3D', bio: 'Functional parts specialist', models: 45, downloads: 1250, avatarUrl: null },
    { id: 'artfulmakes', handle: 'ArtfulMakes', bio: 'Decorative designs', models: 32, downloads: 980, avatarUrl: null },
    { id: 'mechdesigns', handle: 'MechDesigns', bio: 'Mechanical engineering', models: 28, downloads: 756, avatarUrl: null },
  ]

  const mockModels = [
    { id: 'phone-stand', title: 'Universal Phone Stand', author: 'PrintMaster3D', material: 'PLA', license: 'CC-BY', downloads: 1500, likes: 234, tags: ['stand', 'desk'], previewUrl: null },
    { id: 'dragon-articulation', title: 'Articulated Dragon', author: 'ArtfulMakes', material: 'PLA', license: 'CC-BY-SA', downloads: 890, likes: 189, tags: ['dragon', 'articulated'], previewUrl: null },
    { id: 'cable-clip', title: 'Cable Management Clip', author: 'MechDesigns', material: 'PETG', license: 'CC0', downloads: 2300, likes: 156, tags: ['clip', 'cable'], previewUrl: null },
    { id: 'headphone-hook', title: 'Headphone Hook', author: 'PrintMaster3D', material: 'PLA', license: 'CC-BY', downloads: 567, likes: 98, tags: ['hook', 'audio'], previewUrl: null },
    { id: 'planter', title: 'Succulent Planter', author: 'ArtfulMakes', material: 'PLA', license: 'CC-BY-NC', downloads: 432, likes: 145, tags: ['planter', 'decor'], previewUrl: null },
    { id: 'tool-organizer', title: 'Tool Organizer', author: 'MechDesigns', material: 'PETG', license: 'CC-BY', downloads: 321, likes: 87, tags: ['tool', 'shop'], previewUrl: null },
  ]

  async function loadStats(): Promise<typeof mockStats> {
    try {
      const data = await (fetchFromDirectus('community_stats')
        .catch(() => fetchFromSupabase('community_stats')))
      if (Array.isArray(data) && data.length) {
        const first = data[0] as any
        return {
          modelsShared: first.modelsShared ?? first.models ?? mockStats.modelsShared,
          creators: first.creators ?? mockStats.creators,
          downloads: first.downloads ?? mockStats.downloads
        }
      }
    } catch (err) {
      fastify.log.warn({ err }, 'community stats fallback to mock')
    }
    return mockStats
  }

  async function loadCreators(): Promise<typeof mockCreators> {
    try {
      const data = await (fetchFromDirectus('community_creators')
        .catch(() => fetchFromSupabase('community_creators')))
      if (Array.isArray(data) && data.length) {
        return data.map((c: any) => ({
          id: c.id ?? c.slug ?? c.handle,
          handle: c.handle ?? c.name,
          bio: c.bio ?? '',
          models: c.models ?? 0,
          downloads: c.downloads ?? 0,
          avatarUrl: c.avatarUrl ?? c.avatar_url ?? null
        }))
      }
    } catch (err) {
      fastify.log.warn({ err }, 'community creators fallback to mock')
    }
    return mockCreators
  }

  async function loadModels(): Promise<typeof mockModels> {
    try {
      const data = await (fetchFromDirectus('community_models')
        .catch(() => fetchFromSupabase('community_models')))
      if (Array.isArray(data) && data.length) {
        return data.map((m: any) => ({
          id: m.id ?? m.slug,
          title: m.title ?? m.name,
          author: m.author ?? m.creator ?? 'Unknown',
          material: m.material,
          license: m.license,
          downloads: m.downloads ?? 0,
          likes: m.likes ?? 0,
          tags: m.tags ?? [],
          previewUrl: m.previewUrl ?? m.thumbnail ?? null
        }))
      }
    } catch (err) {
      fastify.log.warn({ err }, 'community models fallback to mock')
    }
    return mockModels
  }

  fastify.get('/community/stats', async () => {
    const data = await getCached(fastify, 'community:stats', loadStats, 60)
    return { success: true, data }
  })

  fastify.get('/community/creators/featured', async () => {
    const data = await getCached(fastify, 'community:creators:featured', loadCreators, 60)
    return { success: true, data }
  })

  fastify.get('/community/models', async (request) => {
    const { q, material, license, sort = 'downloads', limit = 12 } = request.query as {
      q?: string
      material?: string
      license?: string
      sort?: 'downloads' | 'likes'
      limit?: number
    }

    let data = await getCached(fastify, 'community:models', loadModels, 60)

    if (q) {
      const term = q.toLowerCase()
      data = data.filter(
        m => m.title.toLowerCase().includes(term) || m.author.toLowerCase().includes(term) || m.tags?.some(t => t.toLowerCase().includes(term))
      )
    }
    if (material) data = data.filter(m => m.material?.toLowerCase() === material.toLowerCase())
    if (license) data = data.filter(m => m.license?.toLowerCase() === license.toLowerCase())

    data = data.sort((a, b) => (sort === 'likes' ? (b.likes ?? 0) - (a.likes ?? 0) : (b.downloads ?? 0) - (a.downloads ?? 0)))

    return { success: true, data: data.slice(0, Number(limit) || 12) }
  })

  fastify.get('/community/models/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = await getCached(fastify, 'community:models', loadModels, 60)
    const found = data.find(m => m.id === id)
    if (!found) return reply.status(404).send({ success: false, error: 'Not found' })
    return { success: true, data: found }
  })

  fastify.get('/community/creators', async () => {
    const data = await getCached(fastify, 'community:creators', loadCreators, 60)
    return { success: true, data }
  })

  // =========================================
  // VOTES (Thumbs Up Only)
  // =========================================
  
  // Add vote to profile
  fastify.post('/community/profiles/:id/vote', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const profileId = request.params.id
      
      // Check if profile exists and is public
      const profile = await fastify.pg.query(
        'SELECT id FROM generated_profiles WHERE id = $1 AND is_public = TRUE',
        [profileId]
      )
      
      if (profile.rows.length === 0) {
        return reply.status(404).send({ error: 'Profile not found' })
      }
      
      // Add vote (will fail if already voted due to unique constraint)
      await fastify.pg.query(`
        INSERT INTO votes (user_id, profile_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, profile_id) DO NOTHING
      `, [userId, profileId])
      
      // Get updated count
      const countResult = await fastify.pg.query(
        'SELECT COUNT(*) as count FROM votes WHERE profile_id = $1',
        [profileId]
      )
      
      return { success: true, voteCount: parseInt(countResult.rows[0].count) }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to add vote' })
    }
  })

  // Remove vote from profile
  fastify.delete('/community/profiles/:id/vote', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const profileId = request.params.id
      
      await fastify.pg.query(
        'DELETE FROM votes WHERE user_id = $1 AND profile_id = $2',
        [userId, profileId]
      )
      
      const countResult = await fastify.pg.query(
        'SELECT COUNT(*) as count FROM votes WHERE profile_id = $1',
        [profileId]
      )
      
      return { success: true, voteCount: parseInt(countResult.rows[0].count) }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to remove vote' })
    }
  })

  // Check if user voted
  fastify.get('/community/profiles/:id/voted', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const profileId = request.params.id
      
      const result = await fastify.pg.query(
        'SELECT id FROM votes WHERE user_id = $1 AND profile_id = $2',
        [userId, profileId]
      )
      
      return { voted: result.rows.length > 0 }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to check vote' })
    }
  })

  // =========================================
  // COMMENTS
  // =========================================
  
  // Get comments for a profile
  fastify.get('/community/profiles/:id/comments', async (request: any, reply) => {
    try {
      const profileId = request.params.id
      const { page = 1, limit = 20 } = request.query
      const offset = (page - 1) * limit
      
      const result = await fastify.pg.query(`
        SELECT 
          c.*,
          u.display_name as author_name,
          u.avatar_url as author_avatar,
          (SELECT COUNT(*) FROM votes WHERE comment_id = c.id) as vote_count
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.profile_id = $1 AND c.is_hidden = FALSE AND c.parent_id IS NULL
        ORDER BY c.vote_count DESC, c.created_at DESC
        LIMIT $2 OFFSET $3
      `, [profileId, limit, offset])
      
      // Get replies for each comment
      for (const comment of result.rows) {
        const replies = await fastify.pg.query(`
          SELECT 
            c.*,
            u.display_name as author_name,
            u.avatar_url as author_avatar
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.parent_id = $1 AND c.is_hidden = FALSE
          ORDER BY c.created_at ASC
          LIMIT 5
        `, [comment.id])
        comment.replies = replies.rows
      }
      
      const countResult = await fastify.pg.query(
        'SELECT COUNT(*) FROM comments WHERE profile_id = $1 AND is_hidden = FALSE AND parent_id IS NULL',
        [profileId]
      )
      
      return {
        comments: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch comments' })
    }
  })

  // Add comment
  fastify.post('/community/profiles/:id/comments', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const profileId = request.params.id
      const { content, parentId } = request.body as { content: string; parentId?: string }
      
      // Check if user is banned
      const user = await fastify.pg.query(
        'SELECT is_banned FROM users WHERE id = $1',
        [userId]
      )
      
      if (user.rows[0]?.is_banned) {
        return reply.status(403).send({ error: 'You are banned from commenting' })
      }
      
      // Validate content
      if (!content || content.trim().length < 2) {
        return reply.status(400).send({ error: 'Comment too short' })
      }
      
      if (content.length > 2000) {
        return reply.status(400).send({ error: 'Comment too long (max 2000 characters)' })
      }
      
      // Check if profile exists
      const profile = await fastify.pg.query(
        'SELECT id FROM generated_profiles WHERE id = $1 AND is_public = TRUE',
        [profileId]
      )
      
      if (profile.rows.length === 0) {
        return reply.status(404).send({ error: 'Profile not found' })
      }
      
      // Insert comment
      const result = await fastify.pg.query(`
        INSERT INTO comments (user_id, profile_id, parent_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [userId, profileId, parentId || null, content.trim()])
      
      // Get author info
      const author = await fastify.pg.query(
        'SELECT display_name, avatar_url FROM users WHERE id = $1',
        [userId]
      )
      
      return {
        comment: {
          ...result.rows[0],
          author_name: author.rows[0]?.display_name,
          author_avatar: author.rows[0]?.avatar_url,
          vote_count: 0
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to add comment' })
    }
  })

  // Edit comment
  fastify.put('/community/comments/:id', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const commentId = request.params.id
      const { content } = request.body as { content: string }
      
      // Check ownership
      const comment = await fastify.pg.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [commentId]
      )
      
      if (comment.rows.length === 0) {
        return reply.status(404).send({ error: 'Comment not found' })
      }
      
      if (comment.rows[0].user_id !== userId) {
        return reply.status(403).send({ error: 'Not authorized' })
      }
      
      await fastify.pg.query(`
        UPDATE comments SET
          content = $1,
          is_edited = TRUE,
          edited_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `, [content.trim(), commentId])
      
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to edit comment' })
    }
  })

  // Delete comment
  fastify.delete('/community/comments/:id', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const commentId = request.params.id
      
      // Check ownership or moderator
      const user = await fastify.pg.query(
        'SELECT is_moderator, is_admin FROM users WHERE id = $1',
        [userId]
      )
      
      const comment = await fastify.pg.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [commentId]
      )
      
      if (comment.rows.length === 0) {
        return reply.status(404).send({ error: 'Comment not found' })
      }
      
      const isOwner = comment.rows[0].user_id === userId
      const isMod = user.rows[0]?.is_moderator || user.rows[0]?.is_admin
      
      if (!isOwner && !isMod) {
        return reply.status(403).send({ error: 'Not authorized' })
      }
      
      await fastify.pg.query('DELETE FROM comments WHERE id = $1', [commentId])
      
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to delete comment' })
    }
  })

  // Vote on comment
  fastify.post('/community/comments/:id/vote', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const commentId = request.params.id
      
      await fastify.pg.query(`
        INSERT INTO votes (user_id, comment_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, comment_id) DO NOTHING
      `, [userId, commentId])
      
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to vote' })
    }
  })

  // =========================================
  // REPORTS & MODERATION
  // =========================================
  
  // Report content
  fastify.post('/community/report', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const { targetType, targetId, reason, description } = request.body as {
        targetType: 'profile' | 'model' | 'comment' | 'user'
        targetId: string
        reason: string
        description?: string
      }
      
      const validReasons = ['spam', 'inappropriate', 'copyright', 'harassment', 'other']
      if (!validReasons.includes(reason)) {
        return reply.status(400).send({ error: 'Invalid reason' })
      }
      
      const columns: Record<string, string> = {
        profile: 'profile_id',
        model: 'model_id',
        comment: 'comment_id',
        user: 'user_id'
      }
      
      const column = columns[targetType]
      if (!column) {
        return reply.status(400).send({ error: 'Invalid target type' })
      }
      
      await fastify.pg.query(`
        INSERT INTO moderation_reports (reporter_id, ${column}, reason, description)
        VALUES ($1, $2, $3, $4)
      `, [userId, targetId, reason, description || null])
      
      return { success: true, message: 'Report submitted. Thank you for helping keep our community safe.' }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to submit report' })
    }
  })

  // =========================================
  // MODERATION (Admin/Moderator Only)
  // =========================================
  
  // Get pending reports
  fastify.get('/moderation/reports', {
    preHandler: [fastify.authenticate, fastify.requireModerator]
  }, async (request: any, reply) => {
    try {
      const { status = 'pending', page = 1, limit = 20 } = request.query
      const offset = (page - 1) * limit
      
      const result = await fastify.pg.query(`
        SELECT 
          mr.*,
          u.display_name as reporter_name
        FROM moderation_reports mr
        LEFT JOIN users u ON mr.reporter_id = u.id
        WHERE mr.status = $1
        ORDER BY mr.created_at ASC
        LIMIT $2 OFFSET $3
      `, [status, limit, offset])
      
      const countResult = await fastify.pg.query(
        'SELECT COUNT(*) FROM moderation_reports WHERE status = $1',
        [status]
      )
      
      return {
        reports: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch reports' })
    }
  })

  // Resolve report
  fastify.post('/moderation/reports/:id/resolve', {
    preHandler: [fastify.authenticate, fastify.requireModerator]
  }, async (request: any, reply) => {
    try {
      const moderatorId = request.user.id
      const reportId = request.params.id
      const { action, notes } = request.body as { action: string; notes?: string }
      
      const validActions = ['none', 'warning', 'content_removed', 'user_banned']
      if (!validActions.includes(action)) {
        return reply.status(400).send({ error: 'Invalid action' })
      }
      
      // Get report details
      const report = await fastify.pg.query(
        'SELECT * FROM moderation_reports WHERE id = $1',
        [reportId]
      )
      
      if (report.rows.length === 0) {
        return reply.status(404).send({ error: 'Report not found' })
      }
      
      const r = report.rows[0]
      
      // Execute action
      if (action === 'content_removed') {
        if (r.comment_id) {
          await fastify.pg.query(
            'UPDATE comments SET is_hidden = TRUE, hidden_by = $1, hidden_at = NOW() WHERE id = $2',
            [moderatorId, r.comment_id]
          )
        }
        if (r.profile_id) {
          await fastify.pg.query(
            'UPDATE generated_profiles SET is_public = FALSE WHERE id = $1',
            [r.profile_id]
          )
        }
        if (r.model_id) {
          await fastify.pg.query(
            'UPDATE uploaded_models SET is_flagged = TRUE, is_approved = FALSE, moderated_by = $1, moderated_at = NOW() WHERE id = $2',
            [moderatorId, r.model_id]
          )
        }
      }
      
      if (action === 'user_banned' && r.user_id) {
        await fastify.pg.query(
          'UPDATE users SET is_banned = TRUE, ban_reason = $1 WHERE id = $2',
          [notes || 'Violation of community guidelines', r.user_id]
        )
      }
      
      // Update report
      await fastify.pg.query(`
        UPDATE moderation_reports SET
          status = 'resolved',
          resolved_by = $1,
          resolved_at = NOW(),
          resolution_notes = $2,
          action_taken = $3
        WHERE id = $4
      `, [moderatorId, notes, action, reportId])
      
      // Log action
      await fastify.pg.query(`
        INSERT INTO moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        moderatorId,
        action,
        r.comment_id ? 'comment' : r.profile_id ? 'profile' : r.model_id ? 'model' : 'user',
        r.comment_id || r.profile_id || r.model_id || r.user_id,
        notes,
        JSON.stringify({ report_id: reportId })
      ])
      
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to resolve report' })
    }
  })

  // Hide/unhide comment
  fastify.post('/moderation/comments/:id/toggle-visibility', {
    preHandler: [fastify.authenticate, fastify.requireModerator]
  }, async (request: any, reply) => {
    try {
      const moderatorId = request.user.id
      const commentId = request.params.id
      
      const comment = await fastify.pg.query(
        'SELECT is_hidden FROM comments WHERE id = $1',
        [commentId]
      )
      
      if (comment.rows.length === 0) {
        return reply.status(404).send({ error: 'Comment not found' })
      }
      
      const newState = !comment.rows[0].is_hidden
      
      await fastify.pg.query(`
        UPDATE comments SET
          is_hidden = $1,
          hidden_by = $2,
          hidden_at = $3
        WHERE id = $4
      `, [newState, newState ? moderatorId : null, newState ? new Date() : null, commentId])
      
      await fastify.pg.query(`
        INSERT INTO moderation_log (moderator_id, action, target_type, target_id)
        VALUES ($1, $2, 'comment', $3)
      `, [moderatorId, newState ? 'hide_comment' : 'unhide_comment', commentId])
      
      return { success: true, isHidden: newState }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to toggle visibility' })
    }
  })

  // Ban/unban user
  fastify.post('/moderation/users/:id/toggle-ban', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request: any, reply) => {
    try {
      const adminId = request.user.id
      const targetUserId = request.params.id
      const { reason } = request.body as { reason?: string }
      
      const user = await fastify.pg.query(
        'SELECT is_banned FROM users WHERE id = $1',
        [targetUserId]
      )
      
      if (user.rows.length === 0) {
        return reply.status(404).send({ error: 'User not found' })
      }
      
      const newState = !user.rows[0].is_banned
      
      await fastify.pg.query(`
        UPDATE users SET
          is_banned = $1,
          ban_reason = $2
        WHERE id = $3
      `, [newState, newState ? (reason || 'Banned by administrator') : null, targetUserId])
      
      await fastify.pg.query(`
        INSERT INTO moderation_log (moderator_id, action, target_type, target_id, reason)
        VALUES ($1, $2, 'user', $3, $4)
      `, [adminId, newState ? 'ban_user' : 'unban_user', targetUserId, reason])
      
      return { success: true, isBanned: newState }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to toggle ban' })
    }
  })
}


