<script setup lang="ts">
import { shallowRef } from 'vue';
const emits = defineEmits<{
	OnResizeQualityChanged: [val: ImageSmoothingQuality],
	OnSharpnessChanged: [val: number],
}>();
const resizeQualityCombo = shallowRef<ImageSmoothingQuality[]>(['low', 'medium', 'high']);
const resizeQuality = shallowRef<ImageSmoothingQuality>('low');
function SetResizeQuality(val: ImageSmoothingQuality) {
	resizeQuality.value = val;
}
function GetResizeQuality() {
	return resizeQuality.value;
}

const sharpness = shallowRef(0);
function SetSharpness(val: number) {
	sharpness.value  = val;
}
function GetSharpness() {
	return sharpness.value;
}

function onSharpnessChanged(val: number) {
	emits("OnSharpnessChanged", val);
}
function onResizeQualityChanged(val: ImageSmoothingQuality) {
	emits('OnResizeQualityChanged', val);
}

defineExpose({
	SetResizeQuality, 
	GetResizeQuality,
	SetSharpness,
	GetSharpness,
});

</script>

<template>

	<VExpansionPanel>
		<VExpansionPanelTitle>修复</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				缩放方法：
			</VRow>
			<VRow>
				<VSelect :items="resizeQualityCombo" v-model="resizeQuality" @update:model-value="onResizeQualityChanged" />
			</VRow>
			<VRow>
				锐化:
			</VRow>
			<VRow>
				<VSlider v-model="sharpness" :step="1" thumb-label="always" class="pt-9" @update:model-value="onSharpnessChanged" />
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>