<template>
  <v-container>
    <UiPageHeader :title="$t('players.title')" :subtitle="$t('players.subtitle')">
      <template #actions>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="large"
          @click="openCreateDialog"
        >
          {{ $t('players.create') }}
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

    <!-- Loading Skeleton -->
    <v-row v-if="loading">
      <v-col v-for="i in 6" :key="i" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <!-- Player Cards with Search Overlay -->
    <div v-else-if="filteredPlayers.length > 0" class="position-relative">
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

      <!-- Player Cards -->
      <v-row>
        <v-col v-for="player in filteredPlayers" :key="player.id" cols="12" sm="6" md="4" lg="3">
          <PlayerCard
            :player="player"
            :is-highlighted="highlightedId === player.id"
            @view="viewPlayer"
            @edit="editPlayer"
            @download="handleDownload"
            @delete="confirmDelete"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Empty State -->
    <div v-else>
      <ClientOnly>
        <v-empty-state
          icon="mdi-account-star-outline"
          :title="$t('players.empty')"
          :text="$t('players.emptyText')"
        >
          <template #actions>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
              {{ $t('players.create') }}
            </v-btn>
          </template>
        </v-empty-state>
      </ClientOnly>
    </div>

    <!-- Create/Edit Dialog -->
    <PlayerEditDialog
      :show="showDialog"
      :editing-player="editingPlayer"
      :form="form"
      :active-tab="activeTab"
      :saving="saving"
      @update:show="showDialog = $event"
      @update:form="form = $event"
      @update:active-tab="activeTab = $event"
      @save="savePlayer"
      @close="closeDialog"
      @image-changed="reloadPlayerCounts"
      @counts-changed="reloadPlayerCounts"
      @open-image-preview="openImagePreview"
    />

    <!-- Delete Confirmation -->
    <UiDeleteConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('players.deleteTitle')"
      :message="$t('players.deleteConfirm', { name: deletingPlayer?.name })"
      :loading="deleting"
      @confirm="deletePlayer"
      @cancel="showDeleteDialog = false"
    />

    <!-- Image Preview Dialog (from dialog) -->
    <v-dialog v-model="showImagePreview" max-width="1200">
      <v-card>
        <v-card-title class="d-flex align-center">
          {{ previewImageName }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showImagePreview = false" />
        </v-card-title>
        <v-card-text class="pa-0">
          <v-img :src="previewImageUrl" max-height="80vh" contain />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import type { Player, PlayerMetadata } from '../../../types/player'
import PlayerEditDialog from '~/components/players/PlayerEditDialog.vue'
import PlayerCard from '~/components/players/PlayerCard.vue'
import { useImageDownload } from '~/composables/useImageDownload'
import { usePlayerCounts } from '~/composables/usePlayerCounts'

const route = useRoute()
const campaignStore = useCampaignStore()
const entitiesStore = useEntitiesStore()
const { downloadImage } = useImageDownload()
const { reloadPlayerCounts: reloadCounts } = usePlayerCounts()

const activeCampaignId = computed(() => campaignStore.activeCampaignId)

// Highlight from route query (for global search navigation)
const highlightedId = ref<number | null>(null)

// State
const searchQuery = ref('')
const searchResults = ref<Player[]>([])
const searching = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editingPlayer = ref<Player | null>(null)
const deletingPlayer = ref<Player | null>(null)
const activeTab = ref('details')

// Image preview
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageName = ref('')

const form = ref({
  name: '',
  description: '',
  metadata: {
    player_name: '',
    inspiration: 0,
    email: '',
    discord: '',
    phone: '',
    notes: '',
  } as PlayerMetadata,
})

// Computed
const loading = computed(() => entitiesStore.playersLoading)
const players = computed(() => entitiesStore.players)

const filteredPlayers = computed(() => {
  // If searching, use search results from API
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    return searchResults.value
  }
  // Otherwise return cached players
  return players.value
})

// Watch search query with debounce - API-based search for cross-entity support
watch(searchQuery, async (query) => {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (!query || query.trim().length === 0) {
    searchResults.value = []
    searching.value = false
    return
  }

  searching.value = true

  searchTimeout = setTimeout(async () => {
    try {
      const results = await $fetch<Player[]>('/api/players', {
        query: {
          campaignId: activeCampaignId.value,
          search: query.trim(),
        },
      })
      searchResults.value = results
    } catch (error) {
      console.error('Player search failed:', error)
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

// Load data
onMounted(async () => {
  if (activeCampaignId.value) {
    await Promise.all([
      entitiesStore.fetchPlayers(activeCampaignId.value),
      entitiesStore.fetchNPCs(activeCampaignId.value),
      entitiesStore.fetchItems(activeCampaignId.value),
      entitiesStore.fetchLocations(activeCampaignId.value),
      entitiesStore.fetchFactions(activeCampaignId.value),
      entitiesStore.fetchLore(activeCampaignId.value),
    ])
  }
})

// Methods
function openCreateDialog() {
  editingPlayer.value = null
  activeTab.value = 'details'
  form.value = {
    name: '',
    description: '',
    metadata: {
      player_name: '',
      inspiration: 0,
      email: '',
      discord: '',
      phone: '',
      notes: '',
    },
  }
  showDialog.value = true
}

function viewPlayer(player: Player) {
  editPlayer(player)
}

async function editPlayer(player: Player) {
  editingPlayer.value = player
  activeTab.value = 'details'
  form.value = {
    name: player.name,
    description: player.description || '',
    metadata: {
      player_name: player.metadata?.player_name || '',
      inspiration: player.metadata?.inspiration || 0,
      email: player.metadata?.email || '',
      discord: player.metadata?.discord || '',
      phone: player.metadata?.phone || '',
      notes: player.metadata?.notes || '',
    },
  }

  // Load counts
  await reloadPlayerCounts()

  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingPlayer.value = null
}

async function savePlayer() {
  if (!activeCampaignId.value || !form.value.name) return

  saving.value = true
  try {
    const data = {
      name: form.value.name,
      description: form.value.description || null,
      metadata: form.value.metadata,
    }

    if (editingPlayer.value) {
      await entitiesStore.updatePlayer(editingPlayer.value.id, data)
    } else {
      await entitiesStore.createPlayer(activeCampaignId.value, data)
    }

    // Reload players and close dialog
    await entitiesStore.fetchPlayers(activeCampaignId.value)
    closeDialog()
  } catch (error) {
    console.error('Failed to save player:', error)
  } finally {
    saving.value = false
  }
}

async function reloadPlayerCounts() {
  if (!editingPlayer.value) return

  try {
    // Reload counts using the composable
    await reloadCounts(editingPlayer.value)

    // Update editingPlayer with fresh counts from the player object
    editingPlayer.value = { ...editingPlayer.value }
  } catch (error) {
    console.error('Failed to reload player counts:', error)
  }
}

function confirmDelete(player: Player) {
  deletingPlayer.value = player
  showDeleteDialog.value = true
}

async function deletePlayer() {
  if (!deletingPlayer.value) return

  deleting.value = true
  try {
    await entitiesStore.deletePlayer(deletingPlayer.value.id)
    showDeleteDialog.value = false
    deletingPlayer.value = null
  } catch (error) {
    console.error('Failed to delete player:', error)
  } finally {
    deleting.value = false
  }
}

function openImagePreview(url: string, name: string) {
  previewImageUrl.value = url
  previewImageName.value = name
  showImagePreview.value = true
}

function handleDownload(player: Player) {
  if (player.image_url) {
    downloadImage(`/uploads/${player.image_url}`, player.name)
  }
}

// Handle highlight from route query (global search navigation)
watch(
  () => route.query,
  async (query) => {
    if (query.highlight) {
      highlightedId.value = Number(query.highlight)

      // Set search query if provided
      if (query.search) {
        searchQuery.value = String(query.search)
      }

      // Scroll to highlighted player after data loads
      await nextTick()
      setTimeout(() => {
        const element = document.getElementById(`player-${highlightedId.value}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)

      // Clear highlight after animation
      setTimeout(() => {
        highlightedId.value = null
      }, 3000)
    }
  },
  { immediate: true },
)

// Clear highlight when user types in search
watch(searchQuery, (newVal, oldVal) => {
  if (newVal !== oldVal && highlightedId.value) {
    highlightedId.value = null
  }
})
</script>

