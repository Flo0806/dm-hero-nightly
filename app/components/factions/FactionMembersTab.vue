<template>
  <div>
    <div class="text-h6 mb-4">
      {{ $t('factions.membersList') }}
    </div>

    <v-progress-linear v-if="loadingMembers" indeterminate />

    <v-list v-else-if="members.length > 0">
      <v-list-item v-for="member in members" :key="member.id" class="mb-2" border>
        <template #prepend>
          <v-icon icon="mdi-account" color="primary" />
        </template>
        <v-list-item-title>
          {{ member.name }}
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip size="small" class="mr-1">
            {{ member.relation_type }}
          </v-chip>
          <span v-if="member.notes?.rank" class="text-caption">
            {{ $t('factions.rank') }}: {{ member.notes.rank }}
          </span>
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="$emit('remove', member.id)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-empty-state
      v-else
      icon="mdi-account-group-outline"
      :title="$t('factions.noMembers')"
      :text="$t('factions.noMembersText')"
    />

    <v-divider class="my-4" />

    <div class="text-h6 mb-4">
      {{ $t('factions.addMember') }}
    </div>

    <v-select
      v-model="localNpcId"
      :items="npcs"
      item-title="name"
      item-value="id"
      :label="$t('factions.selectNpc')"
      variant="outlined"
      class="mb-3"
    />

    <v-combobox
      v-model="localMembershipType"
      :items="membershipTypeSuggestions"
      :label="$t('factions.membershipType')"
      :placeholder="$t('factions.membershipTypePlaceholder')"
      variant="outlined"
      class="mb-3"
    />

    <v-text-field
      v-model="localRank"
      :label="$t('factions.rank')"
      :placeholder="$t('factions.rankPlaceholder')"
      variant="outlined"
      class="mb-3"
    />

    <v-btn
      color="primary"
      prepend-icon="mdi-account-plus"
      :disabled="!localNpcId || !localMembershipType"
      :loading="adding"
      @click="handleAdd"
    >
      {{ $t('factions.addMember') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
interface FactionMember {
  id: number
  from_entity_id: number
  to_entity_id: number
  relation_type: string
  notes: Record<string, unknown> | null
  created_at: string
  name: string
  image_url?: string | null
  description?: string | null
  direction?: 'outgoing' | 'incoming'
}

interface NPC {
  id: number
  name: string
}

interface Props {
  members: FactionMember[]
  npcs: NPC[]
  loadingMembers: boolean
  adding: boolean
}

interface Emits {
  (e: 'add', payload: { npcId: number; membershipType: string; rank?: string }): void
  (e: 'remove', relationId: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

const localNpcId = ref<number | null>(null)
const localMembershipType = ref('')
const localRank = ref('')

const membershipTypeSuggestions = computed(() => [
  t('factions.membershipTypes.member'),
  t('factions.membershipTypes.leader'),
  t('factions.membershipTypes.founder'),
  t('factions.membershipTypes.officer'),
  t('factions.membershipTypes.recruit'),
  t('factions.membershipTypes.veteran'),
  t('factions.membershipTypes.exile'),
])

function handleAdd() {
  if (!localNpcId.value || !localMembershipType.value) return

  emit('add', {
    npcId: localNpcId.value,
    membershipType: localMembershipType.value,
    rank: localRank.value || undefined,
  })

  // Reset form
  localNpcId.value = null
  localMembershipType.value = ''
  localRank.value = ''
}
</script>
