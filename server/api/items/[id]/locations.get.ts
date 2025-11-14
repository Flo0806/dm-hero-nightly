import { getDb } from '../../../utils/db'

interface DbLocation {
  id: number
  from_entity_id: number
  to_entity_id: number
  relation_type: string
  notes: string | null
  created_at: string
  location_name: string
  direction: 'outgoing' | 'incoming'
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const itemId = getRouterParam(event, 'id')

  if (!itemId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required',
    })
  }

  // Get Locations linked to this Item (bidirectional)
  // UNION: Locations where Item is 'from' (outgoing) OR Item is 'to' (incoming)
  const locations = db
    .prepare<unknown[], DbLocation>(
      `
    SELECT
      er.id,
      er.from_entity_id,
      er.to_entity_id,
      er.relation_type,
      er.notes,
      er.created_at,
      e.name as location_name,
      'outgoing' as direction
    FROM entity_relations er
    INNER JOIN entities e ON er.to_entity_id = e.id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.from_entity_id = ?
      AND et.name = 'Location'
      AND e.deleted_at IS NULL

    UNION ALL

    SELECT
      er.id,
      er.from_entity_id,
      er.to_entity_id,
      er.relation_type,
      er.notes,
      er.created_at,
      e.name as location_name,
      'incoming' as direction
    FROM entity_relations er
    INNER JOIN entities e ON er.from_entity_id = e.id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.to_entity_id = ?
      AND et.name = 'Location'
      AND e.deleted_at IS NULL

    ORDER BY location_name ASC
  `,
    )
    .all(itemId, itemId)

  return locations.map((location) => ({
    ...location,
    notes: location.notes ? JSON.parse(location.notes) : null,
  }))
})
