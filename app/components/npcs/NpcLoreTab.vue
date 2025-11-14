<template>
  <div>
    <!-- Add Lore Relation -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <v-autocomplete
          v-model="localLoreId"
          :items="loreItems"
          :label="$t('lore.selectLore')"
          :placeholder="$t('lore.selectLorePlaceholder')"
          variant="outlined"
          clearable
          :loading="loadingLore"
          class="mb-2"
        />
        <v-btn color="primary" :disabled="!localLoreId" @click="handleAdd">
          <v-icon start> mdi-link-plus </v-icon>
          {{ $t('lore.addRelation') }}
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Linked Lore List -->
    <v-list v-if="linkedLore.length > 0">
      <v-list-item v-for="lore in linkedLore" :key="lore.id" class="mb-2">
        <template #prepend>
          <v-avatar v-if="lore.image_url" size="56" rounded="lg" class="mr-3">
            <v-img :src="`/uploads/${lore.image_url}`" />
          </v-avatar>
          <v-avatar v-else size="56" rounded="lg" class="mr-3" color="surface-variant">
            <v-icon icon="mdi-book-open-variant" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ lore.name }}</v-list-item-title>
        <v-list-item-subtitle v-if="lore.description">
          {{ lore.description.substring(0, 100)
          }}{{ lore.description.length > 100 ? '...' : '' }}
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete"
            variant="text"
            color="error"
            size="small"
            @click="$emit('remove', lore.id)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-empty-state
      v-else
      icon="mdi-book-open-variant"
      :title="$t('lore.noLinkedLore')"
      :text="$t('lore.noLinkedLoreText')"
    />
  </div>
</template>

<script setup lang="ts">
interface LinkedLore {
  id: number
  name: string
  description?: string | null
  image_url?: string | null
}

interface LoreItem {
  title: string
  value: number
}

interface Props {
  linkedLore: LinkedLore[]
  loreItems: LoreItem[]
  loadingLore: boolean
}

interface Emits {
  (e: 'add' | 'remove', loreId: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const localLoreId = ref<number | null>(null)

function handleAdd() {
  if (!localLoreId.value) return

  emit('add', localLoreId.value)

  // Reset form
  localLoreId.value = null
}
</script>
