import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const locationId = getRouterParam(event, 'id')

  if (!locationId) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  // Get NPCs linked to this location (bidirectional)
  // UNION: NPCs where Location is 'to' (outgoing) OR Location is 'from' (incoming)
  const npcs = db
    .prepare(
      `
    SELECT
      e.*,
      er.relation_type,
      er.notes as relation_notes,
      'outgoing' as direction
    FROM entities e
    INNER JOIN entity_relations er ON e.id = er.from_entity_id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.to_entity_id = ?
      AND et.name = 'NPC'
      AND e.deleted_at IS NULL

    UNION ALL

    SELECT
      e.*,
      er.relation_type,
      er.notes as relation_notes,
      'incoming' as direction
    FROM entities e
    INNER JOIN entity_relations er ON e.id = er.to_entity_id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.from_entity_id = ?
      AND et.name = 'NPC'
      AND e.deleted_at IS NULL

    ORDER BY name ASC
  `,
    )
    .all(locationId, locationId) as Array<{
    metadata?: string | null
    direction: 'outgoing' | 'incoming'
    [key: string]: unknown
  }>

  return npcs.map((npc) => ({
    ...npc,
    metadata: npc.metadata ? JSON.parse(npc.metadata) : null,
  }))
})
