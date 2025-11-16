<template>
  <div>
    <div class="text-h6 mb-4">
      {{ $t('factions.linkedItems') }}
    </div>

    <v-list v-if="items.length > 0">
      <v-list-item v-for="item in items" :key="item.id" class="mb-2" border>
        <template #prepend>
          <v-avatar v-if="item.image_url" size="40" rounded="lg">
            <v-img :src="`/uploads/${item.image_url}`" />
          </v-avatar>
          <v-icon v-else icon="mdi-treasure-chest" color="primary" />
        </template>
        <v-list-item-title>
          {{ item.name }}
        </v-list-item-title>
        <v-list-item-subtitle v-if="item.description">
          {{ item.description.substring(0, 100)
          }}{{ item.description.length > 100 ? '...' : '' }}
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="$emit('remove', item.id)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-empty-state
      v-else
      icon="mdi-treasure-chest"
      :title="$t('factions.noLinkedItems')"
      :text="$t('factions.noLinkedItemsText')"
    />

    <v-divider class="my-4" />

    <div class="text-h6 mb-4">
      {{ $t('factions.addItem') }}
    </div>

    <v-autocomplete
      v-model="localItemId"
      :items="availableItems"
      item-title="name"
      item-value="id"
      :label="$t('factions.selectItem')"
      :placeholder="$t('factions.selectItemPlaceholder')"
      variant="outlined"
      clearable
      class="mb-2"
    />

    <v-btn color="primary" block :disabled="!localItemId" @click="handleAdd">
      {{ $t('factions.linkItem') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
interface FactionItem {
  id: number
  name: string
  description: string | null
  image_url: string | null
  direction?: 'outgoing' | 'incoming'
}

interface AvailableItem {
  id: number
  name: string
}

interface Props {
  items: FactionItem[]
  availableItems: AvailableItem[]
}

interface Emits {
  (e: 'add', itemId: number): void
  (e: 'remove', relationId: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const localItemId = ref<number | null>(null)

function handleAdd() {
  if (!localItemId.value) return

  emit('add', localItemId.value)

  // Reset form
  localItemId.value = null
}
</script>
