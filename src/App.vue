<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import SplitView from './components/SplitView.vue';
import ImageList from './components/ImageList.vue';
import { Cropper, type CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css';

interface Rect{
	x: number;
	y: number;
	width: number;
	height: number;
}
interface Bucket {
	widthRatio: number;
	heightRatio: number;
}
interface Image {
	src: string;
	title: string;
	width: number;
	height: number;
	crop: Rect | null;
	ratio: Bucket | null;
}

function calculateAspectRatio(width: number, height: number): Bucket {
    // 计算最大公约数 (GCD)
    const gcd = function (a: number, b: number): number {
        return b === 0 ? a : gcd(b, a % b);
    }

    const greatestCommonDivisor = gcd(width, height);
    const aspectRatioWidth = width / greatestCommonDivisor;
    const aspectRatioHeight = height / greatestCommonDivisor;

    return {
		widthRatio: aspectRatioWidth,
		heightRatio: aspectRatioHeight
	}
}

const images = ref<Image[]>([]);
const buckets = ref<Bucket[]>([]);
const cropper = useTemplateRef("cropper");

let selectedIndex = ref(-1);
let displayCrop = ref<Rect>({ x:0, y:0, width:160, height:90 });
function onImageChange(index: number) {
	if (selectedIndex.value !== -1) {
		// update crop coordinates
		const cropRect = cropper.value!.getResult();
		images.value[selectedIndex.value].crop = {
			x: cropRect.coordinates.left,
			y: cropRect.coordinates.top,
			width: cropRect.coordinates.width,
			height: cropRect.coordinates.height,
		} 

		// update buckets
		buckets.value = Array.from(new Set(images.value.filter(item => item.crop).map(item => JSON.stringify({
			widthRatio: item.crop!.width,
			heightRatio: item.crop!.height,
		})))).map(item => JSON.parse(item));
	}
	selectedIndex.value = index;
}
function onCropperChange(options: CropperResult) {
	displayCrop.value = {
		x: options.coordinates.left,
		y: options.coordinates.top,
		width: options.coordinates.width,
		height: options.coordinates.height,
	}
}

const kDefaultRatio = 0.8;
function getCropperDefaultPosition() {
	const item = images.value[selectedIndex.value];
	if (!item.crop) {
		return {
			left: (item.width - item.width * kDefaultRatio) / 2,
			top: (item.height - item.height * kDefaultRatio) / 2,
		}
	}
	return {
		left: item.crop.x,
		top: item.crop.y,
	};
}
function getCropperDefaultSize() {
	const item = images.value[selectedIndex.value];
	if (!item.crop) {
		return {
			width: item.width * kDefaultRatio,
			height: item.height * kDefaultRatio,
		}
	}
	return {
		width: item.crop.width,
		height: item.crop.height
	};
}

function onFileChanged(e: Event) {
	const files = Array.from((e.target as HTMLInputElement).files!);
	files.forEach((file) => {
		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = function () {
				const append = {
					src: reader.result as string,
					title: file.name,
					width: img.naturalWidth,
					height: img.naturalHeight,
					crop: null,
					ratio: null,
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
const customBucketForm = useTemplateRef("customBucketForm");
function onBucketSelectChange(value: unknown) {
	console.log("====== ", value);
}
</script>

<template>
	<VApp>
		<SplitView @on-panel-resize="onPanelResize" panelbg-color="rgba(127, 127, 127, 0.5)">
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
										裁剪坐标：<span>{{  displayCrop.x }}, {{  displayCrop.y }}</span>
									</VRow>
									<VRow>
										裁剪大小：<span>{{  displayCrop.width  }} x {{  displayCrop.height }}</span>
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
										<VRadioGroup @update:model-value="onBucketSelectChange">
											<VRadio 
												v-for="(item, i) in buckets" 
												:value="i"
											>
												<template v-slot:label>
													<div>
														{{ item.widthRatio }} : {{ item.heightRatio }}
													</div>
												</template>
											</VRadio>
											<VRadio label="自定义" value="-1"></VRadio>
											<VForm ref="customBucketForm">
												<VContainer>
													<VRow>
														<VCol>

														</VCol>
													</VRow>
												</VContainer>
											</VForm>
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
						<Cropper class="cropper" :src="images[selectedIndex].src"
							:stencil-props="{
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