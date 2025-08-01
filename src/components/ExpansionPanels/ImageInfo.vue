<script setup lang="ts">
import type { Image, Rect } from '../commons';
defineProps<{
	img: Image,
	displayCrop: Rect,
	showAlert: boolean,
}>();
</script>

<template>
	<VExpansionPanel>
		<VExpansionPanelTitle>图片信息</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				分辨率：<span>{{ img.width }} x {{ img.height }}</span>
			</VRow>
			<VRow>
				裁剪坐标：<span>{{ displayCrop.x }}, {{ displayCrop.y }}</span>
			</VRow>
			<VRow>
				裁剪大小：<span>{{ displayCrop.width }} x {{ displayCrop.height }}</span>
			</VRow>
			<VRow v-if="showAlert" class="pt-3">
				<VAlert border="start" border-color="red-darken-2" elevation="2">
					放大裁剪区域
				</VAlert>
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>