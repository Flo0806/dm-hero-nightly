<template>
  <v-dialog :model-value="show" max-width="900" scrollable @update:model-value="(v) => emit('update:show', v)">
    <v-card>
      <v-card-title>
        {{ editingNpc ? $t('npcs.edit') : $t('npcs.create') }}
      </v-card-title>

      <v-tabs v-if="editingNpc" :model-value="activeTab" class="mb-4" @update:model-value="(v) => emit('update:activeTab', v as string)">
        <v-tab value="details">
          <v-icon start> mdi-account-details </v-icon>
          {{ $t('npcs.details') }}
        </v-tab>
        <v-tab value="npcRelations">
          <v-icon start> mdi-account-multiple </v-icon>
          {{ $t('npcs.npcRelations') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.relations || 0 }}</v-chip>
        </v-tab>
        <v-tab value="locations">
          <v-icon start> mdi-map-marker </v-icon>
          {{ $t('npcs.linkedLocations') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.locations || 0 }}</v-chip>
        </v-tab>
        <v-tab value="memberships">
          <v-icon start> mdi-shield-account </v-icon>
          {{ $t('npcs.memberships') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.memberships || 0 }}</v-chip>
        </v-tab>
        <v-tab value="items">
          <v-icon start> mdi-sword </v-icon>
          {{ $t('npcs.items') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.items || 0 }}</v-chip>
        </v-tab>
        <v-tab value="notes">
          <v-icon start> mdi-note-text </v-icon>
          {{ $t('npcs.notes') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.notes || 0 }}</v-chip>
        </v-tab>
        <v-tab value="documents">
          <v-icon start> mdi-file-document </v-icon>
          {{ $t('documents.title') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.documents || 0 }}</v-chip>
        </v-tab>
        <v-tab value="lore">
          <v-icon start>mdi-book-open-variant</v-icon>
          {{ $t('npcs.badgeTooltips.lore') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.lore || 0 }}</v-chip>
        </v-tab>
        <v-tab value="players">
          <v-icon start>mdi-account-star</v-icon>
          {{ $t('players.title') }}
          <v-chip size="x-small" class="ml-2">{{ editingNpc?._counts?.players || 0 }}</v-chip>
        </v-tab>
      </v-tabs>

      <v-card-text style="max-height: 600px">
        <v-tabs-window v-if="editingNpc" :model-value="activeTab">
          <!-- Details Tab -->
          <v-tabs-window-item value="details">
            <!-- Hidden file input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleImageUpload"
            />

            <!-- Image Upload Section -->
            <EntityImageUpload
              class="mb-4"
              :image-url="editingNpc?.image_url"
              :entity-name="form.name"
              entity-type="NPC"
              :uploading="uploadingImage"
              :generating="generatingImage"
              :deleting="deletingImage"
              :has-api-key="hasApiKey"
              :generate-disabled="!form.name || uploadingImage || deletingImage || generatingImage || !hasApiKey"
              :avatar-size="160"
              default-icon="mdi-account"
              @preview-image="handleImagePreview"
              @upload="triggerImageUpload"
              @generate="generateImage"
              @download="downloadImage"
              @delete="deleteImage"
            />

            <v-text-field
              :model-value="form.name"
              :label="$t('npcs.name')"
              :rules="[(v: string) => !!v || $t('npcs.nameRequired')]"
              variant="outlined"
              class="mb-4"
              @update:model-value="$emit('update:form', { ...form, name: $event })"
            >
              <template #append-inner>
                <v-btn
                  :loading="generatingName"
                  icon="mdi-auto-fix"
                  variant="text"
                  size="small"
                  color="primary"
                  @click="generateName"
                />
              </template>
            </v-text-field>

            <v-textarea
              :model-value="form.description"
              :label="$t('npcs.description')"
              variant="outlined"
              rows="4"
              class="mb-4"
              @update:model-value="$emit('update:form', { ...form, description: $event })"
            />

            <!-- Race & Class -->
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  :key="`race-${locale}`"
                  :model-value="form.metadata.race"
                  :items="raceItems"
                  :label="$t('npcs.race')"
                  variant="outlined"
                  clearable
                  item-title="title"
                  item-value="value"
                  @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, race: $event } })"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  :key="`class-${locale}`"
                  :model-value="form.metadata.class"
                  :items="classItems"
                  :label="$t('npcs.class')"
                  variant="outlined"
                  clearable
                  item-title="title"
                  item-value="value"
                  @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, class: $event } })"
                />
              </v-col>
            </v-row>

            <!-- Age & Gender -->
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="form.metadata.age"
                  :label="$t('npcs.age')"
                  variant="outlined"
                  type="number"
                  min="0"
                  clearable
                  @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, age: $event ? Number($event) : undefined } })"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  :model-value="form.metadata.gender"
                  :label="$t('npcs.gender')"
                  :items="genderItems"
                  variant="outlined"
                  clearable
                  @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, gender: $event } })"
                />
              </v-col>
            </v-row>

            <!-- Type & Status -->
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  :model-value="form.metadata.type"
                  :items="npcTypes"
                  :label="$t('npcs.type')"
                  variant="outlined"
                  clearable
                  @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, type: $event } })"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <v-icon :icon="getNpcTypeIcon(item.value)" />
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-chip>
                      <template #prepend>
                        <v-icon :icon="getNpcTypeIcon(item.value)" size="small" class="mr-1" />
                      </template>
                      {{ item.title }}
                    </v-chip>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  :model-value="form.metadata.status"
                  :items="npcStatuses"
                  :label="$t('npcs.status')"
                  variant="outlined"
                  clearable
                  @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, status: $event } })"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <v-icon :icon="getNpcStatusIcon(item.value)" :color="getNpcStatusColor(item.value)" />
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-chip :color="getNpcStatusColor(item.value)">
                      <template #prepend>
                        <v-icon :icon="getNpcStatusIcon(item.value)" size="small" class="mr-1" />
                      </template>
                      {{ item.title }}
                    </v-chip>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- NPC Relations Tab -->
          <v-tabs-window-item value="npcRelations">
            <NpcRelationsTab
              v-if="editingNpc"
              :npc-relations="npcRelations"
              :available-npcs="availableNpcs"
              :adding="addingNpcRelation"
              @add="$emit('add-npc-relation', $event)"
            />
          </v-tabs-window-item>

          <!-- Locations Tab -->
          <v-tabs-window-item value="locations">
            <EntityLocationsTab v-if="editingNpc" :entity-id="editingNpc.id" />
          </v-tabs-window-item>

          <!-- Memberships Tab -->
          <v-tabs-window-item value="memberships">
            <NpcMembershipsTab
              :memberships="factionMemberships"
              :factions="availableFactions"
              :adding="addingMembership"
              @add="$emit('add-membership', $event)"
              @edit="$emit('edit-membership', $event)"
              @remove="$emit('remove-membership', $event)"
            />
          </v-tabs-window-item>

          <!-- Items Tab -->
          <v-tabs-window-item value="items">
            <EntityItemsTab
              :linked-items="npcItems"
              :available-items="availableItems"
              :loading="addingItem"
              :show-avatar="false"
              :show-relation-type="true"
              :show-quantity="true"
              :show-equipped="true"
              :show-rarity="true"
              :relation-type-suggestions="npcItemRelationTypeSuggestions"
              @add="(payload) => $emit('add-item', payload)"
              @remove="(id) => $emit('remove-item', id)"
            />
          </v-tabs-window-item>

          <!-- Notes Tab -->
          <v-tabs-window-item value="notes">
            <NpcNotesTab v-if="editingNpc" :npc-id="editingNpc.id" />
          </v-tabs-window-item>

          <!-- Documents Tab -->
          <v-tabs-window-item value="documents">
            <EntityDocuments v-if="editingNpc" :entity-id="editingNpc.id" @changed="$emit('documents-changed')" />
          </v-tabs-window-item>

          <!-- Lore Tab -->
          <v-tabs-window-item value="lore">
            <EntityLoreTab
              v-if="editingNpc"
              :linked-lore="linkedLore"
              :available-lore="availableLore"
              :loading="loadingLore"
              @add="$emit('add-lore', $event)"
              @remove="$emit('remove-lore', $event)"
            />
          </v-tabs-window-item>

          <!-- Players Tab -->
          <v-tabs-window-item value="players">
            <EntityPlayersTab
              v-if="editingNpc"
              :entity-id="editingNpc.id"
              @changed="$emit('players-changed')"
            />
          </v-tabs-window-item>
        </v-tabs-window>

        <!-- Create Form (no tabs) -->
        <div v-if="!editingNpc">
          <v-text-field
            :model-value="form.name"
            :label="$t('npcs.name')"
            :rules="[(v: string) => !!v || $t('npcs.nameRequired')]"
            variant="outlined"
            class="mb-4"
            @update:model-value="$emit('update:form', { ...form, name: $event })"
          >
            <template #append-inner>
              <v-btn
                :loading="generatingName"
                icon="mdi-auto-fix"
                variant="text"
                size="small"
                color="primary"
                @click="$emit('generate-name')"
              />
            </template>
          </v-text-field>

          <v-textarea
            :model-value="form.description"
            :label="$t('npcs.description')"
            variant="outlined"
            rows="4"
            class="mb-4"
            @update:model-value="$emit('update:form', { ...form, description: $event })"
          />

          <!-- Race & Class -->
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                :key="`race-${locale}`"
                :model-value="form.metadata.race"
                :items="raceItems"
                :label="$t('npcs.race')"
                variant="outlined"
                clearable
                item-title="title"
                item-value="value"
                @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, race: $event } })"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                :key="`class-${locale}`"
                :model-value="form.metadata.class"
                :items="classItems"
                :label="$t('npcs.class')"
                variant="outlined"
                clearable
                item-title="title"
                item-value="value"
                @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, class: $event } })"
              />
            </v-col>
          </v-row>

          <!-- Age & Gender -->
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="form.metadata.age"
                :label="$t('npcs.age')"
                variant="outlined"
                type="number"
                min="0"
                clearable
                @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, age: $event ? Number($event) : undefined } })"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                :model-value="form.metadata.gender"
                :label="$t('npcs.gender')"
                :items="genderItems"
                variant="outlined"
                clearable
                @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, gender: $event } })"
              />
            </v-col>
          </v-row>

          <!-- Type & Status -->
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                :model-value="form.metadata.type"
                :items="npcTypes"
                :label="$t('npcs.type')"
                variant="outlined"
                clearable
                @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, type: $event } })"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon :icon="getNpcTypeIcon(item.value)" />
                    </template>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-chip>
                    <template #prepend>
                      <v-icon :icon="getNpcTypeIcon(item.value)" size="small" class="mr-1" />
                    </template>
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                :model-value="form.metadata.status"
                :items="npcStatuses"
                :label="$t('npcs.status')"
                variant="outlined"
                clearable
                @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, status: $event } })"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon :icon="getNpcStatusIcon(item.value)" :color="getNpcStatusColor(item.value)" />
                    </template>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-chip :color="getNpcStatusColor(item.value)">
                    <template #prepend>
                      <v-icon :icon="getNpcStatusIcon(item.value)" size="small" class="mr-1" />
                    </template>
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="saving || uploadingImage || deletingImage || generatingImage"
          @click="$emit('close')"
        >
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!form.name || uploadingImage || deletingImage || generatingImage"
          :loading="saving"
          @click="$emit('save')"
        >
          {{ editingNpc ? $t('common.save') : $t('common.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { NPC } from '~~/types/npc'
import type { Item } from '~~/types/item'
import type { Lore } from '~~/types/lore'
import type { NpcItem, NpcMembership } from '~~/types/npc-components'
import NpcRelationsTab from './NpcRelationsTab.vue'
import EntityLocationsTab from '../shared/EntityLocationsTab.vue'
import NpcMembershipsTab from './NpcMembershipsTab.vue'
import EntityItemsTab from '../shared/EntityItemsTab.vue'
import EntityLoreTab from '../shared/EntityLoreTab.vue'
import EntityPlayersTab from '../shared/EntityPlayersTab.vue'
import NpcNotesTab from './NpcNotesTab.vue'
import EntityDocuments from '../shared/EntityDocuments.vue'
import EntityImageUpload from '../shared/EntityImageUpload.vue'
import { useImageDownload } from '~/composables/useImageDownload'
import { useEntitiesStore } from '~/stores/entities'

const { locale, t } = useI18n()
const entitiesStore = useEntitiesStore()
const { downloadImage: downloadImageFile } = useImageDownload()

// NPC Type Icons
function getNpcTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    friendly: 'mdi-account-heart',
    neutral: 'mdi-account',
    hostile: 'mdi-account-alert',
    ally: 'mdi-account-check',
    merchant: 'mdi-storefront',
    quest_giver: 'mdi-script-text',
    boss: 'mdi-crown',
    companion: 'mdi-account-multiple',
  }
  return icons[type] || 'mdi-account'
}

// NPC Status Icons & Colors
function getNpcStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    alive: 'mdi-heart-pulse',
    dead: 'mdi-skull',
    unknown: 'mdi-help-circle',
    missing: 'mdi-magnify',
  }
  return icons[status] || 'mdi-help-circle'
}

function getNpcStatusColor(status: string): string {
  const colors: Record<string, string> = {
    alive: 'success',
    dead: 'error',
    unknown: 'grey',
    missing: 'warning',
  }
  return colors[status] || 'grey'
}

// Item relation type suggestions for NPCs
const npcItemRelationTypeSuggestions = computed(() => [
  { title: t('npcs.itemRelationTypes.owns'), value: 'owns' },
  { title: t('npcs.itemRelationTypes.carries'), value: 'carries' },
  { title: t('npcs.itemRelationTypes.wields'), value: 'wields' },
  { title: t('npcs.itemRelationTypes.wears'), value: 'wears' },
  { title: t('npcs.itemRelationTypes.seeks'), value: 'seeks' },
  { title: t('npcs.itemRelationTypes.guards'), value: 'guards' },
  { title: t('npcs.itemRelationTypes.stole'), value: 'stole' },
  { title: t('npcs.itemRelationTypes.lost'), value: 'lost' },
])

// Interfaces
interface NpcForm {
  name: string
  description: string
  metadata: {
    race?: string
    class?: string
    age?: number
    gender?: string
    type?: string
    status?: string
  }
}

// Relation types matching parent component
interface NpcRelation {
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
}

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

interface Props {
  show: boolean
  editingNpc: NPC | null
  form: NpcForm
  activeTab: string
  // Reference data for selects
  raceItems: Array<{ title: string; value: string }>
  classItems: Array<{ title: string; value: string }>
  genderItems: Array<{ title: string; value: string }>
  npcTypes: Array<{ title: string; value: string }>
  npcStatuses: Array<{ title: string; value: string }>
  // Relations data
  npcRelations: NpcRelation[]
  factionMemberships: NpcMembership[]
  npcItems: NpcItem[]
  linkedLore: Array<Pick<Lore, 'id' | 'name' | 'description' | 'image_url'>>
  // Available entities for selects
  availableNpcs: Array<Pick<NPC, 'id' | 'name' | 'image_url'>>
  availableFactions: Array<{ id: number; name: string }>
  availableItems: Array<Pick<Item, 'id' | 'name'>>
  availableLore: Array<{ id: number; name: string }>
  // Loading states
  saving: boolean
  addingNpcRelation: boolean
  addingMembership: boolean
  addingItem: boolean
  loadingLore: boolean
  // Other
  npcRelationCount: number
}

const props = defineProps<Props>()

// Image management state (moved from page)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const deletingImage = ref(false)
const generatingImage = ref(false)
const hasApiKey = ref(false)

// Name generation state (moved from page)
const generatingName = ref(false)

// Check if API key is available
onMounted(async () => {
  try {
    const result = await $fetch<{ hasKey: boolean }>('/api/settings/openai-key/check')
    hasApiKey.value = result.hasKey
  } catch {
    hasApiKey.value = false
  }
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:form': [value: NpcForm]
  'update:activeTab': [value: string]
  'open-image-preview': [url: string, name: string]
  'add-npc-relation': [payload: unknown]
  'add-membership': [payload: { factionId: number; relationType: string; rank?: string }]
  'add-item': [
    payload: {
      itemId: number
      relationType?: string
      quantity?: number
      equipped?: boolean
    },
  ]
  'edit-membership': [membership: Relation]
  'remove-membership': [id: number]
  'remove-item': [id: number]
  'add-lore': [id: number]
  'remove-lore': [id: number]
  save: []
  close: []
  'image-changed': []
  'documents-changed': []
  'players-changed': []
  'generate-name': []
}>()

// Image management functions (moved from page)
function triggerImageUpload() {
  fileInputRef.value?.click()
}

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0 || !props.editingNpc) return

  uploadingImage.value = true
  try {
    const formData = new FormData()
    const file = files[0]
    if (file) {
      formData.append('image', file)
    }

    // Use native fetch for FormData uploads
    const response = await fetch(`/api/entities/${props.editingNpc.id}/upload-image`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    await response.json()

    // Refresh the NPC in the store to update the image reactively
    await entitiesStore.refreshNPC(props.editingNpc.id)
    emit('image-changed')
  } catch (error) {
    console.error('Failed to upload image:', error)
    alert(t('npcs.uploadImageError'))
  } finally {
    uploadingImage.value = false
    if (target) target.value = ''
  }
}

async function generateImage() {
  if (!props.editingNpc || !props.form.name) return

  generatingImage.value = true

  try {
    // Build detailed prompt from all available NPC data
    const details = []

    // Race and Class (most important for visual appearance)
    if (props.form.metadata.race) {
      details.push(props.form.metadata.race)
    }
    if (props.form.metadata.class) {
      details.push(props.form.metadata.class)
    }

    // Name (required)
    details.push(props.form.name)

    // Description (free-form details)
    if (props.form.description) {
      details.push(props.form.description)
    }

    // Type (ally, enemy, neutral, etc.) - adds context
    if (props.form.metadata.type) {
      const typeTranslations: Record<string, string> = {
        ally: 'friendly ally',
        enemy: 'menacing enemy',
        neutral: 'neutral character',
        questgiver: 'wise quest giver',
        merchant: 'merchant',
        guard: 'guard',
        noble: 'noble',
        commoner: 'commoner',
        villain: 'villainous',
        mentor: 'wise mentor',
        companion: 'loyal companion',
        informant: 'secretive informant',
      }
      const typeDesc = typeTranslations[props.form.metadata.type] || props.form.metadata.type
      details.push(typeDesc)
    }

    // Status (alive, undead, etc.) - affects appearance
    if (props.form.metadata.status) {
      const statusTranslations: Record<string, string> = {
        alive: '',
        dead: '',
        missing: '',
        imprisoned: 'wearing chains',
        unknown: '',
        undead: 'undead, pale skin, glowing eyes',
      }
      const statusDesc = statusTranslations[props.form.metadata.status]
      if (statusDesc) {
        details.push(statusDesc)
      }
    }

    const prompt = details.filter((d) => d).join(', ')

    const result = await $fetch<{ imageUrl: string; revisedPrompt?: string }>(
      '/api/ai/generate-image',
      {
        method: 'POST',
        body: {
          prompt,
          entityName: props.form.name,
          entityType: 'NPC',
          style: 'fantasy-art',
        },
      },
    )

    if (result.imageUrl && props.editingNpc) {
      // Update the NPC with the generated image
      const response = await $fetch<{ success: boolean }>(
        `/api/entities/${props.editingNpc.id}/set-image`,
        {
          method: 'POST',
          body: {
            imageUrl: result.imageUrl.replace('/uploads/', ''), // Remove /uploads/ prefix
          },
        },
      )

      if (response.success) {
        // Refresh the NPC in the store to update the image reactively
        await entitiesStore.refreshNPC(props.editingNpc.id)
        emit('image-changed')
      }
    }
  } catch (error: unknown) {
    console.error('[NPC] Failed to generate image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
    alert(errorMessage)
  } finally {
    generatingImage.value = false
  }
}

async function deleteImage() {
  if (!props.editingNpc?.image_url) return

  deletingImage.value = true

  try {
    await $fetch<{ success: boolean }>(`/api/entities/${props.editingNpc.id}/delete-image`, {
      method: 'DELETE' as const,
    })

    // Emit event to parent to update the NPC
    emit('image-changed')
  } catch (error) {
    console.error('Failed to delete image:', error)
    alert(t('npcs.deleteImageError'))
  } finally {
    deletingImage.value = false
  }
}

function downloadImage() {
  if (!props.editingNpc?.image_url) return
  downloadImageFile(`/uploads/${props.editingNpc.image_url}`, props.form.name)
}

function handleImagePreview(url: string, name: string) {
  emit('open-image-preview', url, name)
}

// Name generation (moved from page)
async function generateName() {
  generatingName.value = true

  try {
    // Build context from current form data
    const context = []
    if (props.form.metadata.race) {
      context.push(props.form.metadata.race)
    }
    if (props.form.metadata.class) {
      context.push(props.form.metadata.class)
    }

    const contextString = context.length > 0 ? context.join(', ') : undefined

    const result = await $fetch<{ name: string }>('/api/ai/generate-name', {
      method: 'POST',
      body: {
        entityType: 'NPC',
        context: contextString,
        language: locale.value as 'de' | 'en',
      },
    })

    if (result.name) {
      // Update form via emit
      emit('update:form', {
        ...props.form,
        name: result.name,
      })
    }
  } catch (error: unknown) {
    console.error('[NPC] Failed to generate name:', error)
    const errorMessage =
      error &&
      typeof error === 'object' &&
      'data' in error &&
      error.data &&
      typeof error.data === 'object' &&
      'message' in error.data
        ? String(error.data.message)
        : 'Failed to generate name'
    alert(errorMessage)
  } finally {
    generatingName.value = false
  }
}
</script>

<style scoped>
.blur-image {
  filter: blur(4px);
  opacity: 0.6;
}
</style>
