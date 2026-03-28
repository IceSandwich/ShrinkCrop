<script setup lang="ts">
import { DisplayCategory } from '@/utils/TagModel';

const curTags = defineModel<string[]>("cur-tags");

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
			<template v-for="category in DisplayCategory" v-if="DisplayCategory != null && curTags">
				<VRow class="mt-5">
					<h2>{{ category.name }}</h2>
				</VRow>
				<VRow v-for="tag in category.tags">
					<VCheckboxBtn :label="tag" :value="tag" v-model="curTags" multiple></VCheckboxBtn>
				</VRow>
			</template>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>
