<template>
  <v-dialog :model-value="show" max-width="900" scrollable @update:model-value="$emit('update:show', $event)">
    <v-card>
      <v-card-title>
        {{ editingNpc ? $t('npcs.edit') : $t('npcs.create') }}
      </v-card-title>

      <v-tabs v-if="editingNpc" :model-value="activeTab" class="mb-4" @update:model-value="$emit('update:activeTab', $event)">
        <v-tab value="details">
          <v-icon start> mdi-account-details </v-icon>
          {{ $t('npcs.details') }}
        </v-tab>
        <v-tab value="npcRelations">
          <v-icon start> mdi-account-multiple </v-icon>
          {{ $t('npcs.npcRelations') }}
          ({{ npcRelationCount }})
        </v-tab>
        <v-tab value="locations">
          <v-icon start> mdi-map-marker </v-icon>
          {{ $t('npcs.linkedLocations') }}
          ({{ locationRelationCount }})
        </v-tab>
        <v-tab value="memberships">
          <v-icon start> mdi-shield-account </v-icon>
          {{ $t('npcs.memberships') }} ({{ factionMemberships.length }})
        </v-tab>
        <v-tab value="items">
          <v-icon start> mdi-sword </v-icon>
          {{ $t('npcs.items') }} ({{ npcItems.length }})
        </v-tab>
        <v-tab value="notes">
          <v-icon start> mdi-note-text </v-icon>
          {{ $t('npcs.notes') }} ({{ npcNotes.length }})
        </v-tab>
        <v-tab value="documents">
          <v-icon start> mdi-file-document </v-icon>
          {{ $t('documents.title') }} ({{ editingNpc?._counts?.documents || 0 }})
        </v-tab>
        <v-tab value="lore">
          <v-icon start>mdi-book-open-variant</v-icon>
          {{ $t('npcs.badgeTooltips.lore') }} ({{ linkedLore?.length || 0 }})
        </v-tab>
      </v-tabs>

      <v-card-text style="max-height: 600px">
        <v-tabs-window v-if="editingNpc" :model-value="activeTab">
          <!-- Details Tab -->
          <v-tabs-window-item value="details">
            <!-- Image Upload Section -->
            <v-card variant="outlined" class="mb-4">
              <v-card-text>
                <div class="d-flex align-center gap-4">
                  <!-- Image Preview -->
                  <div style="position: relative">
                    <v-avatar
                      size="160"
                      rounded="lg"
                      :color="editingNpc?.image_url ? undefined : 'grey-lighten-2'"
                      :style="editingNpc?.image_url ? 'cursor: pointer;' : ''"
                      @click="
                        editingNpc?.image_url
                          ? $emit('open-image-preview', `/uploads/${editingNpc.image_url}`, form.name)
                          : null
                      "
                    >
                      <v-img
                        v-if="editingNpc?.image_url"
                        :src="`/uploads/${editingNpc.image_url}`"
                        cover
                        :class="{ 'blur-image': uploadingImage || generatingImage }"
                      />
                      <v-icon
                        v-else-if="!uploadingImage && !generatingImage"
                        icon="mdi-account"
                        size="80"
                        color="grey"
                      />
                    </v-avatar>
                    <v-progress-circular
                      v-if="uploadingImage || generatingImage"
                      indeterminate
                      color="primary"
                      size="64"
                      width="6"
                      style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                      "
                    />
                  </div>

                  <!-- Image Actions -->
                  <div class="flex-grow-1" style="max-width: 280px; margin-left: 16px">
                    <!-- Upload Button -->
                    <v-btn
                      prepend-icon="mdi-camera"
                      color="primary"
                      variant="tonal"
                      block
                      class="mb-2"
                      :disabled="uploadingImage || deletingImage || generatingImage"
                      @click="$emit('trigger-image-upload')"
                    >
                      {{ editingNpc?.image_url ? $t('npcs.changeImage') : $t('npcs.uploadImage') }}
                    </v-btn>

                    <!-- AI Generate Button -->
                    <v-btn
                      prepend-icon="mdi-creation"
                      color="primary"
                      variant="tonal"
                      block
                      class="mb-2"
                      :loading="generatingImage"
                      :disabled="!form.name || uploadingImage || deletingImage || generatingImage || !hasApiKey"
                      @click="$emit('generate-image')"
                    >
                      {{ $t('npcs.generateImage') }}
                    </v-btn>

                    <!-- Download Button (only if image exists) -->
                    <v-btn
                      v-if="editingNpc?.image_url"
                      prepend-icon="mdi-download"
                      variant="outlined"
                      block
                      class="mb-2"
                      :disabled="uploadingImage || generatingImage"
                      @click="$emit('download-image', `/uploads/${editingNpc.image_url}`, form.name)"
                    >
                      Download
                    </v-btn>

                    <!-- Delete Button (only if image exists) -->
                    <v-btn
                      v-if="editingNpc?.image_url"
                      prepend-icon="mdi-delete"
                      color="error"
                      variant="outlined"
                      block
                      :loading="deletingImage"
                      :disabled="uploadingImage || generatingImage"
                      @click="$emit('delete-image')"
                    >
                      {{ $t('npcs.deleteImage') }}
                    </v-btn>

                    <!-- AI Hint -->
                    <div v-if="!hasApiKey" class="text-caption text-medium-emphasis mt-3">
                      <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
                      KI-Generierung: OpenAI API-Key in Einstellungen hinterlegen
                    </div>
                    <div v-else-if="!form.name" class="text-caption text-medium-emphasis mt-3">
                      <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
                      KI-Generierung: Bitte zuerst einen Namen eingeben
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

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
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
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
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
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
              @edit="$emit('edit-relation', $event)"
              @remove="$emit('remove-relation', $event)"
            />
          </v-tabs-window-item>

          <!-- Locations Tab -->
          <v-tabs-window-item value="locations">
            <NpcLocationsTab
              v-if="editingNpc"
              :location-relations="npcRelations"
              :available-locations="availableLocations"
              :adding="addingLocationRelation"
              @add="$emit('add-location-relation', $event)"
              @edit="$emit('edit-relation', $event)"
              @remove="$emit('remove-relation', $event)"
            />
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
            <NpcItemsTab
              :items="npcItems"
              :available-items="availableItems"
              :adding="addingItem"
              @add="$emit('add-item', $event)"
              @remove="$emit('remove-item', $event)"
            />
          </v-tabs-window-item>

          <!-- Notes Tab -->
          <v-tabs-window-item value="notes">
            <div class="d-flex justify-space-between align-center mb-4">
              <v-text-field
                :model-value="notesSearch"
                :placeholder="$t('npcs.searchNotes')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="mr-2"
                @update:model-value="$emit('update:notesSearch', $event)"
              />
              <v-btn color="primary" prepend-icon="mdi-plus" @click="$emit('new-note')">
                {{ $t('npcs.newNote') }}
              </v-btn>
            </div>

            <v-progress-linear v-if="loadingNotes" indeterminate />

            <v-list v-else-if="filteredNotes.length > 0">
              <v-list-item v-for="note in filteredNotes" :key="note.id" class="mb-2" border>
                <template #prepend>
                  <v-icon icon="mdi-note-text" color="primary" />
                </template>
                <v-list-item-title>
                  <span class="text-caption text-medium-emphasis mr-2">
                    {{ formatDate(note.date || note.created_at) }}
                  </span>
                  <span v-if="note.title" class="font-weight-medium">
                    {{ note.title }}
                  </span>
                </v-list-item-title>
                <v-list-item-subtitle class="mt-1">
                  {{ truncateText(note.summary, 150) }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn icon="mdi-pencil" variant="text" size="small" @click="$emit('edit-note', note)" />
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    size="small"
                    color="error"
                    @click="$emit('delete-note', note)"
                  />
                </template>
              </v-list-item>
            </v-list>

            <v-empty-state
              v-else
              icon="mdi-note-text-outline"
              :title="$t('npcs.noNotes')"
              :text="$t('npcs.noNotesText')"
            />
          </v-tabs-window-item>

          <!-- Documents Tab -->
          <v-tabs-window-item value="documents">
            <EntityDocuments v-if="editingNpc" :entity-id="editingNpc.id" @changed="$emit('documents-changed')" />
          </v-tabs-window-item>

          <!-- Lore Tab -->
          <v-tabs-window-item value="lore">
            <NpcLoreTab
              v-if="editingNpc"
              :linked-lore="linkedLore"
              :lore-items="loreItems"
              :loading-lore="loadingLore"
              @add="$emit('add-lore', $event)"
              @remove="$emit('remove-lore', $event)"
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
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
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
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
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
import NpcRelationsTab from './NpcRelationsTab.vue'
import NpcLocationsTab from './NpcLocationsTab.vue'
import NpcMembershipsTab from './NpcMembershipsTab.vue'
import NpcItemsTab from './NpcItemsTab.vue'
import NpcLoreTab from './NpcLoreTab.vue'
import EntityDocuments from '../shared/EntityDocuments.vue'

const { t, locale } = useI18n()

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

// Helper functions
function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

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

interface Note {
  id: number
  title: string | null
  summary: string
  date: string | null
  notes: string | null
  created_at: string
  updated_at: string
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
  factionMemberships: Relation[]
  npcItems: unknown[]
  npcNotes: Note[]
  linkedLore: Array<{ id: number; name: string; description: string | null; image_url: string | null }>
  // Available entities for selects
  availableNpcs: unknown[]
  availableLocations: unknown[]
  availableFactions: unknown[]
  availableItems: unknown[]
  loreItems: unknown[]
  // Loading states
  saving: boolean
  uploadingImage: boolean
  deletingImage: boolean
  generatingImage: boolean
  generatingName: boolean
  addingNpcRelation: boolean
  addingLocationRelation: boolean
  addingMembership: boolean
  addingItem: boolean
  loadingNotes: boolean
  loadingLore: boolean
  // Other
  hasApiKey: boolean
  notesSearch: string
  filteredNotes: Note[]
  npcRelationCount: number
  locationRelationCount: number
}

defineProps<Props>()

defineEmits<{
  'update:show': [value: boolean]
  'update:form': [value: NpcForm]
  'update:activeTab': [value: string]
  'update:notesSearch': [value: string]
  save: []
  close: []
  'trigger-image-upload': []
  'generate-image': []
  'delete-image': []
  'download-image': [url: string, name: string]
  'open-image-preview': [url: string, name: string]
  'generate-name': []
  'add-npc-relation': [payload: unknown]
  'add-location-relation': [payload: unknown]
  'add-membership': [payload: unknown]
  'add-item': [payload: unknown]
  'edit-relation': [relation: NpcRelation]
  'remove-relation': [id: number]
  'edit-membership': [membership: Relation]
  'remove-membership': [id: number]
  'remove-item': [id: number]
  'new-note': []
  'edit-note': [note: Note]
  'delete-note': [note: Note]
  'documents-changed': []
  'add-lore': [id: number]
  'remove-lore': [id: number]
}>()
</script>

<style scoped>
.blur-image {
  filter: blur(4px);
  opacity: 0.6;
}
</style>
