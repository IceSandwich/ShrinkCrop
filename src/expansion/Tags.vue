<script setup lang="ts">
import { CropImageAsBase64, MergeUniqueArrays } from '@/utils/Functions';
import type { ImageItem, ProjectV1CropRect } from '@/utils/Project';
import { DisplayCategory, TagModelInstance } from '@/utils/TagModel';

const crop = defineModel<ProjectV1CropRect>("crop", {required: true});
const tagpool = defineModel<string[]>("tagpool", {required:true});
const props = defineProps<{
	item: ImageItem
}>();

async function onInvokeModelInfer() {
	if (TagModelInstance.value == null) {
		console.error(`TagModelInstance is null`);
		return;
	}

	const cropedImg = await CropImageAsBase64(props.item.imgurl, crop.value.x, crop.value.y, crop.value.width, crop.value.height, crop.value.width, crop.value.height);

	const result = await TagModelInstance.value.InferTags(cropedImg);
	console.log(result);
	crop.value.tags = result.map(v => v.name);
	tagpool.value = MergeUniqueArrays(tagpool.value, crop.value.tags);
	crop.value.selected_tags = result.map(v => v.name);
}

</script>


<template>
	<VExpansionPanel>
		<VExpansionPanelTitle>
			<VIcon icon="mdi-package-variant-closed"></VIcon>&nbsp;&nbsp;标签
		</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				<VBtn color="indigo-darken-3" size="large" class="w-100" @click="onInvokeModelInfer()">推断</VBtn>
			</VRow>
			<template v-for="category in DisplayCategory" v-if="DisplayCategory != null">
				<VRow class="mt-5">
					<h2>{{ category.name }}</h2>
				</VRow>
				<VRow v-for="tag in category.tags">
					<VCheckboxBtn :label="tag.name" :value="tag.name" v-model="crop.selected_tags" multiple></VCheckboxBtn>
				</VRow>
			</template>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>
