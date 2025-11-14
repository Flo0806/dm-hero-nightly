import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const factionId = getRouterParam(event, 'id')

  if (!factionId) {
    throw createError({
      statusCode: 400,
      message: 'Faction ID is required',
    })
  }

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

  // Get Locations linked to this Faction (bidirectional)
  // UNION: Locations where Faction is 'from' (outgoing) OR Faction is 'to' (incoming)
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
    .all(factionId, factionId)

  return locations.map((location) => ({
    ...location,
    notes: location.notes ? JSON.parse(location.notes) : null,
  }))
})
