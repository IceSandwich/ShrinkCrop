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
interface ExportData {
	srcWidth: number,
	srcHeight: number,
	cropX: number,
	cropY: number,
	cropWidth: number,
	cropHeight: number,
	bucket: Bucket | null,
}

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
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (ctx == null) return null;
	ctx.imageSmoothingEnabled = true;         // 开启插值
    ctx.imageSmoothingQuality = "medium";       // 设置高质量插值

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
const showPreview = shallowRef<string | null>(null);
const bucketRadio = shallowRef(-1);

let selectedIndex = shallowRef(-1);
let displayCrop = ref<Rect>({ x:0, y:0, width:160, height:90 });
function updateCropCoordinates() {
	if (selectedIndex.value == -1) return false;
	if (!cropper.value) return false;

	const cropRect = cropper.value.getResult();
	images.value[selectedIndex.value].crop = {
		x: cropRect.coordinates.left,
		y: cropRect.coordinates.top,
		width: cropRect.coordinates.width,
		height: cropRect.coordinates.height,
	}

	images.value[selectedIndex.value].bucket = bucketRadio.value;
}
function onImageChange(index: number) {
	showPreview.value = null;
	updateCropCoordinates();
	selectedIndex.value = index;
	bucketRadio.value = images.value[index].bucket;
	onBucketChange(bucketRadio.value);
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
const showAlert = shallowRef(false);
function onCropperChange(options: CropperResult) {
	displayCrop.value = {
		x: options.coordinates.left,
		y: options.coordinates.top,
		width: options.coordinates.width,
		height: options.coordinates.height,
	}

	const makeAlert = function() {
		console.log("sdsdsd", selectedIndex.value, images.value[selectedIndex.value].bucket);
		if (selectedIndex.value == -1) return false;
		if (images.value[selectedIndex.value].bucket == -1) return false;
		const size = buckets.value[images.value[selectedIndex.value].bucket].size;
		console.log(size, displayCrop.value);
		if (displayCrop.value.width < size.width || displayCrop.value.height < size.height) {
			return true;
		}
		return false;
	}
	showAlert.value = makeAlert();
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
function onAddConfigApplyClicked() {
	buckets.value.push({
		size: {
			width: addConfigTargetWidth.value,
			height: addConfigTargetHeight.value,
		},
		ratio: calculateAspectRatio(addConfigTargetWidth.value, addConfigTargetHeight.value),
	});
	const index = buckets.value.length - 1;
	images.value[selectedIndex.value].bucket = index;
	bucketDialog.value = false;
	bucketRadio.value = index;
	onBucketChange(index);
}
function onAddConfigDialogClicked() {
	if (!cropper.value) {
		alert("cropper.value is null.")
		return;
	}

	const cropRect = cropper.value.getResult();
	addConfigTargetWidth.value = cropRect.coordinates.width;
	addConfigTargetHeight.value = cropRect.coordinates.height;
	bucketDialog.value = true;
}
function onBucketChange(value: number | null) {
	if (value == null) return;

	if (value == -1) {
		currentRatio.value = null;
		return;
	}
	currentRatio.value = buckets.value[value].ratio;
}
const fetchUnusedBuckets = computed(() => {
	return images.value.filter(v => v.bucket == -1).length;
});


const fileproxy = useTemplateRef("input-field");
function onAddFileClicked() {
	fileproxy.value?.click();
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

	let mapping: { [key: string]: ExportData } = {}
	Promise.all(cropperPromise).then((val) => {
		val.forEach((data, i) => {
			const img = images.value[cropperIndex[i]];
			zip.file(`${img.title}.png`, data as Blob);

			mapping[img.title] = {
				srcWidth: img.width,
				srcHeight: img.height,
				cropX: img.crop?.x,
				cropY: img.crop?.y,
				cropWidth: img.crop?.width,
				cropHeight: img.crop?.height,
				bucket: img.bucket == -1 ? null : buckets.value[img.bucket],
			}
		});
	}).then(() => {
		zip.file(`shrink-crop.json`, JSON.stringify(mapping, null, 4));
	}).then(() => {
		zip.generateAsync({type:"blob"}).then((data: Blob) => {
			const link = document.createElement("a");
			link.href = URL.createObjectURL(data);
			link.download = "export.zip";
			link.click();
		});
	}).catch((err) => {
		console.log("failed to export: ", err);
	});
}

function togglePreview(status: boolean | null = null) {
	if (selectedIndex.value == -1 || images.value[selectedIndex.value].crop == null) return false;

	if (status != null) {
		if (status == true) {
			showPreview.value = null;
		} else {
			showPreview.value = null;
			return true;
		}
	}

	if (showPreview.value == null || cropper.value != null) {
		updateCropCoordinates();

		const img = images.value[selectedIndex.value];
		const targetSize = img.bucket == -1 ? {
			width: img.crop.width,
			height: img.crop.height,
		} : buckets.value[img.bucket].size;
		
		const crop = applyImage(img.src, img.crop, targetSize, "base64");
		if (crop == null) {
			alert("cannot get preview image.");
		} else {
			crop.then((dataUrl) => {
				showPreview.value = dataUrl as string;
			})
			return true;
		}
	} else {
		showPreview.value = null;
		return true;
	}
	return false;
}

const deleteDialog = shallowRef(false);
function onKeyup(e: KeyboardEvent) {
	if (e.key == '`') {
		if (togglePreview()) {
			e.stopPropagation();
			e.preventDefault();
		}
	}

	if (e.key.toLowerCase() == 'delete') {
		if (selectedIndex.value == -1) return;
		
		deleteDialog.value = true;
	}

	if (e.key.toLowerCase() == 'a') {
		onAddConfigDialogClicked();
	}
}
const imageList = useTemplateRef("imageList");
function onDeleteDialogApplyClicked() {
	showPreview.value = null;
	const imgCount = images.value.length;
	images.value.splice(selectedIndex.value, 1);
	if (selectedIndex.value == imgCount - 1) {
		selectedIndex.value = imgCount - 2;
	}
	if (selectedIndex.value != -1) {
		bucketRadio.value = images.value[selectedIndex.value].bucket;
		onBucketChange(bucketRadio.value);
	}
	imageList.value?.SetID(selectedIndex.value);
	deleteDialog.value = false;
}
onMounted(() => {
	document.addEventListener('keyup', onKeyup);
})
onUnmounted(() => {
	document.removeEventListener('keyup', onKeyup);
})
const sidebarMenuExpansion = shallowRef([0, 1, 2, 3]);
</script>

<template>
	<VApp>
		<VDialog v-model="deleteDialog" max-width="600">
			<VCard>
				<VCardText>
					确定删除该图片吗？
				</VCardText>
				<template v-slot:actions>
					<VBtn @click="deleteDialog = false">取消</VBtn>
					<VBtn @click="onDeleteDialogApplyClicked" prepend-icon="mdi-delete" variant="tonal" color="red-darken-3">确定删除</VBtn>
				</template>
			</VCard>
		</VDialog>
		<SplitView @on-panel-resize="cropper?.refresh()" panelbg-color="rgba(127, 127, 127, 0.5)">
			<template v-slot:sidebar>
				<VContainer>
					<VRow class="mb-5">
						<input type="file" style="display: none;" ref="input-field" @change="onFileAdded" multiple
							accept="image/*" />
						<VBtn class="w-100" @click="onAddFileClicked" prepend-icon="mdi-plus">添加图片</VBtn>
					</VRow>
					<VRow class="mb-5">
						<VBtn class="w-100" prepend-icon="mdi-export" @click="exportAsZip">导出</VBtn>
					</VRow>
					<VRow>
						<VExpansionPanels v-if="selectedIndex !== -1" v-model="sidebarMenuExpansion" multiple>
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
									<VRow v-if="showAlert" class="pt-3">
										<VAlert border="start" border-color="red-darken-2" elevation="2">
											放大裁剪区域
										</VAlert>
									</VRow>
								</VExpansionPanelText>
							</VExpansionPanel>
							<VExpansionPanel>
								<VExpansionPanelTitle>桶</VExpansionPanelTitle>
								<VExpansionPanelText class="px-3 py-3">
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
											<VRadio :value="-1">
												<template v-slot:label>
													不使用 ( {{ fetchUnusedBuckets }} / {{ images.length }} )
												</template>
											</VRadio>
										</VRadioGroup>
									</VRow>
									<VRow>
										<VBtn color="indigo-darken-3" size="large" prepend-icon="mdi-bookmark-plus-outline" class="w-100" @click="onAddConfigDialogClicked">添加配置 (A)</VBtn>
										<VDialog v-model="bucketDialog" max-width="600">
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
													<VBtn class="ms-auto" text="添加" @click="onAddConfigApplyClicked" />
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
							<VExpansionPanel>
								<VExpansionPanelTitle>操作</VExpansionPanelTitle>
								<VExpansionPanelText class="px-3 py-3">
									<VRow>
										预览(快捷键：`)
									</VRow>
									<VRow>
										切换效果(快捷键: s)
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
						<ImageList :items="images" @change="onImageChange" ref="imageList"></ImageList>
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