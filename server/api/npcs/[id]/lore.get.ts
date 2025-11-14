import { getDb } from '../../../utils/db'

export default defineEventHandler((event) => {
  const db = getDb()
  const npcId = getRouterParam(event, 'id')

  if (!npcId) {
    throw createError({
      statusCode: 400,
      message: 'NPC ID is required',
    })
  }

  // Get Lore entity type ID
  const loreType = db.prepare('SELECT id FROM entity_types WHERE name = ?').get('Lore') as
    | { id: number }
    | undefined

  if (!loreType) {
    return []
  }

  interface LoreRow {
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction: 'outgoing' | 'incoming'
  }

  // Get Lore entries linked to this NPC (bidirectional)
  // UNION: Lore where NPC is 'from' (outgoing) OR NPC is 'to' (incoming)
  const loreEntries = db
    .prepare<unknown[], LoreRow>(
      `
    SELECT DISTINCT
      e.id as id,
      e.name as name,
      e.description as description,
      ei.image_url as image_url,
      'outgoing' as direction
    FROM entity_relations er
    INNER JOIN entities e ON e.id = er.to_entity_id
    LEFT JOIN (
      SELECT entity_id, image_url
      FROM entity_images
      WHERE is_primary = 1
    ) ei ON ei.entity_id = e.id
    WHERE er.from_entity_id = ?
      AND e.type_id = ?
      AND e.deleted_at IS NULL

    UNION ALL

    SELECT DISTINCT
      e.id as id,
      e.name as name,
      e.description as description,
      ei.image_url as image_url,
      'incoming' as direction
    FROM entity_relations er
    INNER JOIN entities e ON e.id = er.from_entity_id
    LEFT JOIN (
      SELECT entity_id, image_url
      FROM entity_images
      WHERE is_primary = 1
    ) ei ON ei.entity_id = e.id
    WHERE er.to_entity_id = ?
      AND e.type_id = ?
      AND e.deleted_at IS NULL

    ORDER BY name ASC
  `,
    )
    .all(npcId, loreType.id, npcId, loreType.id)

  return loreEntries
})
