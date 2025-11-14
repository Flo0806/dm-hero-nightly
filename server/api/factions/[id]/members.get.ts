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

  interface DbMember {
    id: number
    from_entity_id: number
    to_entity_id: number
    relation_type: string
    notes: string | null
    created_at: string
    npc_name: string
    direction: 'outgoing' | 'incoming'
  }

  // Get NPCs linked to this Faction (bidirectional)
  // UNION: NPCs where Faction is 'to' (outgoing) OR Faction is 'from' (incoming)
  const members = db
    .prepare<unknown[], DbMember>(
      `
    SELECT
      er.id,
      er.from_entity_id,
      er.to_entity_id,
      er.relation_type,
      er.notes,
      er.created_at,
      e.name as npc_name,
      'outgoing' as direction
    FROM entity_relations er
    INNER JOIN entities e ON er.from_entity_id = e.id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.to_entity_id = ?
      AND et.name = 'NPC'
      AND e.deleted_at IS NULL

    UNION ALL

    SELECT
      er.id,
      er.from_entity_id,
      er.to_entity_id,
      er.relation_type,
      er.notes,
      er.created_at,
      e.name as npc_name,
      'incoming' as direction
    FROM entity_relations er
    INNER JOIN entities e ON er.to_entity_id = e.id
    INNER JOIN entity_types et ON e.type_id = et.id
    WHERE er.from_entity_id = ?
      AND et.name = 'NPC'
      AND e.deleted_at IS NULL

    ORDER BY npc_name ASC
  `,
    )
    .all(factionId, factionId)

  return members.map((member) => ({
    ...member,
    notes: member.notes ? JSON.parse(member.notes) : null,
  }))
})
