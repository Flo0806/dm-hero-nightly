<template>
  <div>
    <!-- Locations List -->
    <v-list
      v-if="
        locationRelations.filter((r) => r.to_entity_type === 'Location').length > 0
      "
      class="mb-3"
    >
      <v-list-item
        v-for="relation in locationRelations.filter(
          (r) => r.to_entity_type === 'Location',
        )"
        :key="relation.id"
        class="mb-2"
        border
      >
        <template #prepend>
          <v-icon icon="mdi-map-marker" color="primary" />
        </template>
        <v-list-item-title>
          {{ relation.to_entity_name }}
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip size="small" class="mr-1">
            {{ relation.relation_type }}
          </v-chip>
          <span v-if="relation.notes" class="text-caption">
            {{ relation.notes }}
          </span>
        </v-list-item-subtitle>
        <template #append>
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
      </v-list-item>
    </v-list>

    <!-- Add Location Relation Form -->
    <v-expansion-panels class="mb-3">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon start> mdi-plus </v-icon>
          {{ $t('npcs.addLocationLink') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-select
            v-model="localLocationId"
            :items="availableLocations || []"
            item-title="name"
            item-value="id"
            :label="$t('npcs.selectLocation')"
            variant="outlined"
            class="mb-3"
          />

          <v-combobox
            v-model="localRelationType"
            :items="relationTypeSuggestions"
            :label="$t('npcs.relationType')"
            :placeholder="$t('npcs.relationTypePlaceholder')"
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
            :disabled="!localLocationId || !localRelationType"
            :loading="adding"
            @click="handleAdd"
          >
            {{ $t('npcs.addLocationLink') }}
          </v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface LocationRelation {
  id: number
  to_entity_name: string
  to_entity_type: string
  relation_type: string
  notes?: string | null
}

interface AvailableLocation {
  id: number
  name: string
}

interface Props {
  locationRelations: LocationRelation[]
  availableLocations: AvailableLocation[]
  adding: boolean
}

interface Emits {
  (e: 'add', payload: { locationId: number; relationType: string; notes?: string }): void
  (e: 'edit' | 'remove', relation: LocationRelation | number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const localLocationId = ref<number | null>(null)
const localRelationType = ref('')
const localNotes = ref('')

const relationTypeSuggestions = computed(() => [
  t('npcs.relationTypes.livesIn'),
  t('npcs.relationTypes.worksAt'),
  t('npcs.relationTypes.visitsOften'),
  t('npcs.relationTypes.bornIn'),
  t('npcs.relationTypes.hidesIn'),
  t('npcs.relationTypes.owns'),
  t('npcs.relationTypes.searchesFor'),
  t('npcs.relationTypes.banishedFrom'),
])

function handleAdd() {
  if (!localLocationId.value || !localRelationType.value) return

  emit('add', {
    locationId: localLocationId.value,
    relationType: localRelationType.value,
    notes: localNotes.value || undefined,
  })

  // Reset form
  localLocationId.value = null
  localRelationType.value = ''
  localNotes.value = ''
}
</script>
