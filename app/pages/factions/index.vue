<template>
  <v-container>
    <UiPageHeader :title="$t('factions.title')" :subtitle="$t('factions.subtitle')">
      <template #actions>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="large"
          @click="showCreateDialog = true"
        >
          {{ $t('factions.create') }}
        </v-btn>
      </template>
    </UiPageHeader>

    <!-- Search Bar -->
    <v-text-field
      v-model="searchQuery"
      :placeholder="$t('common.search')"
      prepend-inner-icon="mdi-magnify"
      :loading="searching"
      variant="outlined"
      clearable
      class="mb-4"
    />

    <v-row v-if="pending">
      <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <!-- Faction Cards with Search Overlay -->
    <div v-else-if="filteredFactions && filteredFactions.length > 0" class="position-relative">
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

      <!-- Faction Cards -->
      <v-row>
        <v-col v-for="faction in filteredFactions" :key="faction.id" cols="12" md="6" lg="4">
          <FactionCard
            :faction="faction"
            :is-highlighted="highlightedId === faction.id"
            @view="viewFaction"
            @edit="editFaction"
            @download="(f) => downloadImage(`/uploads/${f.image_url}`, f.name)"
            @delete="deleteFaction"
          />
        </v-col>
      </v-row>
    </div>

    <ClientOnly v-else>
      <v-empty-state
        icon="mdi-shield-account-outline"
        :title="$t('factions.empty')"
        :text="$t('factions.emptyText')"
      >
        <template #actions>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
            {{ $t('factions.create') }}
          </v-btn>
        </template>
      </v-empty-state>
      <template #fallback>
        <v-container class="text-center py-16">
          <v-icon icon="mdi-shield-account-outline" size="64" color="grey" class="mb-4" />
          <h2 class="text-h5 mb-2">{{ $t('factions.empty') }}</h2>
          <p class="text-body-1 text-medium-emphasis mb-4">{{ $t('factions.emptyText') }}</p>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
            {{ $t('factions.create') }}
          </v-btn>
        </v-container>
      </template>
    </ClientOnly>

    <!-- Create/Edit Dialog -->
    <v-dialog
      v-model="showCreateDialog"
      max-width="800"
      :persistent="saving || uploadingImage || generatingImage"
    >
      <v-card>
        <v-card-title>
          {{ editingFaction ? $t('factions.edit') : $t('factions.create') }}
        </v-card-title>

        <!-- Tabs (only in edit mode) -->
        <v-tabs v-if="editingFaction" v-model="factionDialogTab" class="mb-4">
          <v-tab value="details">
            <v-icon start> mdi-shield-account </v-icon>
            {{ $t('common.details') }}
          </v-tab>
          <v-tab value="images">
            <v-icon start> mdi-image-multiple </v-icon>
            {{ $t('common.images') }} ({{ editingFaction._counts?.images ?? 0 }})
          </v-tab>
          <v-tab value="documents">
            <v-icon start> mdi-file-document </v-icon>
            {{ $t('documents.title') }} ({{ editingFaction._counts?.documents ?? 0 }})
          </v-tab>
          <v-tab value="members">
            <v-icon start> mdi-account-group </v-icon>
            {{ $t('factions.members') }} ({{ editingFaction._counts?.members ?? 0 }})
          </v-tab>
          <v-tab value="items">
            <v-icon start> mdi-treasure-chest </v-icon>
            {{ $t('common.items') }} ({{ editingFaction._counts?.items ?? 0 }})
          </v-tab>
          <v-tab value="locations">
            <v-icon start> mdi-map-marker </v-icon>
            {{ $t('common.locations') }} ({{ editingFaction._counts?.locations ?? 0 }})
          </v-tab>
          <v-tab value="lore">
            <v-icon start> mdi-book-open-variant </v-icon>
            {{ $t('common.lore') }} ({{ editingFaction._counts?.lore ?? 0 }})
          </v-tab>
        </v-tabs>

        <v-card-text>
          <v-tabs-window v-if="editingFaction" v-model="factionDialogTab">
            <!-- Details Tab -->
            <v-tabs-window-item value="details">
              <FactionDetailsForm
                v-model="factionForm"
                :npcs="npcs || []"
                :is-edit-mode="true"
                :image-url="editingFaction.image_url"
                :uploading-image="uploadingImage"
                :generating-image="generatingImage"
                :deleting-image="deletingImage"
                :has-api-key="hasApiKey"
                @preview-image="openImagePreview"
                @upload-click="triggerImageUpload"
                @generate-image="generateImage"
                @download-image="() => downloadImage(`/uploads/${editingFaction?.image_url}`, factionForm.name)"
                @delete-image="deleteImage"
              />
              <input
                ref="fileInputRef"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                style="display: none"
                @change="handleImageUpload"
              />
            </v-tabs-window-item>

            <!-- Images Tab -->
            <v-tabs-window-item value="images">
              <EntityImageGallery
                v-if="editingFaction"
                :entity-id="editingFaction.id"
                entity-type="Faction"
                :entity-name="editingFaction.name"
                :entity-description="editingFaction.description || undefined"
                @preview-image="openImagePreview"
                @generating="(isGenerating) => (imageGenerating = isGenerating)"
                @images-updated="handleImagesUpdated"
              />
            </v-tabs-window-item>

            <!-- Documents Tab -->
            <v-tabs-window-item value="documents">
              <EntityDocuments
                v-if="editingFaction"
                :entity-id="editingFaction.id"
                entity-type="Faction"
                @changed="handleDocumentsChanged"
              />
            </v-tabs-window-item>

            <!-- Members Tab -->
            <v-tabs-window-item value="members">
              <FactionMembersTab
                :members="factionMembers"
                :npcs="npcs || []"
                :loading-members="loadingMembers"
                :adding="addingMember"
                @add="addNpcMember"
                @remove="removeMember"
              />
            </v-tabs-window-item>

            <!-- Items Tab -->
            <v-tabs-window-item value="items">
              <FactionItemsTab
                :items="linkedItems"
                :available-items="itemsForSelect"
                @add="addItemRelation"
                @remove="removeItemRelation"
              />
            </v-tabs-window-item>

            <!-- Locations Tab -->
            <v-tabs-window-item value="locations">
              <FactionLocationsTab
                :locations="factionLocations"
                :available-locations="locations || []"
                :loading-locations="loadingLocations"
                :adding="addingLocation"
                @add="addLocationLink"
                @remove="removeLocation"
              />
            </v-tabs-window-item>

            <!-- Lore Tab -->
            <v-tabs-window-item value="lore">
              <FactionLoreTab
                :lore="linkedLore"
                :available-lore="loreForSelect"
                @add="addLoreRelation"
                @remove="removeLoreRelation"
              />
            </v-tabs-window-item>
          </v-tabs-window>

          <!-- Form when creating (no tabs) -->
          <FactionDetailsForm
            v-if="!editingFaction"
            v-model="factionForm"
            :npcs="npcs || []"
            :is-edit-mode="false"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="saving || uploadingImage || generatingImage"
            @click="closeDialog"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="uploadingImage || generatingImage"
            @click="saveFaction"
          >
            {{ editingFaction ? $t('common.save') : $t('common.create') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Faction Dialog -->
    <FactionViewDialog
      v-model="showViewDialog"
      :faction="viewingFaction"
      @edit="editFactionAndCloseView"
      @preview-image="openImagePreview"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500">
      <v-card>
        <v-card-title>{{ $t('factions.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('factions.deleteConfirmation', { name: deletingFaction?.name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deleting" @click="showDeleteDialog = false">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">
            {{ $t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Image Preview Dialog -->
    <ImagePreviewDialog
      v-model="showImagePreview"
      :image-url="previewImageUrl"
      :title="previewImageTitle"
    />
  </v-container>
</template>

<script setup lang="ts">
import ImagePreviewDialog from '~/components/shared/ImagePreviewDialog.vue'
import FactionCard from '~/components/factions/FactionCard.vue'
import FactionViewDialog from '~/components/factions/FactionViewDialog.vue'
import FactionDetailsForm from '~/components/factions/FactionDetailsForm.vue'
import FactionMembersTab from '~/components/factions/FactionMembersTab.vue'
import FactionLocationsTab from '~/components/factions/FactionLocationsTab.vue'
import FactionItemsTab from '~/components/factions/FactionItemsTab.vue'
import FactionLoreTab from '~/components/factions/FactionLoreTab.vue'
import EntityImageGallery from '~/components/shared/EntityImageGallery.vue'
import EntityDocuments from '~/components/shared/EntityDocuments.vue'

interface FactionCounts {
  members: number
  lore: number
  documents: number
  images: number
  items: number
  locations: number
}

interface Faction {
  id: number
  name: string
  description: string | null
  image_url?: string | null
  metadata: {
    type?: string
    alignment?: string
    headquarters?: string
    goals?: string
    notes?: string
  } | null
  leader_id?: number | null
  leader_name?: string | null
  created_at: string
  updated_at: string
  _counts?: FactionCounts
}

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

interface FactionLocation {
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

// Search state (must be declared early for template)
const searchQuery = ref('')
const searchResults = ref<Faction[]>([])
const searching = ref(false)

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

// Use image download composable
const { downloadImage } = useImageDownload()

// Auto-imported stores
const campaignStore = useCampaignStore()
const entitiesStore = useEntitiesStore()

// Get active campaign
const activeCampaignId = computed(() => campaignStore.activeCampaignId)

// Highlighted faction (from global search)
const highlightedId = ref<number | null>(null)
const isFromGlobalSearch = ref(false)

// Initialize from query params (global search)
function initializeFromQuery() {
  const highlightParam = route.query.highlight
  const searchParam = route.query.search

  if (highlightParam && searchParam) {
    highlightedId.value = Number(highlightParam)
    searchQuery.value = String(searchParam)
    isFromGlobalSearch.value = true

    // Scroll to highlighted faction after a short delay
    nextTick(() => {
      setTimeout(() => {
        const element = document.getElementById(`faction-${highlightedId.value}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    })
  }
}

const { loadFactionCountsBatch, reloadFactionCounts } = useFactionCounts()

// Load entities on mount
onMounted(async () => {
  // Load entities for this campaign
  await Promise.all([
    entitiesStore.fetchFactions(activeCampaignId.value!),
    entitiesStore.fetchLocations(activeCampaignId.value!),
    entitiesStore.fetchNPCs(activeCampaignId.value!),
    entitiesStore.fetchItems(activeCampaignId.value!),
    entitiesStore.fetchLore(activeCampaignId.value!),
  ])

  // Load counts for all factions in background (non-blocking)
  if (factions.value && factions.value.length > 0) {
    loadFactionCountsBatch(factions.value)
  }

  // Check API key
  try {
    const response = await $fetch<{ hasKey: boolean }>('/api/settings/check-api-key')
    hasApiKey.value = response.hasKey
  } catch {
    hasApiKey.value = false
  }

  // Initialize from query params
  initializeFromQuery()
})

// Watch for route changes (same-page navigation)
watch(
  () => route.query,
  () => {
    highlightedId.value = null
    isFromGlobalSearch.value = false
    // Re-initialize from new query
    initializeFromQuery()
  },
  { deep: true },
)

// Clear highlight when user manually searches
watch(searchQuery, () => {
  if (isFromGlobalSearch.value) {
    // First change after global search, keep highlight
    isFromGlobalSearch.value = false
  } else {
    // Manual search by user, clear highlight
    highlightedId.value = null
    // Remove query params from URL
    if (route.query.highlight || route.query.search) {
      router.replace({ query: {} })
    }
  }
})

// Get factions from store
const factions = computed(() => entitiesStore.factions)
const pending = computed(() => entitiesStore.factionsLoading)

// Debounce search with abort controller
let searchTimeout: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

// Search execution function
async function executeSearch(query: string) {
  if (!activeCampaignId.value!) return

  // Abort previous search if still running
  if (abortController) {
    abortController.abort()
  }

  // Create new abort controller for this search
  abortController = new AbortController()

  searching.value = true
  try {
    const results = await $fetch<Faction[]>('/api/factions', {
      query: {
        campaignId: activeCampaignId.value,
        search: query.trim(),
      },
      headers: {
        'Accept-Language': locale.value,
      },
      signal: abortController.signal,
    })
    searchResults.value = results
  } catch (error: unknown) {
    // Ignore abort errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      return
    }
    console.error('Faction search failed:', error)
    searchResults.value = []
  } finally {
    searching.value = false
    abortController = null
  }
}

// Watch search query with debounce
watch(searchQuery, async (query) => {
  if (searchTimeout) clearTimeout(searchTimeout)

  // Abort any running search immediately
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  if (!query || query.trim().length === 0) {
    searchResults.value = []
    searching.value = false
    return
  }

  // Show loading state immediately
  searching.value = true

  // Debounce search by 300ms
  searchTimeout = setTimeout(() => executeSearch(query), 300)
})

// Show search results OR cached factions
const filteredFactions = computed(() => {
  // If user is typing but search hasn't returned yet, show cached factions
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    if (searching.value && searchResults.value.length === 0) {
      return factions.value || []
    }
    return searchResults.value
  }
  return factions.value || []
})

// Form state
const showCreateDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)
const editingFaction = ref<Faction | null>(null)
const viewingFaction = ref<Faction | null>(null)
const deletingFaction = ref<Faction | null>(null)
const saving = ref(false)
const deleting = ref(false)
const factionDialogTab = ref('details')

// Members state
const factionMembers = ref<FactionMember[]>([])
const loadingMembers = ref(false)
const addingMember = ref(false)

// Locations state
const factionLocations = ref<FactionLocation[]>([])
const loadingLocations = ref(false)
const addingLocation = ref(false)

// Lore state
const linkedLore = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])

// Items state
const linkedItems = ref<
  Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction?: 'outgoing' | 'incoming'
  }>
>([])

const imageGenerating = ref(false)

// Get locations, NPCs, Items, and Lore from store
const locations = computed(() => entitiesStore.locationsForSelect)
const npcs = computed(() => entitiesStore.npcsForSelect)
const itemsForSelect = computed(() => {
  return (entitiesStore.items || []).map((item) => ({
    id: item.id,
    name: item.name,
  }))
})
const loreForSelect = computed(() => {
  return (entitiesStore.lore || []).map((lore) => ({
    id: lore.id,
    name: lore.name,
  }))
})

const factionForm = ref({
  name: '',
  description: '',
  leaderId: null as number | null,
  metadata: {
    type: '',
    alignment: '',
    headquarters: '',
    goals: '',
    notes: '',
  },
})

// View Faction
function viewFaction(faction: Faction) {
  viewingFaction.value = faction
  showViewDialog.value = true
}

// Edit from view dialog
async function editFactionAndCloseView(faction: Faction) {
  await editFaction(faction)
  showViewDialog.value = false
}

async function editFaction(faction: Faction) {
  editingFaction.value = faction
  factionForm.value = {
    name: faction.name,
    description: faction.description || '',
    leaderId: faction.leader_id || null,
    metadata: {
      type: faction.metadata?.type || '',
      alignment: faction.metadata?.alignment || '',
      headquarters: faction.metadata?.headquarters || '',
      goals: faction.metadata?.goals || '',
      notes: faction.metadata?.notes || '',
    },
  }
  showCreateDialog.value = true
  factionDialogTab.value = 'details'

  // Load faction members, locations, items, lore, and counts
  await Promise.all([
    loadFactionMembers(),
    loadFactionLocations(),
    loadLinkedItems(),
    loadLinkedLore(),
    reloadFactionCounts(faction),
  ])
}

function deleteFaction(faction: Faction) {
  deletingFaction.value = faction
  showDeleteDialog.value = true
}

async function saveFaction() {
  if (!factionForm.value.name || !activeCampaignId.value!) return

  saving.value = true

  try {
    let factionId: number

    if (editingFaction.value) {
      // Update existing faction via store
      await entitiesStore.updateFaction(editingFaction.value.id, {
        name: factionForm.value.name,
        description: factionForm.value.description || null,
        metadata: factionForm.value.metadata,
      })
      factionId = editingFaction.value.id
    } else {
      // Create new faction via store
      const newFaction = await entitiesStore.createFaction(activeCampaignId.value, {
        name: factionForm.value.name,
        description: factionForm.value.description || null,
        metadata: factionForm.value.metadata,
      })
      factionId = newFaction.id
    }

    // Manage leader relation
    // Step 1: Delete old "Anführer" relation if exists
    if (editingFaction.value && editingFaction.value.leader_id) {
      try {
        // Find and delete the old leader relation
        const members = await $fetch<FactionMember[]>(`/api/entities/${factionId}/related/npcs`)
        const leaderRelation = members.find((m) => m.relation_type === 'Anführer')
        if (leaderRelation) {
          await $fetch(`/api/entity-relations/${leaderRelation.id}`, { method: 'DELETE' })
        }
      } catch (error) {
        console.error('Failed to delete old leader relation:', error)
      }
    }

    // Step 2: Create new "Anführer" relation if leaderId is set and different from old one
    if (factionForm.value.leaderId && factionForm.value.leaderId !== editingFaction.value?.leader_id) {
      try {
        await $fetch<{ success: boolean }>(`/api/factions/${factionId}/members`, {
          method: 'POST',
          body: {
            npcId: factionForm.value.leaderId,
            membershipType: 'Anführer',
          },
        })
      } catch (error) {
        console.error('Failed to create leader relation:', error)
      }
    }

    // If user is searching, re-execute search to update FTS5 results
    if (searchQuery.value && searchQuery.value.trim().length > 0) {
      await executeSearch(searchQuery.value)
    }

    // Reload counts for the saved Faction (get from store, not API response)
    const factionFromStore = entitiesStore.factions.find((f) => f.id === factionId)
    if (factionFromStore) {
      await reloadFactionCounts(factionFromStore)
    }

    closeDialog()
  } catch (error) {
    console.error('Failed to save faction:', error)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingFaction.value) return

  deleting.value = true

  try {
    await entitiesStore.deleteFaction(deletingFaction.value.id)
    showDeleteDialog.value = false
    deletingFaction.value = null
  } catch (error) {
    console.error('Failed to delete faction:', error)
  } finally {
    deleting.value = false
  }
}

async function loadFactionMembers() {
  if (!editingFaction.value) return

  loadingMembers.value = true

  try {
    const members = await $fetch<FactionMember[]>(
      `/api/entities/${editingFaction.value.id}/related/npcs`,
    )
    factionMembers.value = members
  } catch (error) {
    console.error('Failed to load faction members:', error)
    factionMembers.value = []
  } finally {
    loadingMembers.value = false
  }
}

async function addNpcMember(payload: {
  npcId: number
  membershipType: string
  rank?: string
}) {
  if (!editingFaction.value) return

  addingMember.value = true

  try {
    await $fetch<{ success: boolean }>(`/api/factions/${editingFaction.value.id}/members`, {
      method: 'POST',
      body: {
        npcId: payload.npcId,
        membershipType: payload.membershipType,
        rank: payload.rank || undefined,
      },
    })
    await loadFactionMembers()
    // Reload counts immediately after adding member
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to add NPC member:', error)
  } finally {
    addingMember.value = false
  }
}

async function removeMember(relationId: number) {
  if (!editingFaction.value) return
  try {
    await $fetch(`/api/entity-relations/${relationId}`, { method: 'DELETE' })
    await loadFactionMembers()
    // Reload counts immediately after removing member
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to remove member:', error)
  }
}

async function loadFactionLocations() {
  if (!editingFaction.value) return

  loadingLocations.value = true

  try {
    const locations = await $fetch<FactionLocation[]>(
      `/api/entities/${editingFaction.value.id}/related/locations`,
    )
    factionLocations.value = locations
  } catch (error) {
    console.error('Failed to load faction locations:', error)
    factionLocations.value = []
  } finally {
    loadingLocations.value = false
  }
}

async function addLocationLink(payload: { locationId: number; relationType: string }) {
  if (!editingFaction.value) return

  addingLocation.value = true

  try {
    await $fetch<{ success: boolean }>(`/api/factions/${editingFaction.value.id}/locations`, {
      method: 'POST',
      body: {
        locationId: payload.locationId,
        relationType: payload.relationType,
      },
    })
    await loadFactionLocations()
    // Reload counts immediately after adding location
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to add location link:', error)
  } finally {
    addingLocation.value = false
  }
}

async function removeLocation(relationId: number) {
  if (!editingFaction.value) return
  try {
    await $fetch(`/api/entity-relations/${relationId}`, { method: 'DELETE' })
    await loadFactionLocations()
    // Reload counts immediately after removing location
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to remove location:', error)
  }
}

// Lore functions
async function loadLinkedLore() {
  if (!editingFaction.value) return
  try {
    const lore = await $fetch<
      Array<{ id: number; name: string; description: string | null; image_url: string | null }>
    >(`/api/entities/${editingFaction.value.id}/related/lore`)
    linkedLore.value = lore
  } catch (error) {
    console.error('Failed to load linked Lore:', error)
  }
}

async function addLoreRelation(loreId: number) {
  if (!editingFaction.value) return
  try {
    await $fetch<{ success: boolean }>('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: loreId,
        toEntityId: editingFaction.value.id,
        relationType: 'bezieht sich auf',
        relationNotes: null,
      },
    })
    await loadLinkedLore()
    // Reload counts immediately after adding lore
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to add Lore relation:', error)
  }
}

// Items functions
async function loadLinkedItems() {
  if (!editingFaction.value) return
  try {
    const items = await $fetch<
      Array<{
        id: number
        name: string
        description: string | null
        image_url: string | null
        direction?: 'outgoing' | 'incoming'
      }>
    >(`/api/entities/${editingFaction.value.id}/related/items`)
    linkedItems.value = items
  } catch (error) {
    console.error('Failed to load linked Items:', error)
  }
}

async function addItemRelation(itemId: number) {
  if (!editingFaction.value) return
  try {
    await $fetch<{ success: boolean }>('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: editingFaction.value.id,
        toEntityId: itemId,
        relationType: 'bezieht sich auf',
        relationNotes: null,
      },
    })
    await loadLinkedItems()
    // Reload counts immediately after adding item
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to add Item relation:', error)
  }
}

async function removeItemRelation(relationId: number) {
  if (!editingFaction.value) return
  try {
    await $fetch(`/api/entity-relations/${relationId}`, {
      method: 'DELETE',
    })
    await loadLinkedItems()
    // Reload counts immediately after removing item
    await reloadFactionCounts(editingFaction.value)
  } catch (error) {
    console.error('Failed to remove Item relation:', error)
  }
}

async function removeLoreRelation(loreId: number) {
  if (!editingFaction.value) return
  try {
    const relation = await $fetch<{ id: number } | null>('/api/entity-relations/find', {
      query: {
        fromEntityId: loreId,
        toEntityId: editingFaction.value.id,
      },
    })
    if (relation) {
      await $fetch(`/api/entity-relations/${relation.id}`, {
        method: 'DELETE',
      })
      await loadLinkedLore()
      // Reload counts immediately after removing lore
      await reloadFactionCounts(editingFaction.value)
    }
  } catch (error) {
    console.error('Failed to remove Lore relation:', error)
  }
}

// Image upload state
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const deletingImage = ref(false)
const generatingImage = ref(false)
const hasApiKey = ref(false)

// Image preview state
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageTitle = ref('')

// Image preview function
function openImagePreview(imageUrl: string, title?: string) {
  previewImageUrl.value = imageUrl
  previewImageTitle.value = title || ''
  showImagePreview.value = true
}

// Trigger file input click
function triggerImageUpload() {
  fileInputRef.value?.click()
}

// AI Generate Image function
async function generateImage() {
  if (!editingFaction.value || !factionForm.value.name) return

  generatingImage.value = true

  try {
    const details = []

    // Type (guild, government, criminal, religious, etc.)
    if (factionForm.value.metadata.type) {
      details.push(factionForm.value.metadata.type)
    }

    // Name (required)
    details.push(factionForm.value.name)

    // Description (free-form details)
    if (factionForm.value.description) {
      details.push(factionForm.value.description)
    }

    // Goals (what the faction wants)
    if (factionForm.value.metadata.goals) {
      details.push(factionForm.value.metadata.goals)
    }

    // Alignment (lawful, chaotic, neutral, etc.)
    if (factionForm.value.metadata.alignment) {
      details.push(factionForm.value.metadata.alignment)
    }

    // Notes (additional context)
    if (factionForm.value.metadata.notes) {
      details.push(factionForm.value.metadata.notes)
    }

    const prompt = details.filter((d) => d).join(', ')

    const result = await $fetch<{ imageUrl: string; revisedPrompt?: string }>(
      '/api/ai/generate-image',
      {
        method: 'POST',
        body: {
          prompt,
          entityName: factionForm.value.name,
          entityType: 'Faction',
          style: 'fantasy-art',
        },
      },
    )

    if (result.imageUrl && editingFaction.value) {
      // Add the generated image directly to the entity (no re-upload needed)
      const filename = result.imageUrl.replace('/uploads/', '')

      await $fetch(`/api/entities/${editingFaction.value.id}/add-generated-image`, {
        method: 'POST',
        body: {
          imageUrl: filename,
        },
      })

      // Update local state
      editingFaction.value.image_url = filename

      // Reload factions from server to get updated data
      if (activeCampaignId.value!) {
        await entitiesStore.fetchFactions(activeCampaignId.value!)
      }
    }
  } catch (error: unknown) {
    console.error('[Faction] Failed to generate image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
    alert(errorMessage)
  } finally {
    generatingImage.value = false
  }
}

// Handle image upload from native input
async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || !target.files.length || !editingFaction.value) return

  const file = target.files[0]
  if (!file) return
  uploadingImage.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{ success: boolean; imageUrl: string }>(
      `/api/entities/${editingFaction.value.id}/upload-image`,
      {
        method: 'POST',
        body: formData,
      },
    )

    if (response.success) {
      // Update the editing faction with new image URL
      editingFaction.value.image_url = response.imageUrl

      // Update the faction in the store list directly
      const factionInList = entitiesStore.factions?.find((f) => f.id === editingFaction.value!.id)
      if (factionInList) {
        factionInList.image_url = response.imageUrl
      }

      // Clear file input
      target.value = ''
    }
  } catch (error) {
    console.error('Failed to upload image:', error)
    alert(t('factions.uploadImageError'))
  } finally {
    uploadingImage.value = false
  }
}

// Delete image function
async function deleteImage() {
  if (!editingFaction.value?.image_url) return

  deletingImage.value = true

  try {
    await $fetch(`/api/entities/${editingFaction.value.id}/delete-image`, {
      method: 'DELETE',
    })

    // Update the editing faction
    editingFaction.value.image_url = null

    // Update the faction in the store list directly
    const factionInList = entitiesStore.factions?.find((f) => f.id === editingFaction.value!.id)
    if (factionInList) {
      factionInList.image_url = null
    }
  } catch (error) {
    console.error('Failed to delete image:', error)
    alert(t('factions.deleteImageError'))
  } finally {
    deletingImage.value = false
  }
}

// Handle images updated event (from EntityImageGallery)
async function handleImagesUpdated() {
  if (editingFaction.value) {
    await reloadFactionCounts(editingFaction.value)
  }
}

// Handle documents changed event (from EntityDocuments)
async function handleDocumentsChanged() {
  if (editingFaction.value) {
    await reloadFactionCounts(editingFaction.value)
  }
}

function closeDialog() {
  showCreateDialog.value = false
  editingFaction.value = null
  factionMembers.value = []
  factionLocations.value = []
  linkedItems.value = []
  linkedLore.value = []
  factionDialogTab.value = 'details'
  factionForm.value = {
    name: '',
    description: '',
    leaderId: null,
    metadata: {
      type: '',
      alignment: '',
      headquarters: '',
      goals: '',
      notes: '',
    },
  }
}
</script>

<style scoped>
@keyframes highlight-pulse {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(var(--v-theme-primary), 0.6);
  }
  50% {
    box-shadow: 0 0 40px rgba(var(--v-theme-primary), 0.9);
  }
}

.highlight-blink {
  animation: highlight-pulse 2s ease-in-out 3;
}
</style>
