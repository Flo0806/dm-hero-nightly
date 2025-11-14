<template>
  <div>
    <div class="text-h6 mb-4">
      {{ $t('npcs.itemsList') }}
    </div>

    <v-list v-if="items.length > 0" class="mb-3">
      <v-list-item v-for="item in items" :key="item.id" class="mb-2" border>
        <template #prepend>
          <v-icon icon="mdi-sword" color="primary" />
        </template>
        <v-list-item-title>
          {{ item.name }}
          <v-chip v-if="item.equipped" size="x-small" color="success" class="ml-2">
            {{ $t('npcs.equipped') }}
          </v-chip>
          <v-chip v-if="item.rarity" size="x-small" :color="getRarityColor(item.rarity)" class="ml-2">
            {{ $t(`items.rarities.${item.rarity}`) }}
          </v-chip>
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip size="small" class="mr-1" color="primary" variant="tonal">
            {{ $t(`npcs.itemRelationTypes.${item.relation_type}`, item.relation_type) }}
          </v-chip>
          <span v-if="item.quantity && item.quantity > 1" class="text-caption mr-2">
            {{ item.quantity }}x
          </span>
          <span v-if="item.description" class="text-caption text-medium-emphasis">
            {{ item.description }}
          </span>
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="$emit('remove', item.relation_id)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon start> mdi-plus </v-icon>
          {{ $t('npcs.addItem') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-select
            v-model="localItemId"
            :items="availableItems || []"
            item-title="name"
            item-value="id"
            :label="$t('npcs.selectItem')"
            variant="outlined"
            class="mb-3"
          />

          <v-combobox
            v-model="localRelationType"
            :items="itemRelationTypeSuggestions"
            :label="$t('npcs.itemRelationType')"
            :placeholder="$t('npcs.itemRelationTypePlaceholder')"
            variant="outlined"
            class="mb-3"
          />

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="localQuantity"
                :label="$t('npcs.quantity')"
                :placeholder="$t('npcs.quantityPlaceholder')"
                variant="outlined"
                type="number"
                min="1"
              />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-switch
                v-model="localEquipped"
                :label="$t('npcs.equipped')"
                color="primary"
                hide-details
              />
            </v-col>
          </v-row>

          <v-btn
            color="primary"
            prepend-icon="mdi-link"
            :disabled="!localItemId || !localRelationType"
            :loading="adding"
            @click="handleAdd"
          >
            {{ $t('npcs.addItem') }}
          </v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface NpcItem {
  id: number
  relation_id: number
  name: string
  description?: string | null
  relation_type: string
  quantity?: number | null
  equipped?: boolean | null
  rarity?: string | null
}

interface AvailableItem {
  id: number
  name: string
}

interface Props {
  items: NpcItem[]
  availableItems: AvailableItem[]
  adding: boolean
}

interface Emits {
  (
    e: 'add',
    payload: { itemId: number; relationType: string; quantity?: number; equipped?: boolean },
  ): void
  (e: 'remove', relationId: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const localItemId = ref<number | null>(null)
const localRelationType = ref('')
const localQuantity = ref<number | undefined>(undefined)
const localEquipped = ref(false)

const itemRelationTypeSuggestions = computed(() => [
  t('npcs.itemRelationTypes.owns'),
  t('npcs.itemRelationTypes.carries'),
  t('npcs.itemRelationTypes.wields'),
  t('npcs.itemRelationTypes.wears'),
  t('npcs.itemRelationTypes.seeks'),
  t('npcs.itemRelationTypes.guards'),
  t('npcs.itemRelationTypes.stole'),
  t('npcs.itemRelationTypes.lost'),
])

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'grey',
    uncommon: 'success',
    rare: 'info',
    'very rare': 'warning',
    legendary: 'error',
    artifact: 'purple',
  }
  return colors[rarity] || 'grey'
}

function handleAdd() {
  if (!localItemId.value || !localRelationType.value) return

  emit('add', {
    itemId: localItemId.value,
    relationType: localRelationType.value,
    quantity: localQuantity.value,
    equipped: localEquipped.value,
  })

  // Reset form
  localItemId.value = null
  localRelationType.value = ''
  localQuantity.value = undefined
  localEquipped.value = false
}
</script>
