<template>
  <v-dialog v-model="internalShow" max-width="900" scrollable>
    <v-card v-if="faction">
      <!-- Header with Avatar & Name -->
      <v-card-title class="d-flex align-center pa-4">
        <v-avatar :size="64" class="mr-4">
          <v-img v-if="faction.image_url" :src="`/uploads/${faction.image_url}`" cover />
          <v-icon v-else icon="mdi-shield-account" size="32" />
        </v-avatar>
        <div class="flex-grow-1">
          <h2 class="text-h5">{{ faction.name }}</h2>
          <div v-if="faction.leader_name" class="text-body-2 text-medium-emphasis">
            {{ $t('factions.leader') }}: {{ faction.leader_name }}
          </div>
        </div>
        <v-btn icon="mdi-pencil" variant="text" @click="$emit('edit', faction)">
          <v-icon>mdi-pencil</v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ $t('common.edit') }}
          </v-tooltip>
        </v-btn>
        <v-btn icon="mdi-close" variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Tabs -->
      <v-tabs v-model="activeTab" bg-color="surface">
        <v-tab value="overview">
          <v-icon start>mdi-information</v-icon>
          {{ $t('common.details') }}
        </v-tab>
        <v-tab value="members">
          <v-icon start>mdi-account-group</v-icon>
          {{ $t('factions.members') }}
          <v-chip v-if="counts" size="x-small" class="ml-2">{{ counts.members }}</v-chip>
        </v-tab>
        <v-tab value="items">
          <v-icon start>mdi-treasure-chest</v-icon>
          {{ $t('items.title') }}
          <v-chip v-if="counts" size="x-small" class="ml-2">{{ counts.items }}</v-chip>
        </v-tab>
        <v-tab value="locations">
          <v-icon start>mdi-map-marker</v-icon>
          {{ $t('locations.title') }}
          <v-chip v-if="counts" size="x-small" class="ml-2">{{ counts.locations }}</v-chip>
        </v-tab>
        <v-tab value="lore">
          <v-icon start>mdi-book-open-variant</v-icon>
          {{ $t('lore.title') }}
          <v-chip v-if="counts" size="x-small" class="ml-2">{{ counts.lore }}</v-chip>
        </v-tab>
        <v-tab value="documents">
          <v-icon start>mdi-file-document</v-icon>
          {{ $t('documents.title') }}
          <v-chip v-if="counts" size="x-small" class="ml-2">{{ counts.documents }}</v-chip>
        </v-tab>
        <v-tab value="gallery">
          <v-icon start>mdi-image</v-icon>
          {{ $t('common.images') }}
          <v-chip v-if="counts" size="x-small" class="ml-2">{{ counts.images }}</v-chip>
        </v-tab>
      </v-tabs>

      <v-divider />

      <!-- Tab Content -->
      <v-card-text style="max-height: 600px; overflow-y: auto">
        <v-window v-model="activeTab">
          <!-- Overview Tab -->
          <v-window-item value="overview">
            <div class="pa-4">
              <!-- Type & Alignment -->
              <div v-if="faction.metadata?.type || faction.metadata?.alignment" class="mb-4">
                <v-chip
                  v-if="faction.metadata?.type"
                  :prepend-icon="getTypeIcon(faction.metadata.type)"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="mr-2"
                >
                  {{ $t(`factions.types.${faction.metadata.type}`) }}
                </v-chip>
                <v-chip
                  v-if="faction.metadata?.alignment"
                  :prepend-icon="getAlignmentIcon(faction.metadata.alignment)"
                  :color="getAlignmentColor(faction.metadata.alignment)"
                  size="small"
                  variant="flat"
                >
                  {{ $t(`factions.alignments.${faction.metadata.alignment}`) }}
                </v-chip>
              </div>

              <!-- Description -->
              <div v-if="faction.description" class="mb-6">
                <h3 class="text-subtitle-1 font-weight-bold mb-2">
                  {{ $t('factions.description') }}
                </h3>
                <p class="text-body-2">{{ faction.description }}</p>
              </div>

              <!-- Metadata Grid -->
              <v-row dense>
                <v-col v-if="faction.metadata?.headquarters" cols="12" sm="6">
                  <v-card variant="outlined" class="pa-3">
                    <div class="d-flex align-center">
                      <v-icon class="mr-3" color="primary">mdi-home-city</v-icon>
                      <div>
                        <div class="text-caption text-medium-emphasis">
                          {{ $t('factions.headquarters') }}
                        </div>
                        <div class="font-weight-medium">{{ faction.metadata.headquarters }}</div>
                      </div>
                    </div>
                  </v-card>
                </v-col>
                <v-col v-if="faction.metadata?.goals" cols="12">
                  <v-card variant="outlined" class="pa-3">
                    <div class="d-flex align-start">
                      <v-icon class="mr-3 mt-1" color="secondary">mdi-target</v-icon>
                      <div>
                        <div class="text-caption text-medium-emphasis">
                          {{ $t('factions.goals') }}
                        </div>
                        <div class="font-weight-medium">{{ faction.metadata.goals }}</div>
                      </div>
                    </div>
                  </v-card>
                </v-col>
                <v-col v-if="faction.metadata?.notes" cols="12">
                  <v-card variant="outlined" class="pa-3">
                    <div class="d-flex align-start">
                      <v-icon class="mr-3 mt-1">mdi-note-text</v-icon>
                      <div>
                        <div class="text-caption text-medium-emphasis">
                          {{ $t('factions.notes') }}
                        </div>
                        <div class="font-weight-medium">{{ faction.metadata.notes }}</div>
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-window-item>

          <!-- Members Tab -->
          <v-window-item value="members">
            <div class="pa-4">
              <div v-if="loading" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else-if="members.length === 0" class="text-center py-8 text-medium-emphasis">
                {{ $t('factions.noMembers') }}
              </div>
              <v-list v-else lines="two">
                <v-list-item
                  v-for="member in members"
                  :key="member.id"
                  :prepend-avatar="
                    member.image_url ? `/uploads/${member.image_url}` : undefined
                  "
                >
                  <template #prepend>
                    <v-avatar v-if="member.image_url" size="48">
                      <v-img :src="`/uploads/${member.image_url}`" />
                    </v-avatar>
                    <v-avatar v-else color="grey-lighten-2" size="48">
                      <v-icon>mdi-account</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ member.name }}</v-list-item-title>
                  <v-list-item-subtitle v-if="member.description">
                    {{ member.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-window-item>

          <!-- Items Tab -->
          <v-window-item value="items">
            <div class="pa-4">
              <div v-if="loading" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else-if="items.length === 0" class="text-center py-8 text-medium-emphasis">
                {{ $t('factions.noItems') }}
              </div>
              <v-list v-else lines="two">
                <v-list-item
                  v-for="item in items"
                  :key="item.id"
                  :prepend-avatar="item.image_url ? `/uploads/${item.image_url}` : undefined"
                >
                  <template #prepend>
                    <v-avatar v-if="item.image_url" size="48">
                      <v-img :src="`/uploads/${item.image_url}`" />
                    </v-avatar>
                    <v-avatar v-else color="grey-lighten-2" size="48">
                      <v-icon>mdi-sword</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ item.name }}</v-list-item-title>
                  <v-list-item-subtitle v-if="item.description">
                    {{ item.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-window-item>

          <!-- Locations Tab -->
          <v-window-item value="locations">
            <div class="pa-4">
              <div v-if="loading" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else-if="locations.length === 0" class="text-center py-8 text-medium-emphasis">
                {{ $t('factions.noLocations') }}
              </div>
              <v-list v-else lines="two">
                <v-list-item
                  v-for="location in locations"
                  :key="location.id"
                  :prepend-avatar="
                    location.image_url ? `/uploads/${location.image_url}` : undefined
                  "
                >
                  <template #prepend>
                    <v-avatar v-if="location.image_url" size="48">
                      <v-img :src="`/uploads/${location.image_url}`" />
                    </v-avatar>
                    <v-avatar v-else color="grey-lighten-2" size="48">
                      <v-icon>mdi-map-marker</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{
                    location.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle v-if="location.description">
                    {{ location.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-window-item>

          <!-- Lore Tab -->
          <v-window-item value="lore">
            <div class="pa-4">
              <div v-if="loading" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else-if="loreEntries.length === 0" class="text-center py-8 text-medium-emphasis">
                {{ $t('factions.noLore') }}
              </div>
              <v-list v-else lines="two">
                <v-list-item
                  v-for="lore in loreEntries"
                  :key="lore.id"
                  :prepend-avatar="lore.image_url ? `/uploads/${lore.image_url}` : undefined"
                >
                  <template #prepend>
                    <v-avatar v-if="lore.image_url" size="48">
                      <v-img :src="`/uploads/${lore.image_url}`" />
                    </v-avatar>
                    <v-avatar v-else color="grey-lighten-2" size="48">
                      <v-icon>mdi-book-open-variant</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ lore.name }}</v-list-item-title>
                  <v-list-item-subtitle v-if="lore.description">
                    {{ lore.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-window-item>

          <!-- Documents Tab -->
          <v-window-item value="documents">
            <div class="pa-4">
              <EntityDocuments v-if="faction" :entity-id="faction.id" entity-type="Faction" />
            </div>
          </v-window-item>

          <!-- Gallery Tab -->
          <v-window-item value="gallery">
            <div class="pa-4">
              <EntityImageGallery
                v-if="faction"
                :entity-id="faction.id"
                entity-type="Faction"
                @preview-image="(imageUrl, title) => emit('preview-image', imageUrl, title)"
              />
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-pencil" @click="$emit('edit', faction)">
          {{ $t('common.edit') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="close">
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import EntityDocuments from '~/components/shared/EntityDocuments.vue'
import EntityImageGallery from '~/components/shared/EntityImageGallery.vue'

interface Faction {
  id: number
  name: string
  description: string | null
  image_url?: string | null
  leader_name?: string | null
  metadata: {
    type?: string
    alignment?: string
    headquarters?: string
    goals?: string
    notes?: string
  } | null
  created_at: string
  updated_at: string
  _counts?: {
    members: number
    items: number
    locations: number
    lore: number
    documents: number
    images: number
  }
}

interface Props {
  modelValue: boolean
  faction: Faction | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  edit: [faction: Faction]
  'preview-image': [imageUrl: string, title: string]
}>()

const { t } = useI18n()

const internalShow = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const activeTab = ref('overview')
const loading = ref(false)
const counts = ref<Faction['_counts'] | null>(null)

// Data refs
const members = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])
const items = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])
const locations = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])
const loreEntries = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])

// Load data when faction changes
watch(
  () => props.faction?.id,
  async (newFactionId) => {
    if (newFactionId) {
      loading.value = true
      try {
        const [countsData, membersData, itemsData, locationsData, loreData] = await Promise.all([
          $fetch<Faction['_counts']>(`/api/factions/${newFactionId}/counts`),
          $fetch<typeof members.value>(`/api/factions/${newFactionId}/members`).catch(() => []),
          $fetch<typeof items.value>(`/api/factions/${newFactionId}/items`).catch(() => []),
          $fetch<typeof locations.value>(`/api/factions/${newFactionId}/locations`).catch(
            () => [],
          ),
          $fetch<typeof loreEntries.value>(`/api/factions/${newFactionId}/lore`).catch(() => []),
        ])

        counts.value = countsData
        members.value = membersData
        items.value = itemsData
        locations.value = locationsData
        loreEntries.value = loreData
      } catch (error) {
        console.error('Failed to load faction data:', error)
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
  // Reset tab when closing
  activeTab.value = 'overview'
}

// Helper functions for icons and colors
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    guild: 'mdi-hammer-wrench',
    government: 'mdi-bank',
    military: 'mdi-sword-cross',
    criminal: 'mdi-skull',
    religious: 'mdi-church',
    merchant: 'mdi-cart',
    arcane: 'mdi-wizard-hat',
    secret: 'mdi-eye-off',
    mercenary: 'mdi-sword',
    noble: 'mdi-crown',
  }
  return icons[type] || 'mdi-shield-account'
}

function getAlignmentIcon(alignment: string): string {
  const icons: Record<string, string> = {
    lawful_good: 'mdi-shield-check',
    neutral_good: 'mdi-heart',
    chaotic_good: 'mdi-hand-heart',
    lawful_neutral: 'mdi-scale-balance',
    true_neutral: 'mdi-minus-circle',
    chaotic_neutral: 'mdi-dice-multiple',
    lawful_evil: 'mdi-gavel',
    neutral_evil: 'mdi-skull',
    chaotic_evil: 'mdi-fire',
  }
  return icons[alignment] || 'mdi-help'
}

function getAlignmentColor(alignment: string): string {
  const colors: Record<string, string> = {
    lawful_good: 'blue',
    neutral_good: 'green',
    chaotic_good: 'cyan',
    lawful_neutral: 'grey',
    true_neutral: 'grey-darken-2',
    chaotic_neutral: 'orange',
    lawful_evil: 'red-darken-2',
    neutral_evil: 'red',
    chaotic_evil: 'red-darken-4',
  }
  return colors[alignment] || 'grey'
}
</script>
