<script setup lang="ts">
import { SavedCategoryInstance, TagModelInstance, TagPool, type SavedCategory } from '@/utils/TagModel';
import { computed } from 'vue';
const props = defineProps<{
	curTags: string[],
}>();

let savedCategory: SavedCategory;

interface Tag {
	name: string;
	checked: boolean;
}

interface Catergory {
	name: string;
	tags: Tag[];
}

const displayCategories = computed(() => {
	let cat: Catergory[] = SavedCategoryInstance.value!.categories.map(v => {
		return {
			name: v.name,
			tags: [],
		}
	})
	const uncatindex = cat.length;
	cat.push({ name: 'uncat', tags: [] });

	TagPool.value.forEach((tag) => {
		var used = false
		for (let i = 0; i < SavedCategoryInstance.value!.categories.length; i++) {
			if (SavedCategoryInstance.value!.categories[i].tags.find(v => v.name == tag)) {
				cat[i].tags.push({
					name: tag,
					checked: props.curTags.findIndex(v => v == tag) != -1
				})
				used = true
				break
			}
		}

		if (!used) {
			cat[uncatindex].tags.push({
				name: tag,
				checked: props.curTags.findIndex(v => v == tag) != -1
			})
		}
	})
	return cat
})

const emits = defineEmits<{
	OnInvokeModelInfer: [],
}>();

</script>


<template>
	<VExpansionPanel>
		<VExpansionPanelTitle>
			<VIcon icon="mdi-package-variant-closed"></VIcon>&nbsp;&nbsp;标签
		</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				<VBtn color="indigo-darken-3" size="large" class="w-100" @click="$emit('OnInvokeModelInfer')">推断</VBtn>
			</VRow>
			<VRow>
				<v-container>
					<div v-for="category in displayCategories" v-if="SavedCategoryInstance" :key="category.name"
						class="mb-4">
						<!-- 分类名 -->
						<h3>{{ category.name }}</h3>
						<v-row>
							<v-col v-for="tag in category.tags" :key="tag.name" cols="auto">
								<v-checkbox density="compact" v-model="tag.checked" :label="tag.name" :value="tag.name"></v-checkbox>
							</v-col>
						</v-row>
					</div>
				</v-container>
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>
