<script setup lang="ts">
import { useTemplateRef } from 'vue';
import BucketDialog from './BucketDialog.vue';

const emits = defineEmits<{
	OnApply: [width: number, height: number],
}>();

const dialog = useTemplateRef("dialog");
function OpenDialog(target_width: number, target_height: number) {

	dialog.value?.OpenDialog(target_width, target_height);
}

function onApply(width: number, height: number) {
	emits("OnApply", width, height);
}

defineExpose({
	OpenDialog,
})

</script>

<template>
	<BucketDialog dialog-title="修改桶" button-text="修改" ref="dialog" @on-apply="onApply">
		<template v-slot:header>
			
		</template>
	</BucketDialog>
</template>