<template>
  <v-dialog
    :model-value="show"
    max-width="1200"
    scrollable
    :persistent="uploadingImage || generatingImage"
    @update:model-value="(v) => emit('update:show', v as boolean)"
  >
    <v-card>
      <v-card-title>
        {{ editingItem ? $t('items.edit') : $t('items.create') }}
      </v-card-title>

      <v-tabs
        v-if="editingItem"
        :model-value="activeTab"
        class="px-4"
        @update:model-value="(v) => emit('update:activeTab', v as string)"
      >
        <v-tab value="details">
          <v-icon start> mdi-information </v-icon>
          {{ $t('items.details') }}
        </v-tab>
        <v-tab value="images">
          <v-icon start> mdi-image-multiple </v-icon>
          {{ $t('common.images') }} ({{ editingItem?._counts?.images ?? 0 }})
        </v-tab>
        <v-tab value="documents">
          <v-icon start> mdi-file-document </v-icon>
          {{ $t('documents.title') }} ({{ editingItem?._counts?.documents ?? 0 }})
        </v-tab>
        <v-tab value="owners">
          <v-icon start> mdi-account </v-icon>
          {{ $t('items.owners') }} ({{ itemOwners.length }})
        </v-tab>
        <v-tab value="locations">
          <v-icon start> mdi-map-marker </v-icon>
          {{ $t('items.locations') }} ({{ itemLocations.length }})
        </v-tab>
        <v-tab value="factions">
          <v-icon start> mdi-shield-account </v-icon>
          {{ $t('factions.title') }} ({{ linkedFactions.length }})
        </v-tab>
        <v-tab value="lore">
          <v-icon start> mdi-book-open-variant </v-icon>
          {{ $t('lore.title') }} ({{ linkedLore.length }})
        </v-tab>
        <v-tab value="players">
          <v-icon start> mdi-account-star </v-icon>
          {{ $t('players.title') }} ({{ editingItem?._counts?.players ?? 0 }})
        </v-tab>
      </v-tabs>

      <v-card-text style="max-height: 600px">
        <v-tabs-window v-if="editingItem" :model-value="activeTab">
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
              :image-url="editingItem?.image_url"
              :entity-name="form.name"
              entity-type="Item"
              :uploading="uploadingImage"
              :generating="generatingImage"
              :deleting="deletingImage"
              :has-api-key="hasApiKey"
              :generate-disabled="!form.name || uploadingImage || deletingImage || generatingImage || !hasApiKey"
              :avatar-size="160"
              default-icon="mdi-sword"
              @preview-image="(url, name) => emit('open-image-preview', url, name)"
              @upload="triggerImageUpload"
              @generate="generateImage"
              @download="downloadImage"
              @delete="deleteImage"
            />

            <v-text-field
              :model-value="form.name"
              :label="$t('items.name')"
              :rules="[(v: string) => !!v || $t('items.nameRequired')]"
              variant="outlined"
              class="mb-4"
              @update:model-value="updateFormName"
            />

            <v-textarea
              :model-value="form.description"
              :label="$t('items.description')"
              variant="outlined"
              rows="3"
              class="mb-4"
              @update:model-value="updateFormDescription"
            />

            <v-divider class="my-4" />

            <div class="text-h6 mb-4">
              {{ $t('items.metadata') }}
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  :model-value="itemType"
                  :items="ITEM_TYPES"
                  :label="$t('items.type')"
                  variant="outlined"
                  clearable
                  @update:model-value="updateFormMetadataType"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps" :title="$t(`items.types.${item.value}`)" />
                  </template>
                  <template #selection="{ item }">
                    {{ $t(`items.types.${item.value}`) }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  :model-value="itemRarity"
                  :items="ITEM_RARITIES"
                  :label="$t('items.rarity')"
                  variant="outlined"
                  clearable
                  @update:model-value="updateFormMetadataRarity"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps" :title="$t(`items.rarities.${item.value}`)" />
                  </template>
                  <template #selection="{ item }">
                    {{ $t(`items.rarities.${item.value}`) }}
                  </template>
                </v-select>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="form.metadata.weight"
                  :label="$t('items.weight')"
                  :suffix="$t('items.weightUnit')"
                  variant="outlined"
                  type="number"
                  step="0.1"
                  min="0"
                  @update:model-value="updateFormMetadataWeight"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="form.metadata.value"
                  :label="$t('items.value')"
                  :suffix="$t('items.valueUnit')"
                  variant="outlined"
                  type="number"
                  min="0"
                  @update:model-value="updateFormMetadataValue"
                />
              </v-col>
            </v-row>

            <v-textarea
              :model-value="form.metadata.notes"
              :label="$t('items.notes')"
              variant="outlined"
              rows="3"
              @update:model-value="updateFormMetadataNotes"
            />
          </v-tabs-window-item>

          <!-- Images Tab -->
          <v-tabs-window-item value="images">
            <EntityImageGallery
              v-if="editingItem"
              :entity-id="editingItem.id"
              :entity-name="form.name"
              entity-type="Item"
              @images-updated="emit('images-changed')"
              @preview-image="(url, name) => emit('open-image-preview', url, name)"
            />
          </v-tabs-window-item>

          <!-- Documents Tab -->
          <v-tabs-window-item value="documents">
            <EntityDocuments
              v-if="editingItem"
              :entity-id="editingItem.id"
              entity-type="Item"
              @changed="emit('documents-changed')"
            />
          </v-tabs-window-item>

          <!-- Owners Tab -->
          <v-tabs-window-item value="owners">
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="12" md="6">
                  <v-select
                    v-model="newOwner.npcId"
                    :items="availableNpcs"
                    :label="$t('items.selectNpc')"
                    variant="outlined"
                    item-title="name"
                    item-value="id"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="newOwner.quantity"
                    :label="$t('items.quantity')"
                    variant="outlined"
                    type="number"
                    min="1"
                  />
                </v-col>
                <v-col cols="12" md="2">
                  <v-btn
                    color="primary"
                    :disabled="!newOwner.npcId || !newOwner.quantity || addingOwner"
                    :loading="addingOwner"
                    @click="handleAddOwner"
                  >
                    {{ $t('common.add') }}
                  </v-btn>
                </v-col>
              </v-row>
            </div>

            <v-divider class="my-4" />

            <div v-if="itemOwners.length === 0" class="text-center text-medium-emphasis py-8">
              {{ $t('items.noOwners') }}
            </div>

            <v-list v-else>
              <v-list-item
                v-for="owner in itemOwners"
                :key="owner.id"
                :prepend-avatar="owner.image_url ? `/uploads/${owner.image_url}` : undefined"
              >
                <template v-if="!owner.image_url" #prepend>
                  <v-avatar color="grey-lighten-2">
                    <v-icon>mdi-account</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ owner.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ $t('items.quantity') }}: {{ owner.quantity ?? 1 }}
                  <span v-if="owner.equipped" class="ml-2">
                    | {{ $t('items.equipped') }}
                  </span>
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    size="small"
                    :loading="removingOwner === owner.relation_id"
                    @click="handleRemoveOwner(owner.relation_id)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>

          <!-- Locations Tab -->
          <v-tabs-window-item value="locations">
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="12" md="6">
                  <v-select
                    v-model="newLocation.locationId"
                    :items="availableLocations"
                    :label="$t('items.selectLocation')"
                    variant="outlined"
                    item-title="name"
                    item-value="id"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="newLocation.quantity"
                    :label="$t('items.quantity')"
                    variant="outlined"
                    type="number"
                    min="1"
                  />
                </v-col>
                <v-col cols="12" md="2">
                  <v-btn
                    color="primary"
                    :disabled="!newLocation.locationId || !newLocation.quantity || addingLocation"
                    :loading="addingLocation"
                    @click="handleAddLocation"
                  >
                    {{ $t('common.add') }}
                  </v-btn>
                </v-col>
              </v-row>
            </div>

            <v-divider class="my-4" />

            <div v-if="itemLocations.length === 0" class="text-center text-medium-emphasis py-8">
              {{ $t('items.noLocations') }}
            </div>

            <v-list v-else>
              <v-list-item
                v-for="location in itemLocations"
                :key="location.id"
                :prepend-avatar="location.image_url ? `/uploads/${location.image_url}` : undefined"
              >
                <template v-if="!location.image_url" #prepend>
                  <v-avatar color="grey-lighten-2">
                    <v-icon>mdi-map-marker</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ location.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ $t('items.quantity') }}: {{ location.quantity ?? 1 }}
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    size="small"
                    :loading="removingLocation === location.relation_id"
                    @click="handleRemoveLocation(location.relation_id)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>

          <!-- Factions Tab -->
          <v-tabs-window-item value="factions">
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="12" md="8">
                  <v-select
                    v-model="newFaction.factionId"
                    :items="availableFactions"
                    :label="$t('items.selectFaction')"
                    variant="outlined"
                    item-title="name"
                    item-value="id"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-btn
                    color="primary"
                    :disabled="!newFaction.factionId || addingFaction"
                    :loading="addingFaction"
                    @click="handleAddFaction"
                  >
                    {{ $t('common.add') }}
                  </v-btn>
                </v-col>
              </v-row>
            </div>

            <v-divider class="my-4" />

            <div v-if="linkedFactions.length === 0" class="text-center text-medium-emphasis py-8">
              {{ $t('items.noFactions') }}
            </div>

            <v-list v-else>
              <v-list-item
                v-for="faction in linkedFactions"
                :key="faction.id"
                :prepend-avatar="faction.image_url ? `/uploads/${faction.image_url}` : undefined"
              >
                <template v-if="!faction.image_url" #prepend>
                  <v-avatar color="grey-lighten-2">
                    <v-icon>mdi-shield-account</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ faction.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="faction.description">
                  {{ faction.description }}
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    size="small"
                    :loading="removingFaction === faction.id"
                    @click="handleRemoveFaction(faction.id)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>

          <!-- Lore Tab -->
          <v-tabs-window-item value="lore">
            <SharedEntityLoreTab
              :linked-lore="linkedLore"
              :available-lore="availableLore"
              :loading="addingLore"
              @add="handleAddLore"
              @remove="handleRemoveLore"
            />
          </v-tabs-window-item>

          <!-- Players Tab -->
          <v-tabs-window-item value="players">
            <EntityPlayersTab
              v-if="editingItem"
              :entity-id="editingItem.id"
              @changed="emit('players-changed')"
            />
          </v-tabs-window-item>
        </v-tabs-window>

        <!-- Create Mode (no tabs) -->
        <div v-else>
          <v-text-field
            :model-value="form.name"
            :label="$t('items.name')"
            :rules="[(v: string) => !!v || $t('items.nameRequired')]"
            variant="outlined"
            class="mb-4"
            @update:model-value="updateFormName"
          />

          <v-textarea
            :model-value="form.description"
            :label="$t('items.description')"
            variant="outlined"
            rows="3"
            class="mb-4"
            @update:model-value="updateFormDescription"
          />

          <v-row>
            <v-col cols="12" md="6">
              <v-select
                :model-value="itemType"
                :items="ITEM_TYPES"
                :label="$t('items.type')"
                variant="outlined"
                clearable
                @update:model-value="updateFormMetadataType"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="$t(`items.types.${item.value}`)" />
                </template>
                <template #selection="{ item }">
                  {{ $t(`items.types.${item.value}`) }}
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                :model-value="itemRarity"
                :items="ITEM_RARITIES"
                :label="$t('items.rarity')"
                variant="outlined"
                clearable
                @update:model-value="updateFormMetadataRarity"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="$t(`items.rarities.${item.value}`)" />
                </template>
                <template #selection="{ item }">
                  {{ $t(`items.rarities.${item.value}`) }}
                </template>
              </v-select>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="emit('save')">
          {{ $t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Item, ItemMetadata, ItemType, ItemRarity } from '~~/types/item'
import { ITEM_TYPES, ITEM_RARITIES } from '~~/types/item'
import type { NPC } from '~~/types/npc'
import type { Location } from '~~/types/location'
import type { Faction } from '~~/types/faction'
import type { Lore } from '~~/types/lore'
import EntityDocuments from '~/components/shared/EntityDocuments.vue'
import EntityImageGallery from '~/components/shared/EntityImageGallery.vue'
import EntityImageUpload from '~/components/shared/EntityImageUpload.vue'
import EntityPlayersTab from '~/components/shared/EntityPlayersTab.vue'

// Component-specific types for relations
interface ItemOwner {
  id: number
  relation_id: number
  name: string
  description?: string | null
  image_url?: string | null
  quantity?: number | null
  equipped?: boolean | null
}

interface ItemLocation {
  id: number
  relation_id: number
  name: string
  description?: string | null
  image_url?: string | null
  quantity?: number | null
}

interface ItemForm {
  name: string
  description: string | null
  metadata: ItemMetadata
}

interface Props {
  show: boolean
  editingItem: (Item & { _counts?: { images?: number; documents?: number; players?: number } }) | null
  form: ItemForm
  activeTab: string
  // Relations data
  itemOwners: ItemOwner[]
  itemLocations: ItemLocation[]
  linkedFactions: Array<Pick<Faction, 'id' | 'name' | 'description' | 'image_url'>>
  linkedLore: Array<Pick<Lore, 'id' | 'name' | 'description' | 'image_url'>>
  // Available entities for selects
  availableNpcs: Array<Pick<NPC, 'id' | 'name' | 'image_url'>>
  availableLocations: Array<Pick<Location, 'id' | 'name' | 'image_url'>>
  availableFactions: Array<Pick<Faction, 'id' | 'name'>>
  availableLore: Array<{ id: number; name: string }>
  // Loading states
  saving: boolean
  addingOwner: boolean
  addingLocation: boolean
  addingFaction: boolean
  addingLore: boolean
  removingOwner: number | null
  removingLocation: number | null
  removingFaction: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:form': [value: ItemForm]
  'update:activeTab': [value: string]
  'open-image-preview': [url: string, name: string]
  'add-owner': [payload: { npcId: number; quantity: number }]
  'remove-owner': [relationId: number]
  'add-location': [payload: { locationId: number; quantity: number }]
  'remove-location': [relationId: number]
  'add-faction': [factionId: number]
  'remove-faction': [factionId: number]
  'add-lore': [loreId: number]
  'remove-lore': [loreId: number]
  save: []
  close: []
  'image-changed': []
  'images-changed': []
  'documents-changed': []
  'players-changed': []
}>()

// Image management state (same as NPC)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const deletingImage = ref(false)
const generatingImage = ref(false)
const hasApiKey = ref(false)

// Local state for adding relations
const newOwner = ref({ npcId: null as number | null, quantity: 1 })
const newLocation = ref({ locationId: null as number | null, quantity: 1 })
const newFaction = ref({ factionId: null as number | null })

// i18n
const { t } = useI18n()

// Helper functions for form updates (fixes TypeScript emit overload issue)
function updateFormName(name: string) {
  const updated: ItemForm = { ...props.form, name }
  emit('update:form', updated)
}

function updateFormDescription(description: string) {
  const updated: ItemForm = { ...props.form, description }
  emit('update:form', updated)
}

function updateFormMetadataType(type: string | null) {
  const updated: ItemForm = { ...props.form, metadata: { ...props.form.metadata, type } }
  emit('update:form', updated)
}

function updateFormMetadataRarity(rarity: string | null) {
  const updated: ItemForm = { ...props.form, metadata: { ...props.form.metadata, rarity } }
  emit('update:form', updated)
}

function updateFormMetadataWeight(value: string) {
  const updated: ItemForm = {
    ...props.form,
    metadata: { ...props.form.metadata, weight: value ? parseFloat(value) : null },
  }
  emit('update:form', updated)
}

function updateFormMetadataValue(value: string) {
  const updated: ItemForm = {
    ...props.form,
    metadata: { ...props.form.metadata, value: value ? parseInt(value) : null },
  }
  emit('update:form', updated)
}

function updateFormMetadataNotes(notes: string) {
  const updated: ItemForm = { ...props.form, metadata: { ...props.form.metadata, notes } }
  emit('update:form', updated)
}

// Check if API key is available
onMounted(async () => {
  try {
    const result = await $fetch<{ hasKey: boolean }>('/api/settings/openai-key/check')
    hasApiKey.value = result.hasKey
  } catch {
    hasApiKey.value = false
  }
})

// Image management functions
function triggerImageUpload() {
  fileInputRef.value?.click()
}

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0 || !props.editingItem) return

  uploadingImage.value = true
  try {
    const formData = new FormData()
    const file = files[0]
    if (file) {
      formData.append('image', file)
    }

    const response = await fetch(`/api/entities/${props.editingItem.id}/upload-image`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    await response.json()
    emit('image-changed')
  } catch (error) {
    console.error('Failed to upload image:', error)
    alert(t('items.uploadImageError'))
  } finally {
    uploadingImage.value = false
    if (target) target.value = ''
  }
}

async function generateImage() {
  if (!props.editingItem || !props.form.name) return

  generatingImage.value = true

  try {
    const details = []

    // Type (weapon, armor, potion, etc.)
    if (props.form.metadata.type) {
      details.push(props.form.metadata.type)
    }

    // Rarity (common, uncommon, rare, legendary, etc.)
    if (props.form.metadata.rarity) {
      details.push(props.form.metadata.rarity)
    }

    // Name (required)
    details.push(props.form.name)

    // Description (free-form details)
    if (props.form.description) {
      details.push(props.form.description)
    }

    // Notes (additional context)
    if (props.form.metadata.notes) {
      details.push(props.form.metadata.notes)
    }

    const prompt = details.filter((d) => d).join(', ')

    const result = await $fetch<{ imageUrl: string }>('/api/ai/generate-image', {
      method: 'POST',
      body: {
        prompt,
        entityName: props.form.name,
        entityType: 'Item',
        style: 'fantasy-art',
      },
    })

    if (result.imageUrl) {
      await $fetch(`/api/entities/${props.editingItem.id}/add-generated-image`, {
        method: 'POST',
        body: {
          imageUrl: result.imageUrl.replace('/uploads/', ''),
        },
      })

      emit('image-changed')
    }
  } catch (error) {
    console.error('Failed to generate image:', error)
    alert(t('items.generateImageError'))
  } finally {
    generatingImage.value = false
  }
}

async function deleteImage() {
  if (!props.editingItem?.image_url) return

  if (!confirm(t('items.deleteImageConfirm'))) return

  deletingImage.value = true
  try {
    await $fetch(`/api/entities/${props.editingItem.id}/image`, {
      method: 'DELETE',
    })

    emit('image-changed')
  } catch (error) {
    console.error('Failed to delete image:', error)
    alert(t('items.deleteImageError'))
  } finally {
    deletingImage.value = false
  }
}

async function downloadImage() {
  if (!props.editingItem?.image_url) return

  try {
    const response = await fetch(`/uploads/${props.editingItem.image_url}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.form.name}.${props.editingItem.image_url.split('.').pop()}`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download image:', error)
  }
}

// Relation handlers
function handleAddOwner() {
  if (!newOwner.value.npcId || !newOwner.value.quantity) return
  emit('add-owner', {
    npcId: newOwner.value.npcId,
    quantity: newOwner.value.quantity,
  })
  newOwner.value = { npcId: null, quantity: 1 }
}

function handleRemoveOwner(relationId: number) {
  emit('remove-owner', relationId)
}

function handleAddLocation() {
  if (!newLocation.value.locationId || !newLocation.value.quantity) return
  emit('add-location', {
    locationId: newLocation.value.locationId,
    quantity: newLocation.value.quantity,
  })
  newLocation.value = { locationId: null, quantity: 1 }
}

function handleRemoveLocation(relationId: number) {
  emit('remove-location', relationId)
}

function handleAddFaction() {
  if (!newFaction.value.factionId) return
  emit('add-faction', newFaction.value.factionId)
  newFaction.value = { factionId: null }
}

function handleRemoveFaction(factionId: number) {
  emit('remove-faction', factionId)
}

function handleAddLore(loreId: number) {
  emit('add-lore', loreId)
}

function handleRemoveLore(relationId: number) {
  emit('remove-lore', relationId)
}

// Computed properties for type-safe v-model bindings
const itemType = computed(() => props.form.metadata.type as ItemType | null | undefined)
const itemRarity = computed(() => props.form.metadata.rarity as ItemRarity | null | undefined)
</script>
