<template>
  <v-container>
    <UiPageHeader :title="$t('items.title')" :subtitle="$t('items.subtitle')">
      <template #actions>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="large"
          @click="showCreateDialog = true"
        >
          {{ $t('items.create') }}
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
      :hint="searchQuery && searchQuery.trim().length > 0 ? $t('items.searchHint') : ''"
      persistent-hint
    />

    <v-row v-if="pending">
      <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <!-- Item Cards with Search Overlay -->
    <div v-else-if="filteredItems && filteredItems.length > 0" class="position-relative">
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

      <!-- Item Cards -->
      <v-row>
        <v-col v-for="item in filteredItems" :key="item.id" cols="12" md="6" lg="4">
          <ItemCard
            :item="item"
            :is-highlighted="highlightedId === item.id"
            @view="viewItem"
            @edit="editItem"
            @download="(item) => downloadImage(`/uploads/${item.image_url}`, item.name)"
            @delete="deleteItem"
          />
        </v-col>
      </v-row>
    </div>

    <ClientOnly v-else>
      <v-empty-state icon="mdi-sword" :title="$t('items.empty')" :text="$t('items.emptyText')">
        <template #actions>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
            {{ $t('items.create') }}
          </v-btn>
        </template>
      </v-empty-state>
      <template #fallback>
        <v-container class="text-center py-16">
          <v-icon icon="mdi-sword" size="64" color="grey" class="mb-4" />
          <h2 class="text-h5 mb-2">{{ $t('items.empty') }}</h2>
          <p class="text-body-1 text-medium-emphasis mb-4">{{ $t('items.emptyText') }}</p>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
            {{ $t('items.create') }}
          </v-btn>
        </v-container>
      </template>
    </ClientOnly>

    <!-- View Item Dialog -->
    <ItemViewDialog
      v-model="showViewDialog"
      :item="viewingItem"
      :owners="itemOwners"
      :locations="itemLocations"
      :factions="itemFactions"
      :lore="itemLore"
      :documents="itemDocuments"
      :images="itemImages"
      :counts="viewDialogCounts"
      :loading="loadingViewData"
      :loading-owners="loadingOwners"
      :loading-locations="loadingLocations"
      :loading-factions="loadingFactions"
      :loading-lore="loadingLore"
      @edit="editItemAndCloseView"
      @preview-image="(image: { image_url: string }) => openImagePreview(`/uploads/${image.image_url}`, viewingItem?.name || '')"
    />

    <!-- Create/Edit Item Dialog -->
    <ItemEditDialog
      v-model:show="showCreateDialog"
      v-model:form="itemForm"
      v-model:active-tab="itemDialogTab"
      :editing-item="editingItem"
      :item-owners="editItemOwners"
      :item-locations="editItemLocations"
      :linked-factions="linkedFactions"
      :linked-lore="linkedLore"
      :available-npcs="npcs || []"
      :available-locations="locations || []"
      :available-factions="factions || []"
      :available-lore="loreForSelect"
      :saving="saving"
      :adding-owner="addingOwner"
      :adding-location="addingLocation"
      :adding-faction="addingFaction"
      :adding-lore="addingLore"
      :removing-owner="removingOwner"
      :removing-location="removingLocation"
      :removing-faction="removingFaction"
      @save="saveItem"
      @close="closeDialog"
      @image-changed="handleImageChanged"
      @images-changed="handleImagesChanged"
      @documents-changed="handleDocumentsChanged"
      @open-image-preview="(url: string, name: string) => openImagePreview(url, name)"
      @add-owner="addOwnerToItem"
      @remove-owner="removeOwner"
      @add-location="addLocationToItem"
      @remove-location="removeLocation"
      @add-faction="addFactionRelation"
      @remove-faction="removeFactionRelation"
      @add-lore="addLoreRelation"
      @remove-lore="removeLoreRelation"
    />

    <!-- Image Preview Dialog -->
    <ImagePreviewDialog
      v-model="showImagePreview"
      :image-url="previewImageUrl"
      :title="previewImageTitle"
      :download-file-name="previewImageTitle"
    />

    <!-- Delete Confirmation Dialog -->
    <UiDeleteConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('items.deleteTitle')"
      :message="$t('items.deleteConfirm', { name: deletingItem?.name })"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import type { Item, ItemMetadata } from '../../../types/item'
import ImagePreviewDialog from '~/components/shared/ImagePreviewDialog.vue'
import ItemCard from '~/components/items/ItemCard.vue'
import ItemViewDialog from '~/components/items/ItemViewDialog.vue'
import ItemEditDialog from '~/components/items/ItemEditDialog.vue'

// Check if OpenAI API key is configured
const hasApiKey = ref(false)

// Image Preview
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageTitle = ref('')

function openImagePreview(imageUrl: string, title: string) {
  previewImageUrl.value = imageUrl
  previewImageTitle.value = title
  showImagePreview.value = true
}

// Debounced FTS5 + Levenshtein Search (must be declared early for template)
const searchQuery = ref('')
const searchResults = ref<Item[]>([])
const searching = ref(false)

const { locale } = useI18n()
const router = useRouter()
const route = useRoute()
const campaignStore = useCampaignStore()
const entitiesStore = useEntitiesStore()

const activeCampaignId = computed(() => campaignStore.activeCampaignId)

// Highlighted item (from global search)
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

    // Scroll to highlighted item after a short delay
    nextTick(() => {
      setTimeout(() => {
        const element = document.getElementById(`item-${highlightedId.value}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    })
  }
}

const { loadItemCountsBatch, reloadItemCounts } = useItemCounts()

onMounted(async () => {
  await Promise.all([
    entitiesStore.fetchItems(activeCampaignId.value!),
    entitiesStore.fetchNPCs(activeCampaignId.value!),
    entitiesStore.fetchLocations(activeCampaignId.value!),
    entitiesStore.fetchFactions(activeCampaignId.value!),
    entitiesStore.fetchLore(activeCampaignId.value!),
  ])

  // Load counts for all items in background (non-blocking)
  if (items.value && items.value.length > 0) {
    loadItemCountsBatch(items.value)
  }

  // Check if API key is configured
  try {
    const settings = await $fetch<{ openai_api_key_full?: string }>('/api/settings')
    hasApiKey.value = !!settings.openai_api_key_full
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

const items = computed(() => entitiesStore.items)
const pending = computed(() => entitiesStore.itemsLoading)
const npcs = computed(() => entitiesStore.npcsForSelect)
const locations = computed(() => entitiesStore.locationsForSelect)
const factions = computed(() => entitiesStore.factionsForSelect)

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
    const results = await $fetch<Item[]>('/api/items', {
      query: {
        campaignId: activeCampaignId.value,
        search: query.trim(),
      },
      headers: {
        'Accept-Language': locale.value, // Send current locale to backend
      },
      signal: abortController.signal, // Pass abort signal to fetch
    })
    searchResults.value = results

    // Load counts for search results in background
    if (results.length > 0) {
      loadItemCountsBatch(results)
    }
  } catch (error: unknown) {
    // Ignore abort errors (expected when user types fast)
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      return
    }
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    searching.value = false
    abortController = null
  }
}

// Watch search query with debounce
watch(searchQuery, async (query) => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Abort any running search immediately
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  // If empty, show all items from store
  if (!query || query.trim().length === 0) {
    searchResults.value = []
    searching.value = false
    return
  }

  // Show loading state immediately (user sees overlay during debounce)
  searching.value = true

  // Debounce search by 300ms
  searchTimeout = setTimeout(() => executeSearch(query), 300)
})

// Show search results OR cached items
const filteredItems = computed(() => {
  // If user is actively searching, show search results
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    return searchResults.value
  }

  // Otherwise show all cached items
  return items.value || []
})

// Form state
const showCreateDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref<Item | null>(null)
const viewingItem = ref<Item | null>(null)
const deletingItem = ref<Item | null>(null)
const saving = ref(false)
const deleting = ref(false)

const itemForm = ref<{
  name: string
  description: string
  metadata: ItemMetadata
}>({
  name: '',
  description: '',
  metadata: {},
})

// Track original item data to detect unsaved changes
const originalItemData = ref<{
  name: string
  description: string
  metadata: ItemMetadata
} | null>(null)

// Dialog tab state
const itemDialogTab = ref('details')

// Lore linking state (EDIT Dialog)
const linkedLore = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])
const addingLore = ref(false)

// Factions linking state (EDIT Dialog)
const linkedFactions = ref<
  Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction?: 'outgoing' | 'incoming'
  }>
>([])
const selectedFactionId = ref<number | null>(null)
const addingFaction = ref(false)
const removingFaction = ref<number | null>(null)

// Image state

// Use image download composable
const { downloadImage } = useImageDownload()

// View Dialog data
const viewDialogCounts = ref<{
  owners: number
  locations: number
  factions: number
  lore: number
  documents: number
  images: number
} | null>(null)

const loadingViewData = ref(false)
const loadingOwners = ref(false)
const loadingLocations = ref(false)
const loadingFactions = ref(false)
const loadingLore = ref(false)

const itemDocuments = ref<Array<{ id: number; title: string; content: string }>>([])
const itemImages = ref<Array<{ id: number; image_url: string; is_primary: boolean }>>([])
const itemFactions = ref<
  Array<{
    id: number
    name: string
    description?: string | null
    image_url?: string | null
    relation_type?: string
  }>
>([])
const itemLore = ref<
  Array<{
    id: number
    name: string
    description?: string | null
    image_url?: string | null
  }>
>([])

// Owners state (for VIEW Dialog, used in template line 93)
const itemOwners = ref<
  Array<{
    id: number
    name: string
    description?: string | null
    image_url?: string | null
    relation_type?: string
  }>
>([])

// Owners state for EDIT dialog
const editItemOwners = ref<
  Array<{
    id: number
    relation_id: number
    name: string
    description?: string | null
    image_url?: string | null
    quantity?: number | null
    equipped?: boolean | null
  }>
>([])

const newOwner = ref({
  npcId: null as number | null,
  relationType: '',
  quantity: 1,
  equipped: false,
})
const addingOwner = ref(false)
const removingOwner = ref<number | null>(null)

// Suggested owner relation types (i18n)

// Locations state (for VIEW Dialog, used in template line 94)
const itemLocations = ref<
  Array<{
    id: number
    name: string
    description?: string | null
    image_url?: string | null
    relation_type?: string
  }>
>([])

// Locations state for EDIT dialog
const editItemLocations = ref<
  Array<{
    id: number
    relation_id: number
    name: string
    description?: string | null
    image_url?: string | null
    quantity?: number | null
  }>
>([])

const newLocation = ref({
  locationId: null as number | null,
  relationType: '',
  quantity: 1,
})
const addingLocation = ref(false)
const removingLocation = ref<number | null>(null)

// Suggested location relation types (i18n)

async function viewItem(item: Item) {
  viewingItem.value = item
  showViewDialog.value = true

  loadingViewData.value = true
  loadingOwners.value = true
  loadingLocations.value = true
  loadingFactions.value = true
  loadingLore.value = true

  try {
    const [owners, locations, factions, lore, documents, images, counts] = await Promise.all([
      $fetch<typeof itemOwners.value>(`/api/entities/${item.id}/related/npcs`).catch(() => []),
      $fetch<typeof itemLocations.value>(`/api/entities/${item.id}/related/locations`).catch(() => []),
      $fetch<typeof itemFactions.value>(`/api/entities/${item.id}/related/factions`).catch(() => []),
      $fetch<typeof itemLore.value>(`/api/entities/${item.id}/related/lore`).catch(() => []),
      $fetch<typeof itemDocuments.value>(`/api/entities/${item.id}/documents`).catch(() => []),
      $fetch<typeof itemImages.value>(`/api/entity-images/${item.id}`).catch(() => []),
      $fetch<typeof viewDialogCounts.value>(`/api/items/${item.id}/counts`).catch(() => null),
    ])

    itemOwners.value = owners
    itemLocations.value = locations
    itemFactions.value = factions
    itemLore.value = lore
    itemDocuments.value = documents
    itemImages.value = images
    viewDialogCounts.value = counts
  } finally {
    loadingViewData.value = false
    loadingOwners.value = false
    loadingLocations.value = false
    loadingFactions.value = false
    loadingLore.value = false
  }
}

async function editItem(item: Item) {
  editingItem.value = item
  itemForm.value = {
    name: item.name,
    description: item.description || '',
    metadata: {
      type: item.metadata?.type,
      rarity: item.metadata?.rarity,
      value: item.metadata?.value,
      weight: item.metadata?.weight,
      attunement: item.metadata?.attunement || false,
      charges: item.metadata?.charges,
      properties: item.metadata?.properties,
    },
  }

  // Store original data to track changes
  originalItemData.value = JSON.parse(JSON.stringify(itemForm.value))

  // Load owners, locations, and counts
  await Promise.all([loadItemOwners(), loadItemLocations(), reloadItemCounts(item)])

  showCreateDialog.value = true
  itemDialogTab.value = 'details'
}

async function editItemAndCloseView(item: Item) {
  await editItem(item)
  showViewDialog.value = false
}

function deleteItem(item: Item) {
  deletingItem.value = item
  showDeleteDialog.value = true
}

async function saveItem() {
  if (!itemForm.value.name || !activeCampaignId.value!) return

  saving.value = true

  try {
    let savedItemId: number

    if (editingItem.value) {
      await entitiesStore.updateItem(editingItem.value.id, {
        name: itemForm.value.name,
        description: itemForm.value.description || null,
        metadata: itemForm.value.metadata,
      })
      savedItemId = editingItem.value.id

      // Update original data after successful save
      originalItemData.value = JSON.parse(JSON.stringify(itemForm.value))
    } else {
      // Create new item
      const newItem = await entitiesStore.createItem(activeCampaignId.value, {
        name: itemForm.value.name,
        description: itemForm.value.description || null,
        metadata: itemForm.value.metadata,
      })
      savedItemId = newItem.id
    }

    // If user is searching, re-execute search to update FTS5 results
    if (searchQuery.value && searchQuery.value.trim().length > 0) {
      await executeSearch(searchQuery.value)
    }

    // Reload counts for the saved Item (get Item from store, not API response!)
    const itemFromStore = entitiesStore.items.find((i) => i.id === savedItemId)
    if (itemFromStore) {
      await reloadItemCounts(itemFromStore)
    }

    closeDialog()
  } catch (error) {
    console.error('Failed to save item:', error)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingItem.value) return

  deleting.value = true

  try {
    await entitiesStore.deleteItem(deletingItem.value.id)
    showDeleteDialog.value = false
    deletingItem.value = null
  } catch (error) {
    console.error('Failed to delete item:', error)
  } finally {
    deleting.value = false
  }
}

// Handle documents changed event (from EntityDocuments)
async function handleDocumentsChanged() {
  if (editingItem.value) {
    await reloadItemCounts(editingItem.value)
  }
}

// Handle image changed event (from EntityImageUpload)
async function handleImageChanged() {
  if (editingItem.value) {
    // Reload the item to get updated image_url
    const updatedItem = await $fetch<Item>(`/api/items/${editingItem.value.id}`)
    editingItem.value = updatedItem
    await reloadItemCounts(editingItem.value)
  }
}

// Handle images changed event (from EntityImageGallery)
async function handleImagesChanged() {
  if (editingItem.value) {
    await reloadItemCounts(editingItem.value)
  }
}

function closeDialog() {
  showCreateDialog.value = false
  editingItem.value = null
  itemForm.value = {
    name: '',
    description: '',
    metadata: {},
  }
  editItemOwners.value = []
  editItemLocations.value = []
}

// Owner functions (for EDIT dialog)
async function loadItemOwners() {
  if (!editingItem.value) return

  try {
    const owners = await $fetch<typeof editItemOwners.value>(
      `/api/entities/${editingItem.value.id}/related/npcs`,
    )
    editItemOwners.value = owners
  } catch (error) {
    console.error('Failed to load item owners:', error)
    editItemOwners.value = []
  }
}

async function addOwnerToItem() {
  if (!editingItem.value || !newOwner.value.npcId || !newOwner.value.relationType) return

  addingOwner.value = true

  try {
    await $fetch(`/api/items/${editingItem.value.id}/owners`, {
      method: 'POST',
      body: {
        npcId: newOwner.value.npcId,
        relationType: newOwner.value.relationType,
        quantity: newOwner.value.quantity || undefined,
        equipped: newOwner.value.equipped,
      },
    })

    await loadItemOwners()

    // Reload counts to update the badge on the card
    if (editingItem.value) {
      await reloadItemCounts(editingItem.value)
    }

    // Reset form
    newOwner.value = {
      npcId: null,
      relationType: '',
      quantity: 1,
      equipped: false,
    }
  } catch (error) {
    console.error('Failed to add owner to item:', error)
  } finally {
    addingOwner.value = false
  }
}

async function removeOwner(relationId: number) {
  try {
    await $fetch(`/api/relations/${relationId}`, {
      method: 'DELETE',
    })
    await loadItemOwners()

    // Reload counts to update the badge on the card
    if (editingItem.value) {
      await reloadItemCounts(editingItem.value)
    }
  } catch (error) {
    console.error('Failed to remove owner:', error)
  }
}

// Location functions (for EDIT dialog)
async function loadItemLocations() {
  if (!editingItem.value) return

  try {
    const locs = await $fetch<typeof editItemLocations.value>(
      `/api/entities/${editingItem.value.id}/related/locations`,
    )
    editItemLocations.value = locs
  } catch (error) {
    console.error('Failed to load item locations:', error)
    editItemLocations.value = []
  }
}

async function addLocationToItem() {
  if (!editingItem.value || !newLocation.value.locationId || !newLocation.value.relationType) return

  addingLocation.value = true

  try {
    await $fetch(`/api/items/${editingItem.value.id}/locations`, {
      method: 'POST',
      body: {
        locationId: newLocation.value.locationId,
        relationType: newLocation.value.relationType,
        quantity: newLocation.value.quantity || undefined,
      },
    })

    await loadItemLocations()

    // Reload counts to update the badge on the card
    if (editingItem.value) {
      await reloadItemCounts(editingItem.value)
    }

    // Reset form
    newLocation.value = {
      locationId: null,
      relationType: '',
      quantity: 1,
    }
  } catch (error) {
    console.error('Failed to add location to item:', error)
  } finally {
    addingLocation.value = false
  }
}

async function removeLocation(relationId: number) {
  try {
    await $fetch(`/api/relations/${relationId}`, {
      method: 'DELETE',
    })
    await loadItemLocations()

    // Reload counts to update the badge on the card
    if (editingItem.value) {
      await reloadItemCounts(editingItem.value)
    }
  } catch (error) {
    console.error('Failed to remove location:', error)
  }
}

// Lore for selection (used in EntityLoreTab)
const loreForSelect = computed(() => entitiesStore.loreForSelect)


// Load linked entities when editing Item
watch(
  () => editingItem.value?.id,
  async (itemId) => {
    if (itemId) {
      await Promise.all([loadLinkedLore(itemId), loadLinkedFactions(itemId)])
    } else {
      linkedLore.value = []
      linkedFactions.value = []
    }
  },
)

// Load linked lore entries
async function loadLinkedLore(itemId: number) {
  loadingLore.value = true
  try {
    const relations = await $fetch<
      Array<{ id: number; name: string; description: string | null; image_url: string | null }>
    >(`/api/entities/${itemId}/related/lore`)
    linkedLore.value = relations
  } catch (error) {
    console.error('Failed to load linked lore:', error)
    linkedLore.value = []
  } finally {
    loadingLore.value = false
  }
}

// Add lore relation
async function addLoreRelation(loreId: number) {
  if (!editingItem.value) return

  addingLore.value = true
  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: editingItem.value.id,
        toEntityId: loreId,
        relationType: 'bezieht sich auf',
      },
    })

    await loadLinkedLore(editingItem.value.id)
  } catch (error) {
    console.error('Failed to add lore relation:', error)
  } finally {
    addingLore.value = false
  }
}

// Remove lore relation
async function removeLoreRelation(relationId: number) {
  if (!editingItem.value) return

  try {
    // The id passed is already the relation ID from the API
    await $fetch(`/api/entity-relations/${relationId}`, {
      method: 'DELETE',
    })

    await loadLinkedLore(editingItem.value.id)
  } catch (error) {
    console.error('Failed to remove lore relation:', error)
  }
}

// Factions linking functions
async function loadLinkedFactions(itemId: number) {
  loadingFactions.value = true
  try {
    const factions = await $fetch<
      Array<{
        id: number
        name: string
        description: string | null
        image_url: string | null
        direction?: 'outgoing' | 'incoming'
      }>
    >(`/api/entities/${itemId}/related/factions`)
    linkedFactions.value = factions
  } catch (error) {
    console.error('Failed to load linked factions:', error)
  } finally {
    loadingFactions.value = false
  }
}

async function addFactionRelation() {
  if (!editingItem.value || !selectedFactionId.value) return

  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: editingItem.value.id,
        toEntityId: selectedFactionId.value,
        relationType: 'bezieht sich auf',
        relationNotes: null,
      },
    })

    selectedFactionId.value = null
    await loadLinkedFactions(editingItem.value.id)
  } catch (error) {
    console.error('Failed to add faction relation:', error)
  }
}

async function removeFactionRelation(relationId: number) {
  if (!editingItem.value) return

  try {
    await $fetch(`/api/entity-relations/${relationId}`, {
      method: 'DELETE',
    })

    await loadLinkedFactions(editingItem.value.id)

    // Reload counts to update the badge on the card
    if (editingItem.value) {
      await reloadItemCounts(editingItem.value)
    }
  } catch (error) {
    console.error('Failed to remove faction relation:', error)
  }
}
</script>

<style scoped>
.image-download-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  opacity: 0.5;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.image-container:hover .image-download-btn {
  opacity: 1;
  transform: scale(1.1);
}

/* Blur image during upload/generation */
.blur-image {
  filter: blur(8px);
  opacity: 0.6;
  transition:
    filter 0.3s ease,
    opacity 0.3s ease;
}
</style>
