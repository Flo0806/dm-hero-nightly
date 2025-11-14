<template>
  <div>
    <!-- NPC Relations List -->
    <v-list
      v-if="
        npcRelations.filter(
          (r) => (r.related_npc_type || r.to_entity_type) === 'NPC',
        ).length > 0
      "
      class="mb-3"
    >
      <v-list-item
        v-for="relation in npcRelations.filter(
          (r) => (r.related_npc_type || r.to_entity_type) === 'NPC',
        )"
        :key="relation.id"
        class="mb-2"
        border
      >
        <template #prepend>
          <v-icon icon="mdi-account" color="primary" />
        </template>
        <v-list-item-title>
          {{ relation.related_npc_name || relation.to_entity_name }}
          <v-chip v-if="relation.direction === 'incoming'" size="x-small" color="info" class="ml-2">
            ←
          </v-chip>
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip size="small" class="mr-1" color="primary" variant="tonal">
            {{ $t(`npcs.npcRelationTypes.${relation.relation_type}`, relation.relation_type) }}
          </v-chip>
          <span v-if="relation.notes" class="text-caption">
            {{ relation.notes }}
          </span>
        </v-list-item-subtitle>
        <template #append>
          <template v-if="relation.direction === 'outgoing'">
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              @click="$emit('edit', relation)"
            />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="$emit('remove', relation.id)"
            />
          </template>
          <v-tooltip v-else location="left">
            <template #activator="{ props }">
              <v-icon v-bind="props" color="info" size="small"> mdi-information </v-icon>
            </template>
            {{ $t('npcs.incomingRelationTooltip') }}
          </v-tooltip>
        </template>
      </v-list-item>
    </v-list>

    <!-- Add NPC Relation Form -->
    <v-expansion-panels class="mb-3">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon start> mdi-plus </v-icon>
          {{ $t('npcs.addNpcRelation') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-select
            v-model="localNpcId"
            :items="availableNpcs || []"
            item-title="name"
            item-value="id"
            :label="$t('npcs.selectNpc')"
            variant="outlined"
            class="mb-3"
          />

          <v-combobox
            v-model="localRelationType"
            :items="npcRelationTypeSuggestions"
            :label="$t('npcs.npcRelationType')"
            :placeholder="$t('npcs.npcRelationTypePlaceholder')"
            variant="outlined"
            class="mb-3"
          />

          <v-textarea
            v-model="localNotes"
            :label="$t('npcs.relationNotes')"
            :placeholder="$t('npcs.relationNotesPlaceholder')"
            variant="outlined"
            rows="2"
            class="mb-3"
          />

          <v-btn
            color="primary"
            prepend-icon="mdi-link"
            :disabled="!localNpcId || !localRelationType"
            :loading="adding"
            @click="handleAdd"
          >
            {{ $t('npcs.addNpcRelation') }}
          </v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface NpcRelation {
  id: number
  related_npc_name?: string | null
  to_entity_name?: string | null
  related_npc_type?: string | null
  to_entity_type?: string | null
  relation_type: string
  notes?: string | null
  direction?: 'incoming' | 'outgoing'
}

interface AvailableNpc {
  id: number
  name: string
}

interface Props {
  npcRelations: NpcRelation[]
  availableNpcs: AvailableNpc[]
  adding: boolean
}

interface Emits {
  (e: 'add', payload: { npcId: number; relationType: string; notes?: string }): void
  (e: 'edit' | 'remove', relation: NpcRelation | number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const localNpcId = ref<number | null>(null)
const localRelationType = ref('')
const localNotes = ref('')

const npcRelationTypeSuggestions = computed(() => [
  t('npcs.npcRelationTypes.ally'),
  t('npcs.npcRelationTypes.enemy'),
  t('npcs.npcRelationTypes.family'),
  t('npcs.npcRelationTypes.friend'),
  t('npcs.npcRelationTypes.rival'),
  t('npcs.npcRelationTypes.mentor'),
  t('npcs.npcRelationTypes.student'),
  t('npcs.npcRelationTypes.colleague'),
])

function handleAdd() {
  if (!localNpcId.value || !localRelationType.value) return

  emit('add', {
    npcId: localNpcId.value,
    relationType: localRelationType.value,
    notes: localNotes.value || undefined,
  })

  // Reset form
  localNpcId.value = null
  localRelationType.value = ''
  localNotes.value = ''
}
</script>
