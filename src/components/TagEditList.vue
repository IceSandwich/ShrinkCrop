<template>
    <div>
        <div class="list-box">
            <v-list v-if="items != null">
                <v-list-item v-for="(item, index) in items"
                    :class="{ 'selected': selectedIndex === index }" @click="selectItem(index)">
                    <v-list-item-title>{{ item.name }}</v-list-item-title>
                </v-list-item>
            </v-list>
        </div>
        <VBtnGroup variant="outlined" density="compact" divided class="mt-2">
            <v-btn small :disabled="items == null" @click="$emit('add')">
                <v-icon left>mdi-plus</v-icon>新增
            </v-btn>
            <v-btn small :disabled="items == null || selectedIndex === -1" @click="$emit('edit', selectedIndex)">
                <v-icon left>mdi-pencil</v-icon>修改
            </v-btn>
            <v-btn small :disabled="items == null || selectedIndex === -1" @click="handleDelete">
                <v-icon left>mdi-delete</v-icon>删除
            </v-btn>
            <v-btn small :disabled="items == null || selectedIndex <= 0" @click="handleMoveUp">
                <v-icon left>mdi-arrow-up</v-icon>上移
            </v-btn>
            <v-btn small :disabled="items == null || selectedIndex === -1 || selectedIndex >= items.length - 1"
                @click="handleMoveDown">
                <v-icon left>mdi-arrow-down</v-icon>下移
            </v-btn>
        </VBtnGroup>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { VBtnGroup } from 'vuetify/components';

interface ListItem {
    name: string
}

const props = defineProps<{
    items: ListItem[] | null
}>();

const emit = defineEmits<{
    (e: 'add'): void
    (e: 'edit', index: number): void
    (e: 'delete', index: number): void
    (e: 'move-up', index: number): void
    (e: 'move-down', index: number): void
    (e: 'select', index: number): void
}>()

const selectedIndex = ref<number>(-1)

watch(() => props.items, () => {
    // 重置选中项
    //   if (props.items.length === 0) {
    //     selectedIndex.value = -1
    //   } else if (selectedIndex.value >= props.items.length) {
    //     selectedIndex.value = props.items.length - 1
    //   }
    selectedIndex.value = -1;
})

function selectItem(index: number) {
    selectedIndex.value = index
    emit('select', index)
}

function handleDelete() {
    if (selectedIndex.value === -1) return
    emit('delete', selectedIndex.value);
    selectedIndex.value = -1
}

function handleMoveUp() {
    if (selectedIndex.value <= 0) return
    emit('move-up', selectedIndex.value)
    selectedIndex.value -= 1
}

function handleMoveDown() {
    if (selectedIndex.value === -1 || selectedIndex.value >= props.items!.length - 1) return
    emit('move-down', selectedIndex.value)
    selectedIndex.value += 1;
}
</script>

<style scoped>
.list-title {
    font-weight: bold;
    margin-bottom: 4px;
}

.list-box {
    border: 1px solid #ccc;
    height: 200px;
    overflow-y: auto;
}

.selected {
    background-color: #cce5ff;
}

.list-buttons {
    display: flex;
    gap: 4px;
    margin-top: 4px;
}
</style>