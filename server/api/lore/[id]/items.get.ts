import { getDb } from '../../../utils/db'

export default defineEventHandler((event) => {
  const db = getDb()
  const loreId = getRouterParam(event, 'id')

  if (!loreId) {
    throw createError({
      statusCode: 400,
      message: 'Lore ID is required',
    })
  }

  // Get Item entity type ID
  const itemType = db.prepare('SELECT id FROM entity_types WHERE name = ?').get('Item') as
    | { id: number }
    | undefined

  if (!itemType) {
    return []
  }

  interface ItemRow {
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction: 'outgoing' | 'incoming'
  }

  // Get Items linked to this Lore entry (bidirectional)
  // UNION: Items where Lore is 'from' (outgoing) OR Lore is 'to' (incoming)
  const items = db
    .prepare<unknown[], ItemRow>(
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
    .all(loreId, itemType.id, loreId, itemType.id)

  return items
})
