import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const factionId = getRouterParam(event, 'id')

  if (!factionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faction ID is required',
    })
  }

  try {
    // Get Lore linked to this Faction (bidirectional)
    // UNION: Lore where Faction is 'to' (outgoing) OR Faction is 'from' (incoming)
    const linkedLore = db
      .prepare(`
        SELECT
          lore.id as id,
          lore.name as name,
          lore.description as description,
          lore.image_url as image_url,
          'outgoing' as direction
        FROM entity_relations er
        INNER JOIN entities lore ON lore.id = er.from_entity_id
        INNER JOIN entity_types lt ON lt.id = lore.type_id
        WHERE er.to_entity_id = ?
          AND lt.name = 'Lore'
          AND lore.deleted_at IS NULL

        UNION ALL

        SELECT
          lore.id as id,
          lore.name as name,
          lore.description as description,
          lore.image_url as image_url,
          'incoming' as direction
        FROM entity_relations er
        INNER JOIN entities lore ON lore.id = er.to_entity_id
        INNER JOIN entity_types lt ON lt.id = lore.type_id
        WHERE er.from_entity_id = ?
          AND lt.name = 'Lore'
          AND lore.deleted_at IS NULL

        ORDER BY name ASC
      `)
      .all(factionId, factionId)

    return linkedLore
  } catch (error) {
    console.error('Error fetching linked Lore:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch linked Lore',
    })
  }
})
