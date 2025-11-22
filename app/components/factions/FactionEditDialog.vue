<template>
  <v-dialog
    :model-value="show"
    max-width="800"
    :persistent="saving || uploadingImage || generatingImage"
    @update:model-value="handleUpdateShow"
  >
    <v-card>
      <v-card-title>
        {{ editingFaction ? $t('factions.edit') : $t('factions.create') }}
      </v-card-title>

      <!-- Tabs (only in edit mode) -->
      <v-tabs v-if="editingFaction" :model-value="activeTab" class="mb-4" @update:model-value="handleUpdateActiveTab">
        <v-tab value="details">
          <v-icon start>mdi-shield-account</v-icon>
          {{ $t('common.details') }}
        </v-tab>
        <v-tab value="images">
          <v-icon start>mdi-image-multiple</v-icon>
          {{ $t('common.images') }} ({{ editingFaction._counts?.images ?? 0 }})
        </v-tab>
        <v-tab value="documents">
          <v-icon start>mdi-file-document</v-icon>
          {{ $t('documents.title') }} ({{ editingFaction._counts?.documents ?? 0 }})
        </v-tab>
        <v-tab value="members">
          <v-icon start>mdi-account-group</v-icon>
          {{ $t('factions.members') }} ({{ editingFaction._counts?.members ?? 0 }})
        </v-tab>
        <v-tab value="items">
          <v-icon start>mdi-treasure-chest</v-icon>
          {{ $t('common.items') }} ({{ editingFaction._counts?.items ?? 0 }})
        </v-tab>
        <v-tab value="locations">
          <v-icon start>mdi-map-marker</v-icon>
          {{ $t('common.locations') }} ({{ editingFaction._counts?.locations ?? 0 }})
        </v-tab>
        <v-tab value="lore">
          <v-icon start>mdi-book-open-variant</v-icon>
          {{ $t('common.lore') }} ({{ editingFaction._counts?.lore ?? 0 }})
        </v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-if="editingFaction" :model-value="activeTab">
          <!-- Details Tab -->
          <v-tabs-window-item value="details">
            <FactionDetailsForm
              :model-value="form"
              :npcs="availableNpcs"
              :is-edit-mode="true"
              :image-url="editingFaction.image_url"
              :uploading-image="uploadingImage"
              :generating-image="generatingImage"
              :deleting-image="deletingImage"
              :has-api-key="hasApiKey"
              @update:model-value="updateForm"
              @preview-image="(url) => emit('preview-image', url)"
              @upload-click="emit('upload-click')"
              @generate-image="emit('generate-image')"
              @download-image="emit('download-image')"
              @delete-image="emit('delete-image')"
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
              @preview-image="(url) => emit('preview-image', url)"
              @generating="(isGenerating) => emit('image-generating', isGenerating)"
              @images-updated="emit('images-changed')"
            />
          </v-tabs-window-item>

          <!-- Documents Tab -->
          <v-tabs-window-item value="documents">
            <EntityDocuments
              v-if="editingFaction"
              :entity-id="editingFaction.id"
              entity-type="Faction"
              @changed="emit('documents-changed')"
            />
          </v-tabs-window-item>

          <!-- Members Tab -->
          <v-tabs-window-item value="members">
            <EntityNpcsTab
              :linked-npcs="factionMembers"
              :available-npcs="availableNpcs"
              :loading="loadingMembers || addingMember"
              :show-avatar="false"
              :show-membership-type="true"
              :show-rank="true"
              :membership-type-suggestions="membershipTypeSuggestions"
              @add="handleAddMember"
              @remove="handleRemoveMember"
            />
          </v-tabs-window-item>

          <!-- Items Tab -->
          <v-tabs-window-item value="items">
            <EntityItemsTab
              :linked-items="linkedItems"
              :available-items="availableItems"
              :show-avatar="true"
              @add="handleAddItem"
              @remove="handleRemoveItem"
            />
          </v-tabs-window-item>

          <!-- Locations Tab -->
          <v-tabs-window-item value="locations">
            <FactionLocationsTab
              :locations="factionLocations"
              :available-locations="availableLocations"
              :loading-locations="loadingLocations"
              :adding="addingLocation"
              @add="handleAddLocation"
              @remove="handleRemoveLocation"
            />
          </v-tabs-window-item>

          <!-- Lore Tab -->
          <v-tabs-window-item value="lore">
            <EntityLoreTab
              :linked-lore="linkedLore"
              :available-lore="availableLore"
              @add="handleAddLore"
              @remove="handleRemoveLore"
            />
          </v-tabs-window-item>
        </v-tabs-window>

        <!-- Form when creating (no tabs) -->
        <FactionDetailsForm
          v-if="!editingFaction"
          :model-value="form"
          :npcs="availableNpcs"
          :is-edit-mode="false"
          @update:model-value="updateForm"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="saving || uploadingImage || generatingImage"
          @click="emit('close')"
        >
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="uploadingImage || generatingImage"
          @click="emit('save')"
        >
          {{ editingFaction ? $t('common.save') : $t('common.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Faction, FactionMetadata } from '~~/types/faction'
import type { NPC } from '~~/types/npc'
import type { Location } from '~~/types/location'
import FactionDetailsForm from './FactionDetailsForm.vue'
import EntityNpcsTab from '~/components/shared/EntityNpcsTab.vue'
import FactionLocationsTab from './FactionLocationsTab.vue'
import EntityItemsTab from '~/components/shared/EntityItemsTab.vue'
import EntityLoreTab from '~/components/shared/EntityLoreTab.vue'
import EntityImageGallery from '~/components/shared/EntityImageGallery.vue'
import EntityDocuments from '~/components/shared/EntityDocuments.vue'

const { t } = useI18n()

// Membership type suggestions for faction members
const membershipTypeSuggestions = computed(() => [
  { title: t('factions.membershipTypes.member'), value: 'member' },
  { title: t('factions.membershipTypes.leader'), value: 'leader' },
  { title: t('factions.membershipTypes.founder'), value: 'founder' },
  { title: t('factions.membershipTypes.officer'), value: 'officer' },
  { title: t('factions.membershipTypes.recruit'), value: 'recruit' },
  { title: t('factions.membershipTypes.veteran'), value: 'veteran' },
  { title: t('factions.membershipTypes.exile'), value: 'exile' },
])

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

interface FactionForm {
  name: string
  description: string
  leaderId: number | null
  metadata: FactionMetadata
}

interface Props {
  show: boolean
  editingFaction: (Faction & { _counts?: { members: number; items: number; locations: number; lore: number; documents: number; images: number } }) | null
  form: FactionForm
  activeTab: string
  factionMembers: FactionMember[]
  linkedItems: Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
    direction?: 'outgoing' | 'incoming'
  }>
  factionLocations: FactionLocation[]
  linkedLore: Array<{ id: number; name: string; description: string | null; image_url: string | null }>
  availableNpcs: Array<Pick<NPC, 'id' | 'name' | 'image_url'>>
  availableLocations: Array<Pick<Location, 'id' | 'name' | 'image_url'>>
  availableItems: Array<{ id: number; name: string }>
  availableLore: Array<{ id: number; name: string }>
  saving: boolean
  uploadingImage: boolean
  generatingImage: boolean
  deletingImage: boolean
  loadingMembers: boolean
  loadingLocations: boolean
  addingMember: boolean
  addingLocation: boolean
  hasApiKey: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:form': [value: FactionForm]
  'update:activeTab': [value: string]
  'preview-image': [url: string]
  'upload-click': []
  'generate-image': []
  'download-image': []
  'delete-image': []
  'image-generating': [isGenerating: boolean]
  'images-changed': []
  'documents-changed': []
  'add-member': [payload: { npcId: number; relationType: string; rank?: string }]
  'remove-member': [relationId: number]
  'add-location': [payload: { locationId: number; relationType: string }]
  'remove-location': [relationId: number]
  'add-item': [itemId: number]
  'remove-item': [relationId: number]
  'add-lore': [loreId: number]
  'remove-lore': [loreId: number]
  save: []
  close: []
}>()

// Helper functions to fix TypeScript emit overload issue
function updateForm(value: FactionForm) {
  emit('update:form', value)
}

function handleUpdateShow(value: unknown) {
  emit('update:show', value as boolean)
}

function handleUpdateActiveTab(value: unknown) {
  emit('update:activeTab', value as string)
}

function handleAddMember(payload: { npcId: number; membershipType?: string; rank?: string }) {
  emit('add-member', {
    npcId: payload.npcId,
    relationType: payload.membershipType || 'member',
    rank: payload.rank,
  })
}

function handleRemoveMember(relationId: number) {
  emit('remove-member', relationId)
}

function handleAddLocation(payload: { locationId: number; relationType: string }) {
  emit('add-location', payload)
}

function handleRemoveLocation(relationId: number) {
  emit('remove-location', relationId)
}

function handleAddItem(payload: { itemId: number }) {
  emit('add-item', payload.itemId)
}

function handleRemoveItem(relationId: number) {
  emit('remove-item', relationId)
}

function handleAddLore(loreId: number) {
  emit('add-lore', loreId)
}

function handleRemoveLore(loreId: number) {
  emit('remove-lore', loreId)
}
</script>
