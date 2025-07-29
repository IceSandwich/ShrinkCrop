<script setup lang="ts">
import { shallowRef } from 'vue';

const resizeQualityCombo = shallowRef<ImageSmoothingQuality[]>(['low', 'medium', 'high']);

const resizeQuality = shallowRef<ImageSmoothingQuality>('low');
function SetResizeQuality(val: ImageSmoothingQuality) {
	resizeQuality.value = val;
}
function GetResizeQuality() {
	return resizeQuality.value;
}

defineExpose({
	SetResizeQuality, 
	GetResizeQuality,
})
defineEmits<{
	OnResizeQualityChanged: [val: ImageSmoothingQuality],
}>();
</script>

<template>

	<VExpansionPanel>
		<VExpansionPanelTitle>修复</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				缩放方法：
			</VRow>
			<VRow>
				<VSelect :items="resizeQualityCombo" v-model="resizeQuality" @update:model-value="$emit('OnResizeQualityChanged', resizeQuality)" />
			</VRow>
			<VRow>
				锐化:
			</VRow>
			<VRow>
				<VSlider>

				</VSlider>
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>