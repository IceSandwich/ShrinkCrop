<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { IconValue } from 'vuetify/lib/composables/icons.mjs';
defineProps<{
	multiple?: boolean,
	accept?: string,
	prependIcon?: IconValue,
	color?: string,
}>();
const emits = defineEmits<{
	OnSelectFiles: [files: File[]],
}>();

const inputs = useTemplateRef('input-field');

function onSelectFile(e: Event) {
	const files = Array.from((e.target as HTMLInputElement).files!);
	emits('OnSelectFiles', files);
}
</script>

<template>
	<input type="file" style="display: none;" ref="input-field" @change="onSelectFile" :multiple="multiple" :accept="accept"/>
	<VBtn class="w-100" @click="inputs?.click();" :prepend-icon="prependIcon" :color="color">
		<slot></slot>
	</VBtn>
</template>