<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import SplitView from './components/SplitView.vue';
import ImageList from './components/ImageList.vue';
import { Cropper, type CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css';

interface Image {
	src: string;
	title: string;
	width: number;
	height: number;
	hasCrop: boolean;
	cropX: number;
	cropY: number;
	cropWidth: number;
	cropHeight: number;
}

const images = ref<Image[]>([]);
const cropper = useTemplateRef("cropper");

let selectedIndex = ref(-1);
function onImageChange(index: number) {
	console.log('图片改变', images.value[index]);
	if (selectedIndex.value !== -1) {
		const cropRect = cropper.value!.getResult();
		images.value[selectedIndex.value].hasCrop = true;
		images.value[selectedIndex.value].cropX = cropRect.coordinates.left;
		images.value[selectedIndex.value].cropY = cropRect.coordinates.top;
		images.value[selectedIndex.value].cropWidth = cropRect.coordinates.width;
		images.value[selectedIndex.value].cropHeight = cropRect.coordinates.height;
	}
	selectedIndex.value = index;
}
function onCropperChange(options: CropperResult) {
	// images.value[selectedIndex.value].cropX = options.coordinates.left;
	// images.value[selectedIndex.value].cropY = options.coordinates.top;
	// images.value[selectedIndex.value].cropWidth  = options.coordinates.width;
	// images.value[selectedIndex.value].cropHeight  = options.coordinates.height;
}
function getCropperDefaultPosition() {
	const item = images.value[selectedIndex.value];
	return {
		left: item.cropX,
		top: item.cropY,
	};
}
function getCropperDefaultSize() {
	const item = images.value[selectedIndex.value];
	return {
		width: item.cropWidth,
		height: item.cropHeight
	};
}
const computeBuckets = computed(() => {
	return Array.from(new Set(images.value.filter(item => item.hasCrop).map(item => JSON.stringify({
		width: item.cropWidth,
		height: item.cropHeight,
	})))).map(item => JSON.parse(item)) as {
		width: number,
		height: number
	}[];
});
function calculateAspectRatio(width: number, height: number) {
    // 计算最大公约数 (GCD)
    const gcd = function (a: number, b: number): number {
        return b === 0 ? a : gcd(b, a % b);
    }

    const greatestCommonDivisor = gcd(width, height);
    const aspectRatioWidth = width / greatestCommonDivisor;
    const aspectRatioHeight = height / greatestCommonDivisor;

    return `${aspectRatioWidth}:${aspectRatioHeight}`;
}

function onFileChanged(e: Event) {
	const files = Array.from((e.target as HTMLInputElement).files!);
	files.forEach((file) => {
		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = function () {
				const cropRatio = 0.8;
				const cropWidth = Math.floor(img.naturalWidth * cropRatio);
				const cropHeight = Math.floor(img.naturalHeight * cropRatio);
				const cropX = Math.floor(img.naturalWidth / 2 - cropWidth / 2);
				const cropY = Math.floor(img.naturalHeight / 2 - cropHeight / 2);
				const append = {
					src: reader.result as string,
					title: file.name,
					width: img.naturalWidth,
					height: img.naturalHeight,
					hasCrop: false,
					cropX: cropX,
					cropY: cropY,
					cropWidth: cropWidth,
					cropHeight: cropHeight,
				};
				images.value = [...images.value, append];
			}
			img.src = reader.result as string;
		};
		reader.readAsDataURL(file);
	});
}
function onPanelResize() {
	cropper.value?.refresh();
}
</script>

<template>
	<VApp>
		<SplitView @on-panel-resize="onPanelResize">
			<template v-slot:sidebar>
				<VContainer>
					<VRow class="mb-5">
						<input type="file" style="display: none;" ref="input-field" @change="onFileChanged" multiple
							accept="image/*" />
						<VBtn class="w-100" @click="$refs['input-field'].click()" prepend-icon="mdi-plus">添加图片</VBtn>
					</VRow>
					<VRow class="mb-5">
						<VBtn class="w-100" prepend-icon="mdi-export">导出</VBtn>
					</VRow>
					<VRow>
						<VExpansionPanels v-if="selectedIndex !== -1" multiple>
							<VExpansionPanel>
								<VExpansionPanelTitle>图片信息</VExpansionPanelTitle>
								<VExpansionPanelText class="px-3 py-3">
									<VRow>
										分辨率：<span>{{ images[selectedIndex].width }} x {{ images[selectedIndex].height
											}}</span>
									</VRow>
									<VRow>
										裁剪坐标：<span>{{  images[selectedIndex].cropX }}, {{  images[selectedIndex].cropY }}</span>
									</VRow>
									<VRow>
										裁剪大小：<span>{{  images[selectedIndex].cropWidth  }} x {{  images[selectedIndex].cropHeight }}</span>
									</VRow>
								</VExpansionPanelText>
							</VExpansionPanel>
							<VExpansionPanel>
								<VExpansionPanelTitle>桶</VExpansionPanelTitle>
								<VExpansionPanelText>
									<VRow>
										<!-- <VList class="w-100">
											<VListItem 
												density="compact" 
												v-for="(item, i) in computeBuckets" 
												:key="i"
												:value="item"
												color="primary"
											>
												<VListItemTitle v-text="item.width + 'x' + item.height + '(' + calculateAspectRatio(item.width, item.height) + ')'"></VListItemTitle>
											</VListItem>
										</VList> -->
										<VRadioGroup>
											<VRadio 
												v-for="(item, i) in computeBuckets" 
												:value="i"
											>
												<template v-slot:label>
													<div>
														{{ item.width }} x {{ item.height }} ( {{ calculateAspectRatio(item.width, item.height) }} )
													</div>
												</template>
											</VRadio>
											<VRadio label="自定义"></VRadio>
										</VRadioGroup>
									</VRow>
								</VExpansionPanelText>
							</VExpansionPanel>
						</VExpansionPanels>
					</VRow>
				</VContainer>
			</template>
			<template v-slot:content>
				<SplitView disable-handler vertical>
					<template v-slot:sidebar>
						<ImageList :items="images" @change="onImageChange"></ImageList>
					</template>
					<template v-slot:content v-if="selectedIndex !== -1">
						<Cropper class="cropper" :src="images[selectedIndex].src" :stencil-props="{
							// aspectRatio: 1
						}" ref="cropper" 
						@change="onCropperChange" 
						:default-position="getCropperDefaultPosition"
						:default-size="getCropperDefaultSize"
						/>
					</template>
				</SplitView>
			</template>
		</SplitView>
	</VApp>
</template>

<style lang="css" scoped>
.cropper {
	margin: auto;
}
</style>