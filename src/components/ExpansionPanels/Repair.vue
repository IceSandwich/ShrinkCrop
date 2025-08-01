<script setup lang="ts">
import { shallowRef } from 'vue';
const emits = defineEmits<{
	OnResizeQualityChanged: [val: ImageSmoothingQuality],
	OnSharpnessChanged: [radius: number, strength: number],
}>();
const resizeQualityCombo = shallowRef<ImageSmoothingQuality[]>(['low', 'medium', 'high']);
const resizeQuality = shallowRef<ImageSmoothingQuality>('low');
function SetResizeQuality(val: ImageSmoothingQuality) {
	resizeQuality.value = val;
}
function GetResizeQuality() {
	return resizeQuality.value;
}

const sharpnessRadius = shallowRef(0);
const sharpnessStrength = shallowRef(0);
function SetSharpness(std: number, strength: number) {
	sharpnessRadius.value = std;
	sharpnessStrength.value  = strength;
}
function GetSharpnessStd() {
	return sharpnessRadius.value;
}
function GetSharpnessStrength()  {
	return sharpnessStrength.value;
}

function onSharpnessChanged() {
	emits("OnSharpnessChanged", sharpnessRadius.value, sharpnessStrength.value);
}
function onResizeQualityChanged(val: ImageSmoothingQuality) {
	emits('OnResizeQualityChanged', val);
}

defineExpose({
	SetResizeQuality, 
	GetResizeQuality,
	SetSharpness,
	GetSharpnessStd,
	GetSharpnessStrength,
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
				<VSlider v-model="sharpnessRadius" :step="0.1" :max="10" thumb-label="always" class="pt-9" @update:model-value="onSharpnessChanged" />
			</VRow>
			<VRow>
				<VSlider v-model="sharpnessStrength" :step="0.01" :min="0" :max="1" thumb-label="always" class="pt-9" @update:model-value="onSharpnessChanged" />
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>