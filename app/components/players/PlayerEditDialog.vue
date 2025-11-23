<template>
  <v-dialog
    :model-value="show"
    max-width="900"
    scrollable
    :persistent="saving || uploadingImage || deletingImage || generatingImage"
    @update:model-value="(v) => emit('update:show', v)"
  >
    <v-card>
      <v-card-title>
        {{ editingPlayer ? $t('players.edit') : $t('players.create') }}
      </v-card-title>

      <v-tabs
        v-if="editingPlayer"
        :model-value="activeTab"
        class="mb-4"
        @update:model-value="(v) => emit('update:activeTab', v as string)"
      >
        <v-tab value="details">
          <v-icon start>mdi-account-details</v-icon>
          {{ $t('common.details') }}
        </v-tab>
        <v-tab value="images">
          <v-icon start>mdi-image-multiple</v-icon>
          {{ $t('common.images') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.images || 0 }}</v-chip>
        </v-tab>
        <v-tab value="documents">
          <v-icon start>mdi-file-document</v-icon>
          {{ $t('common.notes') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.documents || 0 }}</v-chip>
        </v-tab>
        <v-tab value="characters">
          <v-icon start>mdi-account-group</v-icon>
          {{ $t('players.characters') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.characters || 0 }}</v-chip>
        </v-tab>
        <v-tab value="items">
          <v-icon start>mdi-sword</v-icon>
          {{ $t('nav.items') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.items || 0 }}</v-chip>
        </v-tab>
        <v-tab value="locations">
          <v-icon start>mdi-map-marker</v-icon>
          {{ $t('nav.locations') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.locations || 0 }}</v-chip>
        </v-tab>
        <v-tab value="factions">
          <v-icon start>mdi-shield</v-icon>
          {{ $t('nav.factions') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.factions || 0 }}</v-chip>
        </v-tab>
        <v-tab value="lore">
          <v-icon start>mdi-book-open-variant</v-icon>
          {{ $t('nav.lore') }}
          <v-chip size="x-small" class="ml-2">{{ editingPlayer?._counts?.lore || 0 }}</v-chip>
        </v-tab>
      </v-tabs>

      <v-card-text style="max-height: 600px">
        <v-tabs-window v-if="editingPlayer" :model-value="activeTab">
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
              :image-url="editingPlayer?.image_url"
              :entity-name="form.name"
              entity-type="Player"
              :uploading="uploadingImage"
              :generating="generatingImage"
              :deleting="deletingImage"
              :has-api-key="hasApiKey"
              :generate-disabled="!form.name || uploadingImage || deletingImage || generatingImage || !hasApiKey"
              :avatar-size="120"
              default-icon="mdi-account-star"
              @preview-image="handleImagePreview"
              @upload="triggerImageUpload"
              @generate="generateImage"
              @download="downloadImage"
              @delete="deleteImage"
            />

            <v-text-field
              :model-value="form.name"
              :label="$t('players.name')"
              :placeholder="$t('players.namePlaceholder')"
              :rules="[(v: string) => !!v || $t('players.nameRequired')]"
              variant="outlined"
              class="mb-3"
              @update:model-value="$emit('update:form', { ...form, name: $event })"
            />

            <v-textarea
              :model-value="form.description"
              :label="$t('players.description')"
              :placeholder="$t('players.descriptionPlaceholder')"
              variant="outlined"
              rows="2"
              class="mb-3"
              @update:model-value="$emit('update:form', { ...form, description: $event })"
            />

            <v-text-field
              :model-value="form.metadata.email"
              :label="$t('players.email')"
              :placeholder="$t('players.emailPlaceholder')"
              variant="outlined"
              type="email"
              class="mb-3"
              @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, email: $event } })"
            />

            <v-text-field
              :model-value="form.metadata.discord"
              :label="$t('players.discord')"
              :placeholder="$t('players.discordPlaceholder')"
              variant="outlined"
              class="mb-3"
              @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, discord: $event } })"
            />

            <v-text-field
              :model-value="form.metadata.phone"
              :label="$t('players.phone')"
              :placeholder="$t('players.phonePlaceholder')"
              variant="outlined"
              class="mb-3"
              @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, phone: $event } })"
            />

            <v-textarea
              :model-value="form.metadata.notes"
              :label="$t('players.notes')"
              :placeholder="$t('players.notesPlaceholder')"
              variant="outlined"
              rows="3"
              @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, notes: $event } })"
            />
          </v-tabs-window-item>

          <!-- Images Tab -->
          <v-tabs-window-item value="images">
            <EntityImageGallery
              v-if="editingPlayer"
              :entity-id="editingPlayer.id"
              entity-type="Player"
              :entity-name="form.name"
              :entity-description="form.description"
              @images-updated="$emit('counts-changed')"
              @preview-image="handleImagePreview"
            />
          </v-tabs-window-item>

          <!-- Documents Tab -->
          <v-tabs-window-item value="documents">
            <EntityDocuments
              v-if="editingPlayer"
              :entity-id="editingPlayer.id"
              @changed="$emit('counts-changed')"
            />
          </v-tabs-window-item>

          <!-- Characters (NPCs) Tab -->
          <v-tabs-window-item value="characters">
            <PlayerCharactersTab
              v-if="editingPlayer"
              :entity-id="editingPlayer.id"
              @changed="$emit('counts-changed')"
            />
          </v-tabs-window-item>

          <!-- Items Tab -->
          <v-tabs-window-item value="items">
            <PlayerItemsTab
              v-if="editingPlayer"
              :entity-id="editingPlayer.id"
              @changed="$emit('counts-changed')"
            />
          </v-tabs-window-item>

          <!-- Locations Tab -->
          <v-tabs-window-item value="locations">
            <EntityLocationsTab v-if="editingPlayer" :entity-id="editingPlayer.id" />
          </v-tabs-window-item>

          <!-- Factions Tab -->
          <v-tabs-window-item value="factions">
            <EntityFactionsTab
              v-if="editingPlayer"
              :entity-id="editingPlayer.id"
              @changed="$emit('counts-changed')"
            />
          </v-tabs-window-item>

          <!-- Lore Tab -->
          <v-tabs-window-item value="lore">
            <PlayerLoreTab
              v-if="editingPlayer"
              :entity-id="editingPlayer.id"
              @changed="$emit('counts-changed')"
            />
          </v-tabs-window-item>
        </v-tabs-window>

        <!-- Create Form (no tabs) -->
        <div v-if="!editingPlayer">
          <v-text-field
            :model-value="form.name"
            :label="$t('players.name')"
            :placeholder="$t('players.namePlaceholder')"
            :rules="[(v: string) => !!v || $t('players.nameRequired')]"
            variant="outlined"
            class="mb-3"
            @update:model-value="$emit('update:form', { ...form, name: $event })"
          />

          <v-textarea
            :model-value="form.description"
            :label="$t('players.description')"
            :placeholder="$t('players.descriptionPlaceholder')"
            variant="outlined"
            rows="2"
            class="mb-3"
            @update:model-value="$emit('update:form', { ...form, description: $event })"
          />

          <v-text-field
            :model-value="form.metadata.email"
            :label="$t('players.email')"
            :placeholder="$t('players.emailPlaceholder')"
            variant="outlined"
            type="email"
            class="mb-3"
            @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, email: $event } })"
          />

          <v-text-field
            :model-value="form.metadata.discord"
            :label="$t('players.discord')"
            :placeholder="$t('players.discordPlaceholder')"
            variant="outlined"
            class="mb-3"
            @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, discord: $event } })"
          />

          <v-text-field
            :model-value="form.metadata.phone"
            :label="$t('players.phone')"
            :placeholder="$t('players.phonePlaceholder')"
            variant="outlined"
            class="mb-3"
            @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, phone: $event } })"
          />

          <v-textarea
            :model-value="form.metadata.notes"
            :label="$t('players.notes')"
            :placeholder="$t('players.notesPlaceholder')"
            variant="outlined"
            rows="3"
            @update:model-value="$emit('update:form', { ...form, metadata: { ...form.metadata, notes: $event } })"
          />
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
          {{ editingPlayer ? $t('common.save') : $t('common.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Player, PlayerMetadata } from '~~/types/player'
import EntityImageUpload from '../shared/EntityImageUpload.vue'
import EntityImageGallery from '../shared/EntityImageGallery.vue'
import EntityDocuments from '../shared/EntityDocuments.vue'
import EntityLocationsTab from '../shared/EntityLocationsTab.vue'
import EntityFactionsTab from '../shared/EntityFactionsTab.vue'
import PlayerCharactersTab from './PlayerCharactersTab.vue'
import PlayerItemsTab from './PlayerItemsTab.vue'
import PlayerLoreTab from './PlayerLoreTab.vue'
import { useImageDownload } from '~/composables/useImageDownload'

const { t } = useI18n()
const { downloadImage: downloadImageFile } = useImageDownload()

// Interfaces
interface PlayerForm {
  name: string
  description: string
  metadata: PlayerMetadata
}

interface Props {
  show: boolean
  editingPlayer: Player | null
  form: PlayerForm
  activeTab: string
  saving: boolean
}

const props = defineProps<Props>()

// Image management state
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const deletingImage = ref(false)
const generatingImage = ref(false)
const hasApiKey = ref(false)

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
  'update:form': [value: PlayerForm]
  'update:activeTab': [value: string]
  'open-image-preview': [url: string, name: string]
  save: []
  close: []
  'image-changed': []
  'counts-changed': []
}>()

// Image management functions
function triggerImageUpload() {
  fileInputRef.value?.click()
}

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0 || !props.editingPlayer) return

  uploadingImage.value = true
  try {
    const formData = new FormData()
    const file = files[0]
    if (file) {
      formData.append('image', file)
    }

    const response = await fetch(`/api/entities/${props.editingPlayer.id}/upload-image`, {
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
    alert(t('players.uploadImageError'))
  } finally {
    uploadingImage.value = false
    if (target) target.value = ''
  }
}

async function generateImage() {
  if (!props.editingPlayer || !props.form.name) return

  generatingImage.value = true

  try {
    const details = []
    details.push(props.form.name)

    if (props.form.description) {
      details.push(props.form.description)
    }

    const prompt = details.filter((d) => d).join(', ')

    const result = await $fetch<{ imageUrl: string; revisedPrompt?: string }>(
      '/api/ai/generate-image',
      {
        method: 'POST',
        body: {
          prompt,
          entityName: props.form.name,
          entityType: 'Player',
          style: 'fantasy-art',
        },
      },
    )

    if (result.imageUrl && props.editingPlayer) {
      const response = await $fetch<{ success: boolean }>(
        `/api/entities/${props.editingPlayer.id}/set-image`,
        {
          method: 'POST',
          body: {
            imageUrl: result.imageUrl.replace('/uploads/', ''),
          },
        },
      )

      if (response.success) {
        emit('image-changed')
      }
    }
  } catch (error: unknown) {
    console.error('[Player] Failed to generate image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
    alert(errorMessage)
  } finally {
    generatingImage.value = false
  }
}

async function deleteImage() {
  if (!props.editingPlayer?.image_url) return

  deletingImage.value = true

  try {
    await $fetch<{ success: boolean }>(`/api/entities/${props.editingPlayer.id}/delete-image`, {
      method: 'DELETE' as const,
    })

    emit('image-changed')
  } catch (error) {
    console.error('Failed to delete image:', error)
    alert(t('players.deleteImageError'))
  } finally {
    deletingImage.value = false
  }
}

function downloadImage() {
  if (!props.editingPlayer?.image_url) return
  downloadImageFile(`/uploads/${props.editingPlayer.image_url}`, props.form.name)
}

function handleImagePreview(url: string, name: string) {
  emit('open-image-preview', url, name)
}
</script>
