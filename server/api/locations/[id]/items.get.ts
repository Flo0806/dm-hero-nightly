import { getDb } from '../../../utils/db'

interface DbItem {
  id: number
  from_entity_id: number
  to_entity_id: number
  relation_type: string
  notes: string | null
  created_at: string
  item_name: string
  item_description: string | null
  item_metadata: string | null
  direction: 'outgoing' | 'incoming'
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const locationId = getRouterParam(event, 'id')

  if (!locationId) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  // Get Items linked to this Location (bidirectional)
  // UNION: Items where Location is 'from' (outgoing) OR Location is 'to' (incoming)
  const items = db
    .prepare<unknown[], DbItem>(
      `
    SELECT
      er.id,
      er.from_entity_id,
      er.to_entity_id,
      er.relation_type,
      er.notes,
      er.created_at,
      e.name as item_name,
      e.description as item_description,
      e.metadata as item_metadata,
      'outgoing' as direction
    FROM entity_relations er
    INNER JOIN entities e ON er.to_entity_id = e.id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.from_entity_id = ?
      AND et.name = 'Item'
      AND e.deleted_at IS NULL

    UNION ALL

    SELECT
      er.id,
      er.from_entity_id,
      er.to_entity_id,
      er.relation_type,
      er.notes,
      er.created_at,
      e.name as item_name,
      e.description as item_description,
      e.metadata as item_metadata,
      'incoming' as direction
    FROM entity_relations er
    INNER JOIN entities e ON er.from_entity_id = e.id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.to_entity_id = ?
      AND et.name = 'Item'
      AND e.deleted_at IS NULL

    ORDER BY item_name ASC
  `,
    )
    .all(locationId, locationId)

  return items.map((item) => ({
    ...item,
    notes: item.notes ? JSON.parse(item.notes) : null,
    item_metadata: item.item_metadata ? JSON.parse(item.item_metadata) : null,
  }))
})
