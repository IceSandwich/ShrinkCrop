<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import SplitView from './components/SplitView.vue';
import ImageList from './components/ImageList.vue';
import { Cropper, type CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css';
import JSZip from 'jszip';

interface Size {
	width: number;
	height: number;
}
interface Rect{
	x: number;
	y: number;
	width: number;
	height: number;
}
interface Image {
	src: string;
	title: string;
	width: number;
	height: number;
	crop: Rect;
	bucket: number;
}
type Bucket = Size;

function calculateAspectRatio(width: number, height: number): Size {
    // 计算最大公约数 (GCD)
    const gcd = function (a: number, b: number): number {
        return b === 0 ? a : gcd(b, a % b);
    }

    const greatestCommonDivisor = gcd(width, height);
    const aspectRatioWidth = width / greatestCommonDivisor;
    const aspectRatioHeight = height / greatestCommonDivisor;

    return {
		width: aspectRatioWidth,
		height: aspectRatioHeight
	}
}
function calculateDefaultCrop(size: Size, ratio: number = 0.8): Rect {
	const cropWidth = Math.floor(size.width * ratio);
	const cropHeight = Math.floor(size.height * ratio);
	const cropX = Math.floor((size.width - cropWidth)/2);
	const cropY = Math.floor((size.height - cropHeight)/2);
	return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

const images = ref<Image[]>([]);
const buckets = ref<Bucket[]>([]);
const cropper = useTemplateRef("cropper");
const bucketRadio = ref(-1);
// const currentRatio = ref<Size | null>(null);
const showPreview = ref<string | null>(null);

let selectedIndex = ref(-1);
let displayCrop = ref<Rect>({ x:0, y:0, width:160, height:90 });
function updateCropCoordinates() {
	if (selectedIndex.value == -1) return false;

	const cropRect = cropper.value!.getResult();
	images.value[selectedIndex.value].crop = {
		x: cropRect.coordinates.left,
		y: cropRect.coordinates.top,
		width: cropRect.coordinates.width,
		height: cropRect.coordinates.height,
	}
}
function onImageChange(index: number) {
	if (selectedIndex.value !== -1) {
		updateCropCoordinates();
	}
	selectedIndex.value = index;
	showPreview.value = null;
}
const bucketResolutionList = ref<Size[]>([]);
function onBucketChange(value: number | null) {
	if (value == null) return;

	if (value == -1) {
		currentRatio.value = null;
		bucketResolutionList.value = [];
		bucketResolution.value = -1;
		return;
	}

	currentRatio.value = buckets.value[value].ratio;
	bucketResolutionList.value = buckets.value[value].sizes;
	const img = images.value[targetIndex];
	if (img.resize == null) {
		bucketResolution.value = -1;
	} else {
		bucketResolution.value = buckets.value[value].sizes.findIndex((v) => {
			return v.width == img.resize!.width && v.height == img.resize!.height;
		});
	}
	
	console.log("=====", bucketResolution.value);
}
function onCropperChange(options: CropperResult) {
	displayCrop.value = {
		x: options.coordinates.left,
		y: options.coordinates.top,
		width: options.coordinates.width,
		height: options.coordinates.height,
	}
}

function getCropperDefaultPosition() {
	const item = images.value[selectedIndex.value];
	return {
		left: item.crop.x,
		top: item.crop.y,
	};
}
function getCropperDefaultSize() {
	const item = images.value[selectedIndex.value];
	return {
		width: item.crop.width,
		height: item.crop.height
	};
}
function onFileAdded(e: Event) {
	const files = Array.from((e.target as HTMLInputElement).files!);
	files.forEach((file) => {
		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = function () {
				const defaultCrop = calculateDefaultCrop({
					width: img.naturalWidth,
					height: img.naturalHeight,
				}, 0.8)
				const append: Image = {
					src: reader.result as string,
					title: file.name,
					width: img.naturalWidth,
					height: img.naturalHeight,
					crop: defaultCrop,
					bucket: -1,
				};
				images.value = [...images.value, append];
			}
			img.src = reader.result as string;
		};
		reader.readAsDataURL(file);
	});
}

const cropperStencilProps = computed(() => {
	if (bucketRatioRadio.value == -1 || currentRatio.value == null) {
		return {

		}
	} else {
		return {
			aspectRatio: currentRatio.value.width / currentRatio.value.height,
		}
	}
});

type ResponseType = 'base64' | 'blob';
function cropImage(src: string, crop: Rect, type: ResponseType) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (ctx == null) return null;

	const img = new Image();
	const promise = new Promise<string | Blob>((resolve, reject) => {
		img.onerror = function (e) {
			reject(e);
		}

		img.onload = function() {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);

			const cropped = ctx.getImageData(crop.x, crop.y, crop.width, crop.height);
			canvas.width = crop.width;
			canvas.height = crop.height;

			ctx.putImageData(cropped, 0, 0);
			if (type === 'base64') {
				resolve(canvas.toDataURL());
			} else {
				canvas.toBlob((blob: Blob | null) => {
					if (blob == null) reject("null blob");
					else resolve(blob);
				});
			}
		}
	});
	img.src = src;
	return promise;
}

function onKeyup(e: KeyboardEvent) {
	if (e.key == '`') {
		if (selectedIndex.value == -1 || images.value[selectedIndex.value].crop == null) return;
		if (showPreview.value == null || cropper.value != null) {
			updateCropCoordinates();
			
			const crop = cropImage(images.value[selectedIndex.value].src, images.value[selectedIndex.value].crop!, "base64");
			if (crop == null) {
				alert("cannot get preview image.");
			} else {
				e.stopPropagation();
				e.preventDefault();
				crop.then((dataUrl) => {
					showPreview.value = dataUrl as string;
				})
			}
		} else {
			e.stopPropagation();
			e.preventDefault();
			showPreview.value = null;
		}
	}
}
onMounted(() => {
	document.addEventListener('keyup', onKeyup);
})
onUnmounted(() => {
	document.removeEventListener('keyup', onKeyup);
})

async function exportAsZip() {
	updateCropCoordinates();

	const zip = new JSZip();
	let skip = 0;
	let cropperPromise: Promise<string | Blob>[] = [];
	let cropperIndex: number[] = [];
	for (let i = 0; i < images.value.length; ++i) {
		const img = images.value[i];
		if (!img.crop) {
			skip = skip + 1;
			continue;
		}

		const cropImgPromise = cropImage(img.src, img.crop, "blob");
		if (cropImgPromise == null) {
			console.log("failed to init canvas for img: ", img.title);
		} else {
			cropperPromise.push(cropImgPromise);
			cropperIndex.push(i);
		}
	}

	Promise.all(cropperPromise).then((val) => {
		val.forEach((data, i) => {
			const img = images.value[cropperIndex[i]];
			zip.file(`${img.title}.png`, data as Blob);

			const jsonData = {
				srcWidth: img.width,
				srcHeight: img.height,
				cropX: img.crop?.x,
				cropY: img.crop?.y,
				cropWidth: img.crop?.width,
				cropHeight: img.crop?.height,
				ratioWidth: img.ratio?.width,
				ratioHeight: img.ratio?.height,
				dstWidth: img.resize?.width,
				dstHeight: img.resize?.height,
			}
			zip.file(`${img.title}.json`, JSON.stringify(jsonData));
		});

		zip.generateAsync({type:"blob"}).then((data) => {
			const link = document.createElement("a");
			link.href = URL.createObjectURL(data);
			link.download = "export.zip";
			link.click();
		});
	}).catch((err) => {
		console.log("failed to export: ", err);
	});
}
</script>

<template>
	<VApp>
		<SplitView @on-panel-resize="cropper?.refresh()" panelbg-color="rgba(127, 127, 127, 0.5)">
			<template v-slot:sidebar>
				<VContainer>
					<VRow class="mb-5">
						<input type="file" style="display: none;" ref="input-field" @change="onFileAdded" multiple
							accept="image/*" />
						<VBtn class="w-100" @click="$refs['input-field'].click()" prepend-icon="mdi-plus">添加图片</VBtn>
					</VRow>
					<VRow class="mb-5">
						<VBtn class="w-100" prepend-icon="mdi-export" @click="exportAsZip">导出</VBtn>
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
										<VRadioGroup v-model="bucketRadio" @update:model-value="onBucketChange">
											<VRadio 
												v-for="(item, i) in buckets" 
												:value="i"
												:label="item.width + ' : ' + item.height"
											/>
											<VRadio label="不使用" value=-1></VRadio>
										</VRadioGroup>
									</VRow>
									<VRow>
										<VBtn prepend-icon="mdi-bookmark-plus-outline" class="w-100">添加配置</VBtn>
									</VRow>
								</VExpansionPanelText>
							</VExpansionPanel>
							<VExpansionPanel>
								<VExpansionPanelTitle>修复</VExpansionPanelTitle>
								<VExpansionPanelText>
									<VRow>
										锐化:
									</VRow>
									<VRow>
										<VSlider>

										</VSlider>
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
						<template v-if="showPreview">
							<img :src="showPreview" />
						</template>
						<template v-else>
							<Cropper class="cropper" :src="images[selectedIndex].src"
								:stencil-props="cropperStencilProps"
								ref="cropper" 
								@change="onCropperChange" 
								:default-position="getCropperDefaultPosition"
								:default-size="getCropperDefaultSize"
							/>
						</template>
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