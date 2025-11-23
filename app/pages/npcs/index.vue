<template>
  <v-container>
    <UiPageHeader :title="$t('npcs.title')" :subtitle="$t('npcs.subtitle')">
      <template #actions>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="large"
          @click="showCreateDialog = true"
        >
          {{ $t('npcs.create') }}
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

    <v-row v-if="entitiesStore.npcsLoading">
      <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <!-- NPC Cards with Search Overlay -->
    <div v-else-if="filteredNpcs && filteredNpcs.length > 0" class="position-relative">
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

      <!-- NPC Cards -->
      <v-row>
        <v-col v-for="npc in filteredNpcs" :key="npc.id" cols="12" md="6" lg="4">
          <NpcCard
            :npc="npc"
            :is-highlighted="highlightedId === npc.id"
            :races="races"
            :classes="classes"
            @view="viewNpc"
            @edit="editNpc"
            @download="(npc: NPC) => downloadImage(`/uploads/${npc.image_url}`, npc.name)"
            @delete="deleteNpc"
          />
        </v-col>
      </v-row>
    </div>

    <div v-else>
      <ClientOnly>
        <v-empty-state
          icon="mdi-account-group"
          :title="$t('npcs.empty')"
          :text="$t('npcs.emptyText')"
        >
          <template #actions>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
              {{ $t('npcs.create') }}
            </v-btn>
          </template>
        </v-empty-state>
        <template #fallback>
          <v-container class="text-center py-16">
            <v-icon icon="mdi-account-group" size="64" color="grey" class="mb-4" />
            <h2 class="text-h5 mb-2">{{ $t('npcs.empty') }}</h2>
            <p class="text-body-1 text-medium-emphasis mb-4">{{ $t('npcs.emptyText') }}</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
              {{ $t('npcs.create') }}
            </v-btn>
          </v-container>
        </template>
      </ClientOnly>
    </div>

    <!-- View NPC Dialog -->
    <NpcViewDialog
      v-model:show="showViewDialog"
      :npc="viewingNpc"
      :races="races"
      :classes="classes"
      :can-go-back="npcViewStack.length > 0"
      @edit="handleEditFromView"
      @view-npc="viewNpcById"
      @view-item="viewItemById"
      @view-location="viewLocationById"
      @go-back="goBackInNpcView"
    />

    <!-- Create/Edit Dialog -->
    <NpcEditDialog
      v-model:show="showCreateDialog"
      v-model:form="npcForm"
      v-model:active-tab="npcDialogTab"
      :editing-npc="editingNpc"
      :race-items="raceItems"
      :class-items="classItems"
      :gender-items="genderItems"
      :npc-types="npcTypes"
      :npc-statuses="npcStatuses"
      :npc-relations="npcRelations"
      :faction-memberships="factionMemberships"
      :npc-items="npcItems"
      :linked-lore="linkedLore"
      :available-npcs="npcsForSelect || []"
      :available-factions="factions || []"
      :available-items="items || []"
      :available-lore="loreForSelect"
      :saving="saving"
      :adding-npc-relation="addingNpcRelation"
      :adding-membership="addingMembership"
      :adding-item="addingItem"
      :loading-lore="loadingLore"
      :npc-relation-count="npcRelationCount"
      @save="saveNpc"
      @close="closeDialog"
      @image-changed="handleDocumentsChanged"
      @open-image-preview="(url: string, name: string) => openImagePreview(url, name)"
      @add-npc-relation="addNpcRelation"
      @add-membership="addFactionMembership"
      @add-item="addItemToNpc"
      @edit-membership="editMembership"
      @remove-membership="removeMembership"
      @remove-item="removeItem"
      @documents-changed="handleDocumentsChanged"
      @players-changed="handlePlayersChanged"
      @add-lore="addLoreRelation"
      @remove-lore="removeLoreRelation"
    />

    <!-- Edit Membership Dialog -->
    <v-dialog v-model="showEditMembershipDialog" max-width="600">
      <v-card v-if="editingMembership">
        <v-card-title>{{ $t('npcs.editMembership') }}</v-card-title>
        <v-card-text>
          <v-text-field
            :model-value="editingMembership.to_entity_name"
            :label="$t('npcs.faction')"
            variant="outlined"
            readonly
            disabled
            class="mb-3"
          />

          <v-combobox
            v-model="membershipEditForm.relationType"
            :items="membershipTypeSuggestions"
            :label="$t('npcs.membershipType')"
            variant="outlined"
            class="mb-3"
          />

          <v-text-field
            v-model="membershipEditForm.rank"
            :label="$t('npcs.rank')"
            :placeholder="$t('npcs.rankPlaceholder')"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeEditMembershipDialog">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn color="primary" :loading="savingMembership" @click="saveMembership">
            {{ $t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <ImagePreviewDialog
      v-model="showImagePreview"
      :image-url="previewImageUrl"
      :title="previewImageTitle"
      :download-file-name="previewImageTitle"
    />

    <UiDeleteConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('npcs.deleteTitle')"
      :message="$t('npcs.deleteConfirm', { name: deletingNpc?.name })"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import type { NPC, NpcType, NpcStatus } from '../../../types/npc'
import { NPC_TYPES, NPC_STATUSES } from '../../../types/npc'
import NpcCard from '../../components/npcs/NpcCard.vue'
import NpcViewDialog from '../../components/npcs/NpcViewDialog.vue'
import NpcEditDialog from '../../components/npcs/NpcEditDialog.vue'
import ImagePreviewDialog from '../../components/shared/ImagePreviewDialog.vue'

const { t, locale } = useI18n()
const router = useRouter()

// Use image download composable
const { downloadImage } = useImageDownload()

// Use NPC counts composable
const { loadNpcCountsBatch, reloadNpcCounts } = useNpcCounts()

// Image Preview
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageTitle = ref('')

function openImagePreview(imageUrl: string, title: string) {
  previewImageUrl.value = imageUrl
  previewImageTitle.value = title
  showImagePreview.value = true
}

// Auto-imported stores
const entitiesStore = useEntitiesStore()
const campaignStore = useCampaignStore()

// Get active campaign from campaign store
const activeCampaignId = computed(() => campaignStore.activeCampaignId)

// Check if campaign is selected
onMounted(async () => {
  // Load entities for this campaign
  await Promise.all([
    entitiesStore.fetchNPCs(activeCampaignId.value!),
    entitiesStore.fetchLocations(activeCampaignId.value!),
    entitiesStore.fetchFactions(activeCampaignId.value!),
    entitiesStore.fetchItems(activeCampaignId.value!),
    entitiesStore.fetchLore(activeCampaignId.value!),
    entitiesStore.fetchPlayers(activeCampaignId.value!),
  ])

  // Load races and classes for dropdowns
  await loadReferenceData()

  // Load counts for all NPCs asynchronously (in background)
  if (entitiesStore.npcs) {
    loadNpcCountsBatch(entitiesStore.npcs)
  }
})

// Search with FTS5
const route = useRoute()
const searchQuery = ref('')
const searchResults = ref<NPC[]>([])
const searching = ref(false)

// Highlighted NPC (from global search)
const highlightedId = ref<number | null>(null)
const isFromGlobalSearch = ref(false)

// Initialize from URL query parameters
function initializeFromQuery() {
  if (route.query.search && typeof route.query.search === 'string') {
    searchQuery.value = route.query.search
    isFromGlobalSearch.value = true
  }
  if (route.query.highlight && typeof route.query.highlight === 'string') {
    highlightedId.value = parseInt(route.query.highlight, 10)
    // Auto-scroll to highlighted card after a short delay
    setTimeout(() => {
      const element = document.getElementById(`npc-${highlightedId.value}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 500)
  }
}

onMounted(() => {
  initializeFromQuery()
})

// Watch for route changes (same-page navigation)
watch(
  () => route.query,
  () => {
    // Clear previous highlight
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

// Get data from stores
const npcs = computed(() => entitiesStore.npcs)
const factions = computed(() => entitiesStore.factionsForSelect)
const items = computed(() => entitiesStore.itemsForSelect)

// Reference data for dropdowns
const races = ref<
  Array<{
    id: number
    name: string
    name_de?: string | null
    name_en?: string | null
    key: string
    description: string
  }>
>([])
const classes = ref<
  Array<{
    id: number
    name: string
    name_de?: string | null
    name_en?: string | null
    key: string
    description: string
  }>
>([])

// Load reference data
async function loadReferenceData() {
  const [racesData, classesData] = await Promise.all([
    $fetch<
      Array<{
        id: number
        name: string
        name_de?: string | null
        name_en?: string | null
        key: string
        description: string
      }>
    >('/api/races'),
    $fetch<
      Array<{
        id: number
        name: string
        name_de?: string | null
        name_en?: string | null
        key: string
        description: string
      }>
    >('/api/classes'),
  ])
  races.value = racesData
  classes.value = classesData
}

// Translated race/class items for dropdowns (uses DB translations or i18n fallback)
// IMPORTANT: We read locale.value to make this computed reactive to language changes
const raceItems = computed(() => {
  void locale.value // Track locale dependency for reactivity
  return races.value.map((r: (typeof races.value)[0]) => ({
    title: useRaceName(r),
    value: r.name,
  }))
})
const classItems = computed(() => {
  void locale.value // Track locale dependency for reactivity
  return classes.value.map((c: (typeof classes.value)[0]) => ({
    title: useClassName(c),
    value: c.name,
  }))
})

const genderItems = computed(() => {
  return [
    { title: t('npcs.genders.male'), value: 'male' },
    { title: t('npcs.genders.female'), value: 'female' },
    { title: t('npcs.genders.nonbinary'), value: 'nonbinary' },
    { title: t('npcs.genders.other'), value: 'other' },
    { title: t('npcs.genders.unknown'), value: 'unknown' },
  ]
})

// Debounced search with abort controller
let searchTimeout: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

// Search execution function (extracted for reuse)
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
    const results = await $fetch<NPC[]>('/api/npcs', {
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
      loadNpcCountsBatch(results)
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

  // If empty, show all NPCs from store
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

// Re-trigger search when locale changes (no debounce)
watch(locale, () => {
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    executeSearch(searchQuery.value)
  }
})

// Show search results OR cached NPCs
const filteredNpcs = computed(() => {
  // If user is actively searching, show search results
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    return searchResults.value
  }

  // Otherwise show all cached NPCs
  return npcs.value || []
})

// Form state
const showViewDialog = ref(false)
const viewingNpc = ref<NPC | null>(null)
// Stack for nested NPC views (when clicking relations in view dialog)
const npcViewStack = ref<NPC[]>([])
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const editingNpc = ref<NPC | null>(null)
const deletingNpc = ref<NPC | null>(null)
const saving = ref(false)
const deleting = ref(false)
const npcDialogTab = ref('details')

// Lore linking
const linkedLore = ref<
  Array<{ id: number; name: string; description: string | null; image_url: string | null }>
>([])
const loadingLore = ref(false)

const npcForm = ref({
  name: '',
  description: '',
  metadata: {
    race: '',
    class: '',
    type: undefined as NpcType | undefined,
    status: undefined as NpcStatus | undefined,
    age: undefined as number | undefined,
    gender: undefined as string | undefined,
  },
})

// Note: Unsaved changes tracking removed for simplicity
// User can generate images anytime as long as they have a name and API key

// Check if API key is configured
// Image management now handled in NpcEditDialog component (including API key check)

// NPC Types for select
const npcTypes = computed(() =>
  NPC_TYPES.map((type: (typeof NPC_TYPES)[number]) => ({
    value: type,
    title: t(`npcs.types.${type}`),
  })),
)

// NPC Statuses for select
const npcStatuses = computed(() =>
  NPC_STATUSES.map((status: (typeof NPC_STATUSES)[number]) => ({
    value: status,
    title: t(`npcs.statuses.${status}`),
  })),
)

// Relation counts for dialog tabs
const npcRelationCount = computed(() => {
  return npcRelations.value.filter(
    (r: (typeof npcRelations.value)[0]) => (r.related_npc_type || r.to_entity_type) === 'NPC',
  ).length
})

// Get icon for NPC type
// NPC Relations state
const npcRelations = ref<
  Array<{
    id: number
    related_npc_id: number
    related_npc_name: string
    related_npc_type: string
    relation_type: string
    notes: string | null
    image_url: string | null
    direction: 'outgoing' | 'incoming'
    // Legacy fields for backwards compat with locations
    to_entity_id?: number
    to_entity_name?: string
    to_entity_type?: string
  }>
>([])

const newRelation = ref({
  locationId: null as number | null,
  relationType: '',
  notes: '',
})

// NPC-to-NPC relation state
const newNpcRelation = ref({
  npcId: null as number | null,
  relationType: '',
  notes: '',
})

const addingNpcRelation = ref(false)

const npcsForSelect = computed(() => {
  // Filter out the current NPC from the list
  return entitiesStore.npcs.filter((npc) => npc.id !== editingNpc.value?.id)
})

// Memberships state (all relations loaded from API)
interface Relation {
  id: number
  from_entity_id: number
  to_entity_id: number
  to_entity_name: string
  to_entity_type: string
  relation_type: string
  notes: Record<string, unknown> | null
  created_at: string
}

const allRelations = ref<Relation[]>([])
const loadingRelations = ref(false)

// Computed: Filter faction memberships
const factionMemberships = computed(() =>
  allRelations.value.filter((rel) => rel.to_entity_type === 'Faction'),
)

// New membership state
const newMembership = ref({
  factionId: null as number | null,
  relationType: '',
  rank: '',
})
const addingMembership = ref(false)

// Suggested membership types (i18n)
const membershipTypeSuggestions = computed(() => [
  t('npcs.membershipTypes.member'),
  t('npcs.membershipTypes.leader'),
  t('npcs.membershipTypes.founder'),
  t('npcs.membershipTypes.officer'),
  t('npcs.membershipTypes.recruit'),
  t('npcs.membershipTypes.veteran'),
  t('npcs.membershipTypes.exile'),
])

// Membership editing state
const showEditMembershipDialog = ref(false)
const editingMembership = ref<Relation | null>(null)
const savingMembership = ref(false)
const membershipEditForm = ref({
  relationType: '',
  rank: '',
})

// Items state
const npcItems = ref<
  Array<{
    id: number
    relation_id: number
    name: string
    description: string | null
    relation_type: string
    quantity: number | null
    equipped: boolean
    image_url: string | null
    rarity: string | null
  }>
>([])

const addingItem = ref(false)

// Suggested item relation types (i18n)
// Notes state
const npcNotes = ref<
  Array<{
    id: number
    title: string | null
    summary: string
    date: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }>
>([])

// Memberships functions
async function loadAllRelations() {
  if (!editingNpc.value) return

  loadingRelations.value = true

  try {
    const relations = await $fetch<Relation[]>(`/api/npcs/${editingNpc.value.id}/all-relations`)
    allRelations.value = relations
  } catch (error) {
    console.error('Failed to load relations:', error)
    allRelations.value = []
  } finally {
    loadingRelations.value = false
  }
}

async function addFactionMembership(payload: { factionId: number; relationType: string; rank?: string }) {
  if (!editingNpc.value || !payload.factionId || !payload.relationType)
    return

  addingMembership.value = true

  try {
    await $fetch(`/api/npcs/${editingNpc.value.id}/relations`, {
      method: 'POST',
      body: {
        toEntityId: payload.factionId,
        relationType: payload.relationType,
        notes: payload.rank ? { rank: payload.rank } : null,
      },
    })

    await loadAllRelations()

    // Reload counts to update memberships count badge
    if (editingNpc.value) {
      await reloadNpcCounts(editingNpc.value)
    }
  } catch (error) {
    console.error('Failed to add faction membership:', error)
  } finally {
    addingMembership.value = false
  }
}

function editMembership(membership: Relation) {
  editingMembership.value = membership
  membershipEditForm.value = {
    relationType: membership.relation_type,
    rank: (membership.notes as { rank?: string })?.rank || '',
  }
  showEditMembershipDialog.value = true
}

async function saveMembership() {
  if (!editingMembership.value) return

  savingMembership.value = true

  try {
    const updated = await $fetch<Relation>(`/api/entity-relations/${editingMembership.value.id}`, {
      method: 'PATCH' as const,
      body: {
        relationType: membershipEditForm.value.relationType,
        notes: JSON.stringify({ rank: membershipEditForm.value.rank }),
      },
    })

    // Update in local array
    const index = allRelations.value.findIndex((r) => r.id === editingMembership.value!.id)
    if (index !== -1) {
      allRelations.value[index] = updated
    }

    closeEditMembershipDialog()
  } catch (error) {
    console.error('Failed to update membership:', error)
  } finally {
    savingMembership.value = false
  }
}

function closeEditMembershipDialog() {
  showEditMembershipDialog.value = false
  editingMembership.value = null
  membershipEditForm.value = {
    relationType: '',
    rank: '',
  }
}

async function removeMembership(relationId: number) {
  try {
    await $fetch<{ success: boolean }>(`/api/relations/${relationId}`, {
      method: 'DELETE' as const,
    })
    await loadAllRelations()
  } catch (error) {
    console.error('Failed to remove membership:', error)
  }
}

// Items functions
async function loadNpcItems() {
  if (!editingNpc.value) return

  try {
    const items = await $fetch<typeof npcItems.value>(`/api/entities/${editingNpc.value.id}/related/items`)
    npcItems.value = items
  } catch (error) {
    console.error('Failed to load NPC items:', error)
    npcItems.value = []
  }
}

async function addItemToNpc(payload: { itemId: number; relationType?: string; quantity?: number; equipped?: boolean }) {
  if (!editingNpc.value || !payload.itemId) return

  const relationType = payload.relationType || 'owns'

  addingItem.value = true

  try {
    await $fetch(`/api/npcs/${editingNpc.value.id}/items`, {
      method: 'POST',
      body: {
        itemId: payload.itemId,
        relationType,
        quantity: payload.quantity || undefined,
        equipped: payload.equipped,
      },
    })

    await loadNpcItems()

    // Reload counts for this NPC (item count changed)
    if (editingNpc.value) {
      await reloadNpcCounts(editingNpc.value)
    }
  } catch (error) {
    console.error('Failed to add item to NPC:', error)
  } finally {
    addingItem.value = false
  }
}

async function removeItem(relationId: number) {
  if (!editingNpc.value) return

  try {
    await $fetch<{ success: boolean }>(`/api/relations/${relationId}`, {
      method: 'DELETE' as const,
    })
    await loadNpcItems()

    // Reload counts for this NPC (item count changed)
    await reloadNpcCounts(editingNpc.value)
  } catch (error) {
    console.error('Failed to remove item:', error)
  }
}

async function editNpc(npc: NPC) {
  editingNpc.value = npc
  npcForm.value = {
    name: npc.name,
    description: npc.description || '',
    metadata: {
      race: npc.metadata?.race || '',
      class: npc.metadata?.class || '',
      type: npc.metadata?.type || undefined,
      status: npc.metadata?.status || undefined,
      age: npc.metadata?.age || undefined,
      gender: npc.metadata?.gender || undefined,
    },
  }

  // Load existing NPC relations
  try {
    const relations = await $fetch<typeof npcRelations.value>(`/api/npcs/${npc.id}/relations`)
    npcRelations.value = relations
  } catch (error) {
    console.error('Failed to load NPC relations:', error)
    npcRelations.value = []
  }

  // Load existing Location relations and add to npcRelations
  try {
    const locationRelations = await $fetch<
      Array<{
        id: number
        relation_id: number
        name: string
        description?: string
        relation_type?: string
        notes?: string | null
        image_url?: string
        type?: string
        region?: string
      }>
    >(`/api/entities/${npc.id}/related/locations`)

    // Map locations to the same structure as npcRelations (legacy format)
    const mappedLocationRelations = locationRelations.map((loc) => ({
      id: loc.relation_id,
      related_npc_id: loc.id,
      related_npc_name: loc.name,
      related_npc_type: 'Location',
      relation_type: loc.relation_type || '',
      notes: loc.notes || null,
      image_url: loc.image_url || null,
      direction: 'outgoing' as const,
      // Legacy fields for backwards compat
      to_entity_id: loc.id,
      to_entity_name: loc.name,
      to_entity_type: 'Location',
    }))

    // Append location relations to npcRelations
    npcRelations.value.push(...mappedLocationRelations)
  } catch (error) {
    console.error('Failed to load location relations:', error)
  }

  // Load all relations (memberships + NPC relations)
  await loadAllRelations()

  // Load items
  await loadNpcItems()

  showCreateDialog.value = true
  npcDialogTab.value = 'details'
}

// View NPC (read-only mode)
async function viewNpc(npc: NPC) {
  // If dialog is already open, push current NPC to stack
  if (showViewDialog.value && viewingNpc.value) {
    npcViewStack.value.push(viewingNpc.value)
  }

  viewingNpc.value = npc
  showViewDialog.value = true
}

async function handleEditFromView(npc: NPC) {
  // Close view dialog
  showViewDialog.value = false
  viewingNpc.value = null

  // Open edit dialog
  await editNpc(npc)
}

// View NPC by ID (from relations in view dialog)
async function viewNpcById(npcId: number) {
  const npc = entitiesStore.npcs?.find((n) => n.id === npcId)
  if (npc) {
    viewNpc(npc)
  } else {
    console.error('NPC not found in store:', npcId)
  }
}

// View Item by ID (from items in view dialog)
async function viewItemById(itemId: number) {
  // TODO: Implement ItemViewDialog
  // For now, just a placeholder. We'll implement this when ItemViewDialog is created
  console.error('viewItemById not implemented yet:', itemId)
}

// View Location by ID (from locations in view dialog)
async function viewLocationById(locationId: number) {
  // Navigate to locations page with highlight
  await navigateTo(`/locations?highlight=${locationId}`)
}

// Go back to previous NPC in view stack
function goBackInNpcView() {
  const previousNpc = npcViewStack.value.pop()
  if (previousNpc) {
    viewingNpc.value = previousNpc
  }
}

// When closing dialog, clear the stack
watch(showViewDialog, (isOpen) => {
  if (!isOpen) {
    npcViewStack.value = []
    viewingNpc.value = null
  }
})

function deleteNpc(npc: NPC) {
  deletingNpc.value = npc
  showDeleteDialog.value = true
}

// AI Name Generation
// Name generation now handled in NpcEditDialog component

async function saveNpc() {
  if (!activeCampaignId.value!) return

  saving.value = true

  try {
    let savedNpcId: number

    if (editingNpc.value) {
      // Store updates this.npcs[index] reactively
      await entitiesStore.updateNPC(editingNpc.value.id, {
        name: npcForm.value.name,
        description: npcForm.value.description,
        metadata: npcForm.value.metadata,
      })
      savedNpcId = editingNpc.value.id
    } else {
      // Store pushes to this.npcs reactively
      const newNpc = await entitiesStore.createNPC(activeCampaignId.value, npcForm.value)
      savedNpcId = newNpc.id
    }

    // If user is searching, re-execute search to update FTS5 results
    // (metadata changed, need fresh FTS5 index)
    if (searchQuery.value && searchQuery.value.trim().length > 0) {
      await executeSearch(searchQuery.value)
    }
    // else: Store already updated reactively, no fetch needed!

    // Reload counts for the saved NPC (get NPC from store, not API response!)
    const npcFromStore = entitiesStore.npcs.find((n) => n.id === savedNpcId)
    if (npcFromStore) {
      await reloadNpcCounts(npcFromStore)
    }

    closeDialog()
  } catch (error) {
    console.error('Failed to save NPC:', error)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingNpc.value) return

  deleting.value = true

  try {
    await entitiesStore.deleteNPC(deletingNpc.value.id)

    // If user is searching, remove from search results
    if (searchQuery.value && searchQuery.value.trim().length > 0) {
      const deleteIndex = searchResults.value.findIndex((n) => n.id === deletingNpc.value?.id)
      if (deleteIndex !== -1) {
        searchResults.value.splice(deleteIndex, 1)
      }
    }

    showDeleteDialog.value = false
    deletingNpc.value = null
  } catch (error) {
    console.error('Failed to delete NPC:', error)
  } finally {
    deleting.value = false
  }
}

async function addNpcRelation() {
  if (!editingNpc.value || !newNpcRelation.value.npcId) return

  addingNpcRelation.value = true

  try {
    const relation = await $fetch<Relation>(`/api/npcs/${editingNpc.value.id}/relations`, {
      method: 'POST',
      body: {
        toEntityId: newNpcRelation.value.npcId,
        relationType: newNpcRelation.value.relationType || t('npcs.npcRelationTypes.ally'),
        notes: newNpcRelation.value.notes || null,
      },
    })

    npcRelations.value.push({
      id: relation.id,
      related_npc_id: relation.to_entity_id,
      related_npc_name: relation.to_entity_name,
      related_npc_type: relation.to_entity_type,
      relation_type: relation.relation_type,
      notes: typeof relation.notes === 'string' ? relation.notes : null,
      image_url: null,
      direction: 'outgoing',
      // Legacy fields
      to_entity_id: relation.to_entity_id,
      to_entity_name: relation.to_entity_name,
      to_entity_type: relation.to_entity_type,
    })

    // Reload counts to update NPC relations count badge
    if (editingNpc.value) {
      await reloadNpcCounts(editingNpc.value)
    }

    newNpcRelation.value = {
      npcId: null,
      relationType: '',
      notes: '',
    }
  } catch (error) {
    console.error('Failed to add NPC relation:', error)
  } finally {
    addingNpcRelation.value = false
  }
}

function closeDialog() {
  showCreateDialog.value = false
  editingNpc.value = null
  npcRelations.value = []
  npcNotes.value = []
  npcDialogTab.value = 'details'
  allRelations.value = []
  newRelation.value = {
    locationId: null,
    relationType: '',
    notes: '',
  }
  newMembership.value = {
    factionId: null,
    relationType: '',
    rank: '',
  }
  newNpcRelation.value = {
    npcId: null,
    relationType: '',
    notes: '',
  }
  npcForm.value = {
    name: '',
    description: '',
    metadata: {
      race: '',
      class: '',
      type: undefined,
      status: undefined,
      age: undefined,
      gender: undefined,
    },
  }
}

// Lore for autocomplete (used in EntityLoreTab)
const loreForSelect = computed(() => entitiesStore.loreForSelect)

// Load linked lore when editing NPC
watch(
  () => editingNpc.value?.id,
  async (npcId) => {
    if (npcId) {
      await loadLinkedLore(npcId)
    } else {
      linkedLore.value = []
    }
  },
)

// Load linked lore entries
async function loadLinkedLore(npcId: number) {
  loadingLore.value = true
  try {
    const relations = await $fetch<
      Array<{ id: number; name: string; description: string | null; image_url: string | null }>
    >(`/api/entities/${npcId}/related/lore`)
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
  if (!editingNpc.value || !loreId) return

  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: editingNpc.value.id,
        toEntityId: loreId,
        relationType: 'kennt',
      },
    })

    await loadLinkedLore(editingNpc.value.id)

    // Reload counts for this NPC (lore count changed)
    await reloadNpcCounts(editingNpc.value)
  } catch (error) {
    console.error('Failed to add lore relation:', error)
  }
}

// Remove lore relation
async function removeLoreRelation(relationId: number) {
  if (!editingNpc.value) return

  try {
    await $fetch(`/api/entity-relations/${relationId}`, {
      method: 'DELETE',
    })

    await loadLinkedLore(editingNpc.value.id)
    await reloadNpcCounts(editingNpc.value)
  } catch (error) {
    console.error('Failed to remove lore relation:', error)
  }
}

// Handle documents changed event (from EntityDocuments)
async function handleDocumentsChanged() {
  if (editingNpc.value) {
    await reloadNpcCounts(editingNpc.value)
  }
}

// Handle players changed event (from EntityPlayersTab)
async function handlePlayersChanged() {
  if (editingNpc.value) {
    await reloadNpcCounts(editingNpc.value)
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

/* Highlighted card animation */
.highlighted-card {
  animation: highlight-pulse 2s ease-in-out;
  box-shadow: 0 0 0 3px rgb(var(--v-theme-primary)) !important;
}

/* NPC Card Hover Effect */
.npc-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.npc-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}

/* NPC Description - Fixed 3 lines */
.npc-description {
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  min-height: calc(1.5em * 3); /* 3 lines */
  max-height: calc(1.5em * 3);
}

@keyframes highlight-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgb(var(--v-theme-primary));
  }
  50% {
    box-shadow: 0 0 20px 5px rgb(var(--v-theme-primary));
  }
}
</style>
