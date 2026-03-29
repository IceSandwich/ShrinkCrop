<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import EditableList from '@/components/TagEditList.vue';
import { GetSavedCategoryCopy, UpdateSavedCategory, type SavedCategory } from '@/utils/TagModel';

// interface Tag { name: string }
// interface Category { name: string; tags: Tag[] }

const dialog = ref(false)
const selectedCategoryIndex = ref<number>(-1)
const data = ref<SavedCategory | null>(null);

// ==== 分类操作 ====
function selectCategory(index: number) { selectedCategoryIndex.value = index }
function addCategory() {
    const name = prompt('输入分类名称'); if (!name) return
    data.value?.categories.push({ name, tags: [] })
    // if (selectedCategoryIndex.value === -1) selectedCategoryIndex.value = 0
}
function editCategory(index: number) {
    if (index === -1) return
    if (!data.value) return;
    const cat = data.value.categories[index]
    const name = prompt('修改分类名称', cat.name)
    if (!name) return
    cat.name = name
}
function deleteCategory(index: number) {
    if (index === -1) return false;
    if (!data.value) return;
    if (!confirm('确定删除分类及其标签吗？')) return false;
    data.value.categories.splice(index, 1)
    // selectedCategoryIndex.value = categories.value.length ? 0 : -1
    selectedCategoryIndex.value = -1;
    return true;
}
function categorySwap(target_index: number, cur_index: number) {
    if (!data.value) return;
    const temp = data.value.categories[target_index]; 
    data.value.categories[target_index] = data.value.categories[cur_index]; 
    data.value.categories[cur_index] = temp
}
function moveCategoryUp(index: number) {
    if (index <= 0) return false;
    categorySwap(index - 1, index); 
    return true;
}
function moveCategoryDown(index: number) {
    if (!data.value) return;
    if (index === -1 || index >= data.value.categories.length - 1) return false;
    categorySwap(index + 1, index);
    return true;
}

// ==== 标签操作 ====
function addTag() {
    if (selectedCategoryIndex.value === -1) return
    const name = prompt('输入标签名称'); if (!name) return
    data.value?.categories[selectedCategoryIndex.value].tags.push({ name })
}
function editTag(index: number) {
    if (!data.value) return;
    if (selectedCategoryIndex.value === -1 || index === -1) return
    const tag = data.value?.categories[selectedCategoryIndex.value].tags[index];
    const name = prompt('修改标签名称', tag.name); 
    if (!name) return
    tag.name = name
}
function deleteTag(index: number) {
    if (!data.value) return;
    if (selectedCategoryIndex.value === -1 || index === -1) return false;
    if (!confirm('确定删除标签吗？')) return false;
    data.value.categories[selectedCategoryIndex.value].tags.splice(index, 1)
    return true;
}
function moveTagUp(index: number) {
    if (!data.value) return;
    if (selectedCategoryIndex.value === -1 || index <= 0) return false;
    const tags = data.value.categories[selectedCategoryIndex.value].tags
    const temp = tags[index - 1]; tags[index - 1] = tags[index]; tags[index] = temp
    return true;
}
function moveTagDown(index: number) {
    if (!data.value) return;
    if (selectedCategoryIndex.value === -1 || index === -1) return false;
    const tags = data.value.categories[selectedCategoryIndex.value].tags
    if (index >= tags.length - 1) return
    const temp = tags[index + 1]; tags[index + 1] = tags[index]; tags[index] = temp
    return true;
}

// ==== 不想要标签操作 ====
function addUnwantedTag() { 
    const name = prompt('输入不想要标签名称');
    if (!name) return; 
    data.value?.unwanted.push({ name })
}
function editUnwantedTag(index: number) { 
    if (index === -1) return; 
    if (!data.value) return;
    const tag = data.value?.unwanted[index];
    const name = prompt('修改不想要标签名称', tag.name); 
    if (!name) return; 
    tag.name = name 
}
function deleteUnwantedTag(index: number) {
    if (index === -1) return false;
    if (!data.value) return;
    data.value.unwanted.splice(index, 1)
    return true;
}
function unwantedSwap(target_index: number, cur_index: number) {
    if (!data.value) return;
    const temp = data.value.unwanted[target_index]; 
    data.value.unwanted[target_index] = data.value.unwanted[cur_index]; 
    data.value.unwanted[cur_index] = temp
}
function moveUnwantedTagUp(index: number) {
    if (index <= 0) return false;
    unwantedSwap(index-1, index)
    return true;
}
function moveUnwantedTagDown(index: number) {
    if (!data.value) return;
    if (index === -1 || index >= data.value.unwanted.length - 1) return false;
    unwantedSwap(index+1, index)
    return true
}

// ==== 保存/取消 ====
function cancel() { dialog.value = false }
function save() {
    if (!data.value) return;
    UpdateSavedCategory(data.value);
    dialog.value = false;
}

function ShowDialog() {
    data.value = GetSavedCategoryCopy();
    console.log(data.value);
    dialog.value = true;
}

defineExpose({
    ShowDialog
})
</script>

<template>
    <v-dialog v-model="dialog" max-width="900" persistent>
        <template v-slot:activator>
            <slot name="activator" :showDialog="ShowDialog">
                <VBtn @click="ShowDialog()">
                    标签类别管理
                </VBtn>
            </slot>
        </template>

        <template v-slot:default>
            <v-card title="标签设置" prepend-icon="mdi-tag">
                <v-card-text>
                    <VRow class="ml-1 mt-1">
                        <h3>
                            标签类别管理
                        </h3>
                    </VRow>
                    <v-row>
                        <v-col cols="6">
                            <EditableList title="标签类别管理" v-if="data" :items="data.categories" @select="selectCategory" @add="addCategory"
                                @edit="editCategory" @delete="deleteCategory" @move-up="moveCategoryUp"
                                @move-down="moveCategoryDown" />
                        </v-col>
                        <v-col cols="6">
                            <EditableList title="标签管理" v-if="data"
                                :items="selectedCategoryIndex === -1 ? null : data.categories[selectedCategoryIndex].tags"
                                @add="addTag" @edit="editTag" @delete="deleteTag" @move-up="moveTagUp"
                                @move-down="moveTagDown" />
                        </v-col>
                    </v-row>
                    <VRow class="ml-1 mt-5">
                        <h3>
                            不希望出现的标签
                        </h3>
                    </VRow>
                    <v-row class="mt-4">
                        <v-col cols="12">
                            <EditableList title="不希望出现的标签" v-if="data" :items="data.unwanted" @add="addUnwantedTag"
                                @edit="editUnwantedTag" @delete="deleteUnwantedTag" @move-up="moveUnwantedTagUp"
                                @move-down="moveUnwantedTagDown" />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn size="large" text @click="cancel">取消</v-btn>
                    <v-btn class="bg-blue-darken-3 text-none" size="large" @click="save">确定</v-btn>
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>