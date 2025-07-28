<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
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
interface Bucket {
	size: Size;
	ratio: Size;
}
let ctx: CanvasRenderingContext2D | null = null;

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
type ResponseType = 'base64' | 'blob';
/**
 * 实现ResizeAndCrop的逻辑，最后保证输出尺寸为`targetSize`
 */
function applyImage(src: string, crop: Rect, targetSize: Size, type: ResponseType) {
	if (ctx == null) return null;

	const img = new Image();
	const promise = new Promise<string | Blob>((resolve, reject) => {
		img.onerror = function (e) {
			reject(e);
		}

		img.onload = function() {
			if (crop.width / crop.height > targetSize.width / targetSize.height) {
				crop.width = Math.ceil(targetSize.width * crop.height / targetSize.height);
			} else {
				crop.height = Math.ceil(targetSize.height * crop.width / targetSize.width);
			}

			console.log(`Crop ratio: ${crop.width} / ${crop.height} = ${crop.width / crop.height}, target ratio: ${targetSize.width} / ${targetSize.height} = ${targetSize.width / targetSize.height}`);

			canvas.width = targetSize.width;
			canvas.height = targetSize.height;
			ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, targetSize.width, targetSize.height);

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
/**
 * 对base64图像或blob图像应用虚化蒙版
 */
function sharpenImage(src: string | Blob, strength: number) {
	if (ctx == null) return null;

	const processBase64Img = function (base64src: string) {
		const img = new Image();
		img.onload = function() {
			
		}
		img.src = base64src;
	}

	if (typeof src === typeof Blob) {
		const reader = new FileReader();
		reader.onload = () => processBase64Img(reader.result as string);
		reader.readAsDataURL(src as Blob);
	} else {
		processBase64Img(src as string);
	}
}

const images = ref<Image[]>([]);
const buckets = ref<Bucket[]>([]);
const cropper = useTemplateRef("cropper");
const showPreview = ref<string | null>(null);
const bucketRadio = ref(-1);

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

	images.value[selectedIndex.value].bucket = bucketRadio.value;
}
function onImageChange(index: number) {
	updateCropCoordinates();
	selectedIndex.value = index;
	bucketRadio.value = images.value[index].bucket;
	showPreview.value = null;
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
function onCropperChange(options: CropperResult) {
	displayCrop.value = {
		x: options.coordinates.left,
		y: options.coordinates.top,
		width: options.coordinates.width,
		height: options.coordinates.height,
	}
}
const currentRatio = shallowRef<Size | null>(null);
const cropperStencilProps = computed(() => {
	if (currentRatio.value == null) {
		return { }
	} else {
		return {
			aspectRatio: currentRatio.value.width / currentRatio.value.height,
		}
	}
});


const bucketDialog = shallowRef(false);
const addConfigKeepRatioCheckbox = shallowRef(true);
const addConfigTargetWidth = shallowRef(0);
const addConfigTargetHeight = shallowRef(0);
let oldTargetSize: Size = {width: 0, height: 0};
function saveTargetSize() {
	oldTargetSize.width = addConfigTargetWidth.value;
	oldTargetSize.height = addConfigTargetHeight.value;
}
function onAddConfigTargetWidthChanged(val: boolean) {
	if (val) {
		saveTargetSize();
	} else {
		if (oldTargetSize.width != 0 && addConfigKeepRatioCheckbox.value) {
			addConfigTargetHeight.value = Math.floor(addConfigTargetWidth.value * oldTargetSize.height / oldTargetSize.width);
		}
	}
}
function onAddConfigTargetHeightChanged(val: boolean) {
	if (val) {
		saveTargetSize();
	} else {
		if (oldTargetSize.height != 0 && addConfigKeepRatioCheckbox.value) {
			addConfigTargetWidth.value = Math.floor(addConfigTargetHeight.value * oldTargetSize.width / oldTargetSize.height);
		}
	}
}
function onAddConfigClicked() {
	bucketDialog.value = false;
	buckets.value.push({
		size: {
			width: addConfigTargetWidth.value,
			height: addConfigTargetHeight.value,
		},
		ratio: calculateAspectRatio(addConfigTargetWidth.value, addConfigTargetHeight.value),
	});
}
function onBucketChange(value: number | null) {
	if (value == null) return;

	if (value == -1) {
		currentRatio.value = null;
		return;
	}
	currentRatio.value = buckets.value[value].ratio;
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

		const targetSize = img.bucket == -1 ? {
			width: img.crop.width,
			height: img.crop.height,
		} : buckets.value[img.bucket].size;

		const cropImgPromise = applyImage(img.src, img.crop, targetSize, "blob");
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
				bucket: img.bucket == -1 ? null : buckets.value[img.bucket],
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


function onKeyup(e: KeyboardEvent) {
	if (e.key == '`') {
		if (selectedIndex.value == -1 || images.value[selectedIndex.value].crop == null) return;
		if (showPreview.value == null || cropper.value != null) {
			updateCropCoordinates();
			
			const crop = applyImage(images.value[selectedIndex.value].src, images.value[selectedIndex.value].crop, buckets.value[selectedIndex.value].size, "base64");
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

	const canvas = document.createElement('canvas');
	ctx = canvas.getContext('2d');
})
onUnmounted(() => {
	document.removeEventListener('keyup', onKeyup);
})
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
											>
												<template v-slot:label>
													{{ item.size.width }} x {{ item.size.height }} ( {{  item.ratio.width  }} : {{  item.ratio.height }})
												</template>
											</VRadio>
											<VRadio label="不使用" value=-1></VRadio>
										</VRadioGroup>
									</VRow>
									<VRow>
										<VDialog v-model="bucketDialog" max-width="600">
											<template v-slot:activator="{ props: activatorProps }">
												<VBtn prepend-icon="mdi-bookmark-plus-outline" class="w-100" v-bind="activatorProps">添加配置</VBtn>
											</template>

											<VCard prepend-icon="mdi-bookmark-plus-outline" title="添加配置">
												<VCardText>
													<VRow>
														<VCol cols="6">
															<VNumberInput
																control-variant="hidden"
																label="Target Width"
																v-model="addConfigTargetWidth"
																@update:focused="onAddConfigTargetWidthChanged"
															/>
														</VCol>
														<VCol cols="6">
															<VNumberInput
																control-variant="hidden"
																label="Target Height"
																v-model="addConfigTargetHeight"
																@update:focused="onAddConfigTargetHeightChanged"
															/>
														</VCol>
													</VRow>
													<VRow>
														<VCheckbox
															label="保存宽高比"
															v-model="addConfigKeepRatioCheckbox"
														/>
													</VRow>
												</VCardText>
												<template v-slot:actions>
													<VBtn class="ms-auto" text="添加" @click="onAddConfigClicked" />
												</template>
											</VCard>
										</VDialog>
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