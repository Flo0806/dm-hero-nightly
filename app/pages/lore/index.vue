<template>
  <v-container>
    <UiPageHeader :title="$t('lore.title')" :subtitle="$t('lore.subtitle')">
      <template #actions>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="large"
          @click="showCreateDialog = true"
        >
          {{ $t('lore.create') }}
        </v-btn>
      </template>
    </UiPageHeader>

    <!-- Search Bar -->
    <v-text-field
      v-model="searchQuery"
      :placeholder="$t('common.search')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="mb-4"
    />

    <v-row v-if="pending">
      <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <!-- Lore Cards with Search Overlay -->
    <div v-else-if="filteredLore && filteredLore.length > 0" class="position-relative">
      <!-- Search Loading Overlay -->
      <v-overlay
        :model-value="searching"
        contained
        persistent
        class="align-center justify-center"
        scrim="surface"
        opacity="0.8"
      >
        <div class="text-center">
          <v-progress-circular indeterminate size="64" color="primary" class="mb-4" />
          <div class="text-h6">
            {{ $t('common.searching') }}
          </div>
        </div>
      </v-overlay>

      <!-- Lore Cards -->
      <v-row>
        <v-col v-for="loreEntry in filteredLore" :key="loreEntry.id" cols="12" md="6" lg="4">
          <LoreCard
            :lore="loreEntry"
            :is-highlighted="highlightedId === loreEntry.id"
            @view="viewLore"
            @edit="editLore"
            @download="(lore) => downloadImage(`/uploads/${lore.image_url}`, lore.name)"
            @delete="confirmDelete"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Empty State -->
    <v-card v-else>
      <v-card-text class="text-center pa-8">
        <v-icon icon="mdi-book-open-variant" size="64" color="grey" class="mb-4" />
        <div class="text-h6 mb-2">
          {{ $t('lore.empty') }}
        </div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          {{ $t('lore.emptyText') }}
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
          {{ $t('lore.create') }}
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="900" scrollable persistent>
      <v-card>
        <v-card-title>
          {{ editingLore ? $t('lore.edit') : $t('lore.create') }}
        </v-card-title>

        <v-tabs v-if="editingLore" v-model="loreDialogTab" class="mb-4">
          <v-tab value="details">
            <v-icon start> mdi-book-open-variant </v-icon>
            {{ $t('common.details') }}
          </v-tab>
          <v-tab value="images">
            <v-icon start> mdi-image-multiple </v-icon>
            {{ $t('common.images') }} ({{ editingLore._counts?.images ?? 0 }})
          </v-tab>
          <v-tab value="documents">
            <v-icon start> mdi-file-document </v-icon>
            {{ $t('documents.title') }} ({{ editingLore._counts?.documents ?? 0 }})
          </v-tab>
          <v-tab value="npcs">
            <v-icon start> mdi-account </v-icon>
            {{ $t('npcs.title') }} ({{ linkedNpcs.length }})
          </v-tab>
          <v-tab value="factions">
            <v-icon start> mdi-shield-account </v-icon>
            {{ $t('factions.title') }} ({{ linkedFactions.length }})
          </v-tab>
          <v-tab value="items">
            <v-icon start> mdi-treasure-chest </v-icon>
            {{ $t('items.title') }} ({{ linkedItems.length }})
          </v-tab>
          <v-tab value="locations">
            <v-icon start> mdi-map-marker </v-icon>
            {{ $t('locations.title') }} ({{ linkedLocations.length }})
          </v-tab>
          <v-tab value="players">
            <v-icon start> mdi-account-star </v-icon>
            {{ $t('players.title') }} ({{ editingLore._counts?.players ?? 0 }})
          </v-tab>
        </v-tabs>

        <v-card-text style="max-height: 600px">
          <v-tabs-window v-if="editingLore" v-model="loreDialogTab">
            <!-- Details Tab -->
            <v-tabs-window-item value="details">
              <v-form ref="formRef" @submit.prevent="saveLore">
                <v-text-field
                  v-model="formData.name"
                  :label="$t('lore.name')"
                  :rules="[(v: string) => !!v || $t('lore.nameRequired')]"
                  variant="outlined"
                  class="mb-4"
                />

                <v-select
                  v-model="formData.type"
                  :label="$t('lore.type')"
                  :placeholder="$t('lore.typePlaceholder')"
                  :items="loreTypeItems"
                  variant="outlined"
                  class="mb-4"
                />

                <v-text-field
                  v-model="formData.date"
                  :label="$t('lore.date')"
                  :placeholder="$t('lore.datePlaceholder')"
                  variant="outlined"
                  type="date"
                  class="mb-4"
                />

                <v-textarea
                  v-model="formData.description"
                  :label="$t('lore.description')"
                  variant="outlined"
                  rows="5"
                  auto-grow
                />
              </v-form>
            </v-tabs-window-item>

            <!-- Images Tab -->
            <v-tabs-window-item value="images">
              <EntityImageGallery
                v-if="editingLore"
                :entity-id="editingLore.id"
                entity-type="Lore"
                :entity-name="editingLore.name"
                :entity-description="editingLore.description || undefined"
                @preview-image="openImagePreview"
                @generating="(isGenerating: boolean) => (imageGenerating = isGenerating)"
                @images-updated="handleImagesUpdated"
              />
            </v-tabs-window-item>

            <!-- Documents Tab -->
            <v-tabs-window-item value="documents">
              <EntityDocuments
                v-if="editingLore"
                :entity-id="editingLore.id"
                entity-type="Lore"
                @changed="handleDocumentsChanged"
              />
            </v-tabs-window-item>

            <!-- NPCs Tab -->
            <v-tabs-window-item value="npcs">
              <div class="text-h6 mb-4">
                {{ $t('lore.linkedNpcs') }}
              </div>

              <v-list v-if="linkedNpcs.length > 0">
                <v-list-item v-for="npc in linkedNpcs" :key="npc.id" class="mb-2" border>
                  <template #prepend>
                    <v-avatar v-if="npc.image_url" size="40" rounded="lg">
                      <v-img :src="`/uploads/${npc.image_url}`" />
                    </v-avatar>
                    <v-icon v-else icon="mdi-account" color="primary" />
                  </template>
                  <v-list-item-title>
                    {{ npc.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="npc.description">
                    {{ npc.description.substring(0, 100) }}{{ npc.description.length > 100 ? '...' : '' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      v-if="npc.direction === 'outgoing' || !npc.direction"
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click="removeNpcRelation(npc.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <v-empty-state
                v-else
                icon="mdi-account-off"
                :title="$t('lore.noLinkedNpcs')"
                :text="$t('lore.noLinkedNpcsText')"
              />

              <v-divider class="my-4" />

              <div class="text-h6 mb-4">
                {{ $t('lore.addNpc') }}
              </div>

              <v-autocomplete
                v-model="selectedNpcToLink"
                :items="npcsForSelect"
                item-title="name"
                item-value="id"
                :label="$t('lore.selectNpc')"
                :placeholder="$t('lore.selectNpcPlaceholder')"
                variant="outlined"
                clearable
                class="mb-2"
              />

              <v-btn
                color="primary"
                block
                :disabled="!selectedNpcToLink"
                @click="addNpcRelation"
              >
                {{ $t('lore.linkNpc') }}
              </v-btn>
            </v-tabs-window-item>

            <!-- Factions Tab -->
            <v-tabs-window-item value="factions">
              <div class="text-h6 mb-4">
                {{ $t('lore.linkedFactions') }}
              </div>

              <v-list v-if="linkedFactions.length > 0">
                <v-list-item v-for="faction in linkedFactions" :key="faction.id" class="mb-2" border>
                  <template #prepend>
                    <v-avatar v-if="faction.image_url" size="40" rounded="lg">
                      <v-img :src="`/uploads/${faction.image_url}`" />
                    </v-avatar>
                    <v-icon v-else icon="mdi-shield-account" color="primary" />
                  </template>
                  <v-list-item-title>
                    {{ faction.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="faction.description">
                    {{ faction.description.substring(0, 100) }}{{ faction.description.length > 100 ? '...' : '' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click="removeFactionRelation(faction.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <v-empty-state
                v-else
                icon="mdi-shield-off"
                :title="$t('lore.noLinkedFactions')"
                :text="$t('lore.noLinkedFactionsText')"
              />

              <v-divider class="my-4" />

              <div class="text-h6 mb-4">
                {{ $t('lore.addFaction') }}
              </div>

              <v-autocomplete
                v-model="selectedFactionToLink"
                :items="factionsForSelect"
                item-title="name"
                item-value="id"
                :label="$t('lore.selectFaction')"
                :placeholder="$t('lore.selectFactionPlaceholder')"
                variant="outlined"
                clearable
                class="mb-2"
              />

              <v-btn
                color="primary"
                block
                :disabled="!selectedFactionToLink"
                @click="addFactionRelation"
              >
                {{ $t('lore.linkFaction') }}
              </v-btn>
            </v-tabs-window-item>

            <!-- Items Tab -->
            <v-tabs-window-item value="items">
              <!-- Link Items -->
              <v-autocomplete
                v-model="selectedItemToLink"
                :items="itemsForSelect"
                :label="$t('lore.selectItem')"
                variant="outlined"
                clearable
                class="mb-4"
              />
              <v-btn
                color="primary"
                block
                :disabled="!selectedItemToLink"
                @click="addItemRelation"
              >
                {{ $t('lore.linkItem') }}
              </v-btn>

              <!-- Linked Items List -->
              <v-list v-if="linkedItems.length > 0" class="mt-4">
                <v-list-item v-for="item in linkedItems" :key="item.id">
                  <template #prepend>
                    <v-avatar v-if="item.image_url" size="48" class="mr-3">
                      <v-img :src="`/uploads/${item.image_url}`" />
                    </v-avatar>
                    <v-avatar v-else size="48" class="mr-3" color="surface-variant">
                      <v-icon icon="mdi-treasure-chest" />
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ item.name }}</v-list-item-title>
                  <v-list-item-subtitle v-if="item.description">
                    {{ item.description.substring(0, 80)
                    }}{{ item.description.length > 80 ? '...' : '' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeItemRelation(item.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <v-empty-state
                v-else
                icon="mdi-treasure-chest"
                :title="$t('lore.noLinkedItems')"
                :text="$t('lore.noLinkedItemsText')"
                class="mt-4"
              />
            </v-tabs-window-item>

            <!-- Locations Tab -->
            <v-tabs-window-item value="locations">
              <!-- Link Locations -->
              <v-autocomplete
                v-model="selectedLocationToLink"
                :items="locationsForSelect"
                :label="$t('lore.selectLocation')"
                :placeholder="$t('lore.selectLocationPlaceholder')"
                variant="outlined"
                clearable
                class="mb-4"
              />
              <v-btn
                color="primary"
                block
                :disabled="!selectedLocationToLink"
                @click="addLocationRelation"
              >
                {{ $t('lore.linkLocation') }}
              </v-btn>

              <!-- Linked Locations List -->
              <v-list v-if="linkedLocations.length > 0" class="mt-4">
                <v-list-item v-for="location in linkedLocations" :key="location.id">
                  <template #prepend>
                    <v-avatar v-if="location.image_url" size="48" class="mr-3">
                      <v-img :src="`/uploads/${location.image_url}`" />
                    </v-avatar>
                    <v-avatar v-else size="48" class="mr-3" color="surface-variant">
                      <v-icon icon="mdi-map-marker" />
                    </v-avatar>
                  </template>
                  <v-list-item-title>
                    {{ location.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="location.description">
                    {{ location.description.substring(0, 80)
                    }}{{ location.description.length > 80 ? '...' : '' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      v-if="location.direction === 'outgoing' || !location.direction"
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeLocationRelation(location.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <v-empty-state
                v-else
                icon="mdi-map-marker"
                :title="$t('lore.noLinkedLocations')"
                :text="$t('lore.noLinkedLocationsText')"
                class="mt-4"
              />
            </v-tabs-window-item>

            <!-- Players Tab -->
            <v-tabs-window-item value="players">
              <EntityPlayersTab
                v-if="editingLore"
                :entity-id="editingLore.id"
                @changed="handlePlayersChanged"
              />
            </v-tabs-window-item>
          </v-tabs-window>

          <!-- Create Form (no tabs) -->
          <v-form v-else ref="formRef" @submit.prevent="saveLore">
            <v-text-field
              v-model="formData.name"
              :label="$t('lore.name')"
              :rules="[(v: string) => !!v || $t('lore.nameRequired')]"
              variant="outlined"
              class="mb-4"
            />

            <v-select
              v-model="formData.type"
              :label="$t('lore.type')"
              :placeholder="$t('lore.typePlaceholder')"
              :items="loreTypeItems"
              variant="outlined"
              class="mb-4"
            />

            <v-text-field
              v-model="formData.date"
              :label="$t('lore.date')"
              :placeholder="$t('lore.datePlaceholder')"
              variant="outlined"
              type="date"
              class="mb-4"
            />

            <v-textarea
              v-model="formData.description"
              :label="$t('lore.description')"
              variant="outlined"
              rows="5"
              auto-grow
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving || imageGenerating" @click="closeCreateDialog">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn color="primary" :loading="saving" :disabled="imageGenerating" @click="saveLore">
            {{ $t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Dialog -->
    <LoreViewDialog
      v-model="showViewDialog"
      :lore="selectedLore"
      :npcs="viewDialogNpcs"
      :items="viewDialogItems"
      :factions="viewDialogFactions"
      :locations="viewDialogLocations"
      :documents="viewDialogDocuments"
      :images="viewDialogImages"
      :counts="viewDialogCounts"
      :loading-npcs="loadingViewNpcs"
      :loading-items="loadingViewItems"
      :loading-factions="loadingViewFactions"
      :loading-locations="loadingViewLocations"
      @edit="editLore"
      @preview-image="(imageUrl: string, title: string) => { previewImageUrl = imageUrl; previewImageName = title; showImagePreview = true }"
    />

    <!-- Image Preview Dialog -->
    <ImagePreviewDialog
      v-model="showImagePreview"
      :image-url="previewImageUrl"
      :title="previewImageName"
    />
  </v-container>
</template>

<script setup lang="ts">
import type { Lore } from '../../../types/lore'
import { LORE_TYPES } from '../../../types/lore'
import LoreCard from '~/components/lore/LoreCard.vue'
import LoreViewDialog from '~/components/lore/LoreViewDialog.vue'
import EntityDocuments from '~/components/shared/EntityDocuments.vue'
import EntityImageGallery from '~/components/shared/EntityImageGallery.vue'
import EntityPlayersTab from '~/components/shared/EntityPlayersTab.vue'
import EntityRelationsList from '~/components/shared/EntityRelationsList.vue'
import ImagePreviewDialog from '~/components/shared/ImagePreviewDialog.vue'

// Composables
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const entitiesStore = useEntitiesStore()
const { downloadImage } = useImageDownload()
const { loadLoreCountsBatch, reloadLoreCounts } = useLoreCounts()

// Refs for search
const searchQuery = ref('')
const searchResults = ref<Lore[]>([])
const searching = ref(false)

// Get active campaign from store
const activeCampaignId = computed(() => campaignStore.activeCampaignId)

// Get lore from store
const lore = computed(() => entitiesStore.lore)

// Refs for dialogs and forms
const showCreateDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)
const editingLore = ref<Lore | null>(null)
const selectedLore = ref<Lore | null>(null)
const loreToDelete = ref<Lore | null>(null)
const formRef = ref()
const saving = ref(false)
const deleting = ref(false)
const highlightedId = ref<number | null>(null)
const loreDialogTab = ref('details')
const imageGenerating = ref(false)

// Factions state
const linkedFactions = ref<Array<{ id: number; name: string; description: string | null; image_url: string | null }>>([])
const selectedFactionToLink = ref<number | null>(null)

// NPCs linking
const linkedNpcs = ref<
  Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction?: 'outgoing' | 'incoming'
  }>
>([])
const selectedNpcToLink = ref<number | null>(null)

// Items linking
const linkedItems = ref<Array<{ id: number; name: string; description: string | null; image_url: string | null }>>([])
const selectedItemToLink = ref<number | null>(null)

// Locations linking
const linkedLocations = ref<
  Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction?: 'outgoing' | 'incoming'
  }>
>([])
const selectedLocationToLink = ref<number | null>(null)

// Image preview
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageName = ref('')

// View Dialog data (separate from EDIT dialog data)
const viewDialogNpcs = ref<Array<{ id: number; name: string; description: string | null; image_url: string | null }>>([])
const viewDialogItems = ref<Array<{ id: number; name: string; description: string | null; image_url: string | null }>>([])
const viewDialogFactions = ref<Array<{ id: number; name: string; description: string | null; image_url: string | null }>>([])
const viewDialogLocations = ref<Array<{ id: number; name: string; description: string | null; image_url: string | null }>>([])
const viewDialogDocuments = ref<Array<{ id: number; title: string; content: string }>>([])
const viewDialogImages = ref<Array<{ id: number; image_url: string; is_primary: boolean }>>([])
const viewDialogCounts = ref<{
  npcs: number
  items: number
  factions: number
  locations: number
  documents: number
  images: number
} | null>(null)
const loadingViewNpcs = ref(false)
const loadingViewItems = ref(false)
const loadingViewFactions = ref(false)
const loadingViewLocations = ref(false)

// Form data
const formData = ref({
  name: '',
  description: '',
  type: '',
  date: '',
})

// Computed for factions selection
const factionsForSelect = computed(() => {
  return (entitiesStore.factions || []).map((faction) => ({
    id: faction.id,
    name: faction.name,
  }))
})

// Computed for NPCs selection
const npcsForSelect = computed(() => {
  return (entitiesStore.npcs || []).map((npc) => ({
    id: npc.id,
    name: npc.name,
  }))
})

// Check for active campaign and handle highlighting
onMounted(async () => {
  // Load Lore, NPCs, Factions, Items, Locations and Players
  await Promise.all([
    entitiesStore.fetchLore(activeCampaignId.value!),
    entitiesStore.fetchNPCs(activeCampaignId.value!),
    entitiesStore.fetchFactions(activeCampaignId.value!),
    entitiesStore.fetchItems(activeCampaignId.value!),
    entitiesStore.fetchLocations(activeCampaignId.value!),
    entitiesStore.fetchPlayers(activeCampaignId.value!),
  ])

  // Load counts for all lore entries in background
  if (lore.value && lore.value.length > 0) {
    loadLoreCountsBatch(lore.value)
  }

  // Handle highlight query parameter
  const highlightParam = route.query.highlight
  const searchParam = route.query.search
  if (highlightParam && searchParam) {
    highlightedId.value = Number.parseInt(highlightParam as string, 10)
    searchQuery.value = searchParam as string

    // Scroll to highlighted card after a short delay
    nextTick(() => {
      setTimeout(() => {
        const element = document.getElementById(`lore-${highlightedId.value}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500)
    })
  }
})

// Loading state from store
const pending = computed(() => entitiesStore.loreLoading)

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, async (query) => {
  // Clear highlight when user manually searches
  if (highlightedId.value && query !== route.query.search) {
    highlightedId.value = null
    router.replace({ query: {} })
  }

  if (searchTimeout) clearTimeout(searchTimeout)

  if (!query || query.trim().length === 0) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const results = await $fetch<Lore[]>('/api/lore', {
        query: {
          campaignId: activeCampaignId.value,
          search: query.trim(),
        },
      })
      searchResults.value = results
    } finally {
      searching.value = false
    }
  }, 300)
})

// Computed filtered lore (search results OR cached data)
const filteredLore = computed(() => {
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    return searchResults.value
  }
  return lore.value || []
})

// Lore type items for dropdown
const loreTypeItems = computed(() => {
  return LORE_TYPES.map((type) => ({
    title: t(`lore.types.${type}`),
    value: type,
  }))
})

// Open image preview dialog
function openImagePreview(url: string, name: string) {
  previewImageUrl.value = url
  previewImageName.value = name
  showImagePreview.value = true
}

// View lore entry
async function viewLore(loreEntry: Lore) {
  selectedLore.value = loreEntry
  showViewDialog.value = true

  loadingViewNpcs.value = true
  loadingViewItems.value = true
  loadingViewFactions.value = true
  loadingViewLocations.value = true

  // Load all data in parallel
  try {
    const [npcs, items, factions, locations, documents, images, counts] = await Promise.all([
      $fetch<typeof viewDialogNpcs.value>(`/api/entities/${loreEntry.id}/related/npcs`).catch(() => []),
      $fetch<typeof viewDialogItems.value>(`/api/entities/${loreEntry.id}/related/items`).catch(() => []),
      $fetch<typeof viewDialogFactions.value>(`/api/entities/${loreEntry.id}/related/factions`).catch(() => []),
      $fetch<typeof viewDialogLocations.value>(`/api/entities/${loreEntry.id}/related/locations`).catch(() => []),
      $fetch<typeof viewDialogDocuments.value>(`/api/entities/${loreEntry.id}/documents`).catch(() => []),
      $fetch<typeof viewDialogImages.value>(`/api/entity-images/${loreEntry.id}`).catch(() => []),
      $fetch<typeof viewDialogCounts.value>(`/api/lore/${loreEntry.id}/counts`).catch(() => null),
    ])

    viewDialogNpcs.value = npcs
    viewDialogItems.value = items
    viewDialogFactions.value = factions
    viewDialogLocations.value = locations
    viewDialogDocuments.value = documents
    viewDialogImages.value = images
    viewDialogCounts.value = counts
  } catch (error) {
    console.error('Failed to load lore data:', error)
  } finally {
    loadingViewNpcs.value = false
    loadingViewItems.value = false
    loadingViewFactions.value = false
    loadingViewLocations.value = false
  }
}

// Edit lore entry
function editLore(loreEntry: Lore) {
  editingLore.value = loreEntry
  formData.value = {
    name: loreEntry.name,
    description: loreEntry.description || '',
    type: loreEntry.metadata?.type || '',
    date: loreEntry.metadata?.date || '',
  }
  showViewDialog.value = false
  showCreateDialog.value = true
}

// Close create/edit dialog
function closeCreateDialog() {
  showCreateDialog.value = false
  editingLore.value = null
  formData.value = {
    name: '',
    description: '',
    type: '',
    date: '',
  }
  formRef.value?.reset()
}

// Save lore entry (create or update)
async function saveLore() {
  const valid = await formRef.value?.validate()
  if (!valid?.valid) return

  saving.value = true
  try {
    const metadata: Record<string, string> = {}
    if (formData.value.type) metadata.type = formData.value.type
    if (formData.value.date) metadata.date = formData.value.date

    let loreId: number
    if (editingLore.value) {
      // Update existing lore
      await $fetch(`/api/lore/${editingLore.value.id}`, {
        method: 'PATCH',
        body: {
          name: formData.value.name,
          description: formData.value.description,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        },
      })
      loreId = editingLore.value.id
    } else {
      // Create new lore
      const newLore = await $fetch<Lore>('/api/lore', {
        method: 'POST',
        body: {
          name: formData.value.name,
          description: formData.value.description,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          campaignId: activeCampaignId.value,
        },
      })
      loreId = newLore.id
    }

    if (activeCampaignId.value!) {
      await entitiesStore.fetchLore(activeCampaignId.value, true)
    }

    // If user is searching, re-execute search to update FTS5 results
    if (searchQuery.value && searchQuery.value.trim().length > 0) {
      const results = await $fetch<Lore[]>('/api/lore', {
        query: {
          campaignId: activeCampaignId.value,
          search: searchQuery.value.trim(),
        },
      })
      searchResults.value = results
    }

    // Reload counts for the saved Lore (get from lore.value, not API response)
    const loreFromList = lore.value?.find((l) => l.id === loreId)
    if (loreFromList) {
      await reloadLoreCounts(loreFromList)
    }

    closeCreateDialog()
  } catch (error) {
    console.error('Failed to save lore:', error)
  } finally {
    saving.value = false
  }
}

// Confirm delete
function confirmDelete(loreEntry: Lore) {
  loreToDelete.value = loreEntry
  showDeleteDialog.value = true
}

// Delete lore entry
async function deleteLore() {
  if (!loreToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/lore/${loreToDelete.value.id}`, {
      method: 'DELETE',
    })

    if (activeCampaignId.value!) {
      await entitiesStore.fetchLore(activeCampaignId.value, true)
    }
    showDeleteDialog.value = false
    loreToDelete.value = null
  } catch (error) {
    console.error('Failed to delete lore:', error)
  } finally {
    deleting.value = false
  }
}

// Factions functions
async function loadLinkedFactions() {
  if (!editingLore.value) return
  try {
    const factions = await $fetch<
      Array<{ id: number; name: string; description: string | null; image_url: string | null }>
    >(`/api/entities/${editingLore.value.id}/related/factions`)
    linkedFactions.value = factions
  } catch (error) {
    console.error('Failed to load linked Factions:', error)
  }
}

async function addFactionRelation() {
  if (!editingLore.value || !selectedFactionToLink.value) return
  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: editingLore.value.id,
        toEntityId: selectedFactionToLink.value,
        relationType: 'bezieht sich auf',
        relationNotes: null,
      },
    })
    await loadLinkedFactions()
    selectedFactionToLink.value = null
  } catch (error) {
    console.error('Failed to add Faction relation:', error)
  }
}

async function removeFactionRelation(factionId: number) {
  if (!editingLore.value) return
  try {
    const relation = await $fetch<{ id: number } | null>('/api/entity-relations/find', {
      query: {
        fromEntityId: editingLore.value.id,
        toEntityId: factionId,
      },
    })
    if (relation) {
      await $fetch(`/api/entity-relations/${relation.id}`, {
        method: 'DELETE',
      })
      await loadLinkedFactions()
    }
  } catch (error) {
    console.error('Failed to remove Faction relation:', error)
  }
}

// NPCs functions
async function loadLinkedNpcs() {
  if (!editingLore.value) return
  try {
    const npcs = await $fetch<
      Array<{
        id: number
        name: string
        description: string | null
        image_url: string | null
        direction?: 'outgoing' | 'incoming'
      }>
    >(`/api/entities/${editingLore.value.id}/related/npcs`)
    linkedNpcs.value = npcs
  } catch (error) {
    console.error('Failed to load linked NPCs:', error)
  }
}

async function addNpcRelation() {
  if (!editingLore.value || !selectedNpcToLink.value) return
  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: selectedNpcToLink.value,
        toEntityId: editingLore.value.id,
        relationType: 'kennt',
        relationNotes: null,
      },
    })
    await loadLinkedNpcs()
    selectedNpcToLink.value = null
  } catch (error) {
    console.error('Failed to add NPC relation:', error)
  }
}

async function removeNpcRelation(npcId: number) {
  if (!editingLore.value) return
  try {
    const relation = await $fetch<{ id: number } | null>('/api/entity-relations/find', {
      query: {
        fromEntityId: npcId,
        toEntityId: editingLore.value.id,
      },
    })
    if (relation) {
      await $fetch(`/api/entity-relations/${relation.id}`, {
        method: 'DELETE',
      })
      await loadLinkedNpcs()
    }
  } catch (error) {
    console.error('Failed to remove NPC relation:', error)
  }
}

// Items for selection
const itemsForSelect = computed(() => {
  return entitiesStore.itemsForSelect.map((item: { id: number; name: string }) => ({
    title: item.name,
    value: item.id,
  }))
})

// Load linked Items
async function loadLinkedItems() {
  if (!editingLore.value) return
  try {
    const items = await $fetch<
      Array<{ id: number; name: string; description: string | null; image_url: string | null }>
    >(`/api/entities/${editingLore.value.id}/related/items`)
    linkedItems.value = items
  } catch (error) {
    console.error('Failed to load linked Items:', error)
  }
}

async function addItemRelation() {
  if (!editingLore.value || !selectedItemToLink.value) return
  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: selectedItemToLink.value,
        toEntityId: editingLore.value.id,
        relationType: 'bezieht sich auf',
        relationNotes: null,
      },
    })
    await loadLinkedItems()
    selectedItemToLink.value = null
  } catch (error) {
    console.error('Failed to add Item relation:', error)
  }
}

async function removeItemRelation(itemId: number) {
  if (!editingLore.value) return
  try {
    const relation = await $fetch<{ id: number } | null>('/api/entity-relations/find', {
      query: {
        from_entity_id: itemId,
        to_entity_id: editingLore.value.id,
      },
    })
    if (relation) {
      await $fetch(`/api/entity-relations/${relation.id}`, {
        method: 'DELETE',
      })
      await loadLinkedItems()
    }
  } catch (error) {
    console.error('Failed to remove Item relation:', error)
  }
}

// Locations for selection
const locationsForSelect = computed(() => {
  return (entitiesStore.locations || []).map((location) => ({
    title: location.name,
    value: location.id,
  }))
})

// Load linked Locations
async function loadLinkedLocations() {
  if (!editingLore.value) return
  try {
    const locations = await $fetch<
      Array<{
        id: number
        name: string
        description: string | null
        image_url: string | null
        direction?: 'outgoing' | 'incoming'
      }>
    >(`/api/entities/${editingLore.value.id}/related/locations`)
    linkedLocations.value = locations
  } catch (error) {
    console.error('Failed to load linked Locations:', error)
  }
}

async function addLocationRelation() {
  if (!editingLore.value || !selectedLocationToLink.value) return
  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: editingLore.value.id,
        toEntityId: selectedLocationToLink.value,
        relationType: 'bezieht sich auf',
        relationNotes: null,
      },
    })
    await loadLinkedLocations()

    // Reload counts to update the badge on the card
    if (editingLore.value) {
      await reloadLoreCounts(editingLore.value)
    }

    selectedLocationToLink.value = null
  } catch (error) {
    console.error('Failed to add Location relation:', error)
  }
}

async function removeLocationRelation(relationId: number) {
  if (!editingLore.value) return
  try {
    await $fetch(`/api/entity-relations/${relationId}`, {
      method: 'DELETE',
    })
    await loadLinkedLocations()

    // Reload counts to update the badge on the card
    if (editingLore.value) {
      await reloadLoreCounts(editingLore.value)
    }
  } catch (error) {
    console.error('Failed to remove Location relation:', error)
  }
}

// Handle images updated event (from EntityImageGallery)
async function handleImagesUpdated() {
  if (editingLore.value) {
    await reloadLoreCounts(editingLore.value)
  }
}

// Handle documents changed event (from EntityDocuments)
async function handleDocumentsChanged() {
  if (editingLore.value) {
    await reloadLoreCounts(editingLore.value)
  }
}

// Handle players changed event (from EntityPlayersTab)
async function handlePlayersChanged() {
  if (editingLore.value) {
    await reloadLoreCounts(editingLore.value)
  }
}

// Watch for editing lore to load linked factions, items and locations (MUST be after editingLore declaration!)
watch(
  () => editingLore.value?.id,
  async (loreId) => {
    if (loreId && editingLore.value) {
      await Promise.all([
        loadLinkedFactions(),
        loadLinkedNpcs(),
        loadLinkedItems(),
        loadLinkedLocations(),
        reloadLoreCounts(editingLore.value),
      ])
    }
  },
)

// Watch for tab changes to reload counts (user might have added/deleted images/documents)
watch(loreDialogTab, async () => {
  if (editingLore.value) {
    await reloadLoreCounts(editingLore.value)
  }
})
</script>

<style scoped>
.image-container {
  position: relative;
}

.image-download-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-container:hover .image-download-btn {
  opacity: 1;
}

.highlighted-card {
  animation: highlight-pulse 2s ease-in-out;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.5) !important;
}

@keyframes highlight-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.8);
  }
}
</style>
