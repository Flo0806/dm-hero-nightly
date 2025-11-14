<template>
  <div>
    <div class="text-h6 mb-4">
      {{ $t('npcs.factionMemberships') }}
    </div>

    <v-list v-if="memberships.length > 0" class="mb-3">
      <v-list-item v-for="membership in memberships" :key="membership.id" class="mb-2" border>
        <template #prepend>
          <v-icon icon="mdi-shield-account" color="primary" />
        </template>
        <v-list-item-title>
          {{ membership.to_entity_name }}
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip size="small" class="mr-1">
            {{ membership.relation_type }}
          </v-chip>
          <span v-if="membership.notes?.rank" class="text-caption">
            {{ $t('npcs.rank') }}: {{ membership.notes.rank }}
          </span>
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="$emit('edit', membership)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="$emit('remove', membership.id)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-empty-state
      v-else
      icon="mdi-shield-account-outline"
      :title="$t('npcs.noMemberships')"
      :text="$t('npcs.noMembershipsText')"
    />

    <v-divider class="my-4" />

    <div class="text-h6 mb-4">
      {{ $t('npcs.addFactionMembership') }}
    </div>

    <v-select
      v-model="localFactionId"
      :items="factions"
      item-title="name"
      item-value="id"
      :label="$t('npcs.selectFaction')"
      variant="outlined"
      class="mb-3"
    />

    <v-combobox
      v-model="localRelationType"
      :items="membershipTypeSuggestions"
      :label="$t('npcs.membershipType')"
      :placeholder="$t('npcs.membershipTypePlaceholder')"
      variant="outlined"
      class="mb-3"
    />

    <v-text-field
      v-model="localRank"
      :label="$t('npcs.rank')"
      :placeholder="$t('npcs.rankPlaceholder')"
      variant="outlined"
      class="mb-3"
    />

    <v-btn
      color="primary"
      prepend-icon="mdi-link"
      block
      :disabled="!localFactionId || !localRelationType"
      :loading="adding"
      @click="handleAdd"
    >
      {{ $t('npcs.addFactionMembership') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
interface Membership {
  id: number
  to_entity_name: string
  relation_type: string
  notes?: {
    rank?: string
  } | null
}

interface Faction {
  id: number
  name: string
}

interface Props {
  memberships: Membership[]
  factions: Faction[]
  adding: boolean
}

interface Emits {
  (e: 'add', payload: { factionId: number; relationType: string; rank?: string }): void
  (e: 'edit', membership: Membership): void
  (e: 'remove', membershipId: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const localFactionId = ref<number | null>(null)
const localRelationType = ref('')
const localRank = ref('')

const membershipTypeSuggestions = [
  'Mitglied',
  'Anführer',
  'Stellvertreter',
  'Berater',
  'Rekrut',
  'Veteran',
]

function handleAdd() {
  if (!localFactionId.value || !localRelationType.value) return

  emit('add', {
    factionId: localFactionId.value,
    relationType: localRelationType.value,
    rank: localRank.value || undefined,
  })

  // Reset form
  localFactionId.value = null
  localRelationType.value = ''
  localRank.value = ''
}
</script>
