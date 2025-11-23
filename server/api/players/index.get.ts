import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const db = getDb()
  const query = getQuery(event)
  const campaignId = query.campaignId as string
  const searchQuery = query.search as string | undefined

  if (!campaignId) {
    throw createError({
      statusCode: 400,
      message: 'Campaign ID is required',
    })
  }

  // Get Player entity type ID
  const entityType = db.prepare('SELECT id FROM entity_types WHERE name = ?').get('Player') as
    | { id: number }
    | undefined

  if (!entityType) {
    return []
  }

  interface PlayerRow {
    id: number
    name: string
    description: string | null
    image_url: string | null
    metadata: string | null
    created_at: string
    updated_at: string
  }

  let players: PlayerRow[]

  if (searchQuery && searchQuery.trim().length > 0) {
    const searchTerm = searchQuery.trim().toLowerCase()

    players = db
      .prepare<unknown[], PlayerRow>(
        `
      SELECT e.id, e.name, e.description, e.metadata, e.created_at, e.updated_at,
             ei.image_url
      FROM entities e
      LEFT JOIN (
        SELECT entity_id, image_url
        FROM entity_images
        WHERE is_primary = 1
      ) ei ON ei.entity_id = e.id
      WHERE e.type_id = ?
        AND e.campaign_id = ?
        AND e.deleted_at IS NULL
        AND (
          LOWER(e.name) LIKE ?
          OR LOWER(e.description) LIKE ?
          OR LOWER(e.metadata) LIKE ?
        )
      ORDER BY e.name ASC
    `,
      )
      .all(entityType.id, campaignId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`)
  } else {
    players = db
      .prepare<unknown[], PlayerRow>(
        `
      SELECT e.id, e.name, e.description, e.metadata, e.created_at, e.updated_at,
             ei.image_url
      FROM entities e
      LEFT JOIN (
        SELECT entity_id, image_url
        FROM entity_images
        WHERE is_primary = 1
      ) ei ON ei.entity_id = e.id
      WHERE e.type_id = ?
        AND e.campaign_id = ?
        AND e.deleted_at IS NULL
      ORDER BY e.name ASC
    `,
      )
      .all(entityType.id, campaignId)
  }

  return players.map((player) => ({
    ...player,
    metadata: player.metadata ? JSON.parse(player.metadata) : null,
  }))
})
