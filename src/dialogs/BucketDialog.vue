<script lang="ts" setup>
import { CalcHeightWithRatio, CalcRatio, CalcWidthWidthRatio } from '@/utils/Functions';
import { shallowRef } from 'vue';

const props = defineProps<{
	dialogTitle: string,
	buttonText: string,
}>();

const emits = defineEmits<{
	OnApply: [width: number, height: number],
}>();

const dialogModel = shallowRef(false);
const targetWidth = shallowRef(0);
const targetHeight = shallowRef(0);
const keepRatio = shallowRef(true);
const ratio = shallowRef(0);

function onKeepRatioCheckboxChanged(value: boolean | null) {
	if (value) {
		ratio.value = CalcRatio(targetWidth.value, targetHeight.value);
	}
}

function onTargetWidthChanged() {
	if (keepRatio.value == true) {
		targetHeight.value = CalcHeightWithRatio(targetWidth.value, ratio.value);
	}
}

function onTargetHeightChanged() {
	if (keepRatio.value == true) {
		targetWidth.value = CalcWidthWidthRatio(targetHeight.value, ratio.value);
	}
}

function onApplyClicked() {
	emits("OnApply", targetWidth.value, targetHeight.value);
	dialogModel.value = false;
}

function OpenDialog(target_width: number, target_height: number) {
	targetWidth.value = target_width;
	targetHeight.value = target_height;
	keepRatio.value = true;
	onKeepRatioCheckboxChanged(true);
	dialogModel.value = true;
}

defineExpose({
	OpenDialog,
});
</script>

<template>
	<VDialog v-model="dialogModel" max-width="600">
		<VCard prepend-icon="mdi-bookmark-plus-outline" :title="props.dialogTitle">
			<VCardText class="mt-3">
				<slot name="header"></slot>
				<VRow>
					<VCol cols="6">
						<VNumberInput control-variant="hidden" label="Target Width" v-model="targetWidth" @update:focused="onTargetWidthChanged" />
					</VCol>
					<VCol cols="6">
						<VNumberInput control-variant="hidden" label="Target Height" v-model="targetHeight" @update:focused="onTargetHeightChanged" />
					</VCol>
				</VRow>
				<VRow>
					<VCheckbox label="保持宽高比" v-model="keepRatio" @update:model-value="onKeepRatioCheckboxChanged" />
				</VRow>
			</VCardText>
			<template v-slot:actions>
				<VBtn class="ms-auto mb-2 mr-2" :text="props.buttonText" color="blue-darken-4" variant="flat" @click="onApplyClicked" />
			</template>
		</VCard>
	</VDialog>
</template>