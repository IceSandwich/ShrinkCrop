<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import SplitView from './components/SplitView.vue';
import ImageList from './components/ImageList.vue';
import UploadBtn from './components/UploadBtn.vue';
import CropperWithPreview from './components/CropperWithPreview.vue';
import ImageInfoExpansionPanel from './components/ExpansionPanels/ImageInfo.vue';
import ShortcutExpansionPanel from './components/ExpansionPanels/Shortcut.vue';
import BucketsExpansionPanel from './components/ExpansionPanels/Buckets.vue';
import RepairExpansionPanel from './components/ExpansionPanels/Repair.vue';
import DeleteDialog from './components/DeleteDialog.vue';
import type { Image, Bucket, Rect, Size, ExportData } from './components/commons';
import { applyImage, calculateAspectRatio, calculateDefaultCrop } from './components/commons';
import JSZip from 'jszip';

const images = ref<Image[]>([]);
const buckets = ref<Bucket[]>([]);
const cropper = useTemplateRef("cropper");
const bucketPanel = useTemplateRef("bucket-panel");
const repairPanel = useTemplateRef("repair-panel");

let selectedIndex = shallowRef(-1);
let displayCrop = ref<Rect>({ x:0, y:0, width:160, height:90 });
function updateCropCoordinates() {
	if (selectedIndex.value == -1) return false;
	if (!cropper.value) return false;
	if (cropper.value.IsPreviewMode()) return false;

	const cropRect = cropper.value.GetResult();
	images.value[selectedIndex.value].crop = cropRect;
	images.value[selectedIndex.value].bucket = bucketPanel.value!.GetBucketId();
}
function onImageChange(index: number) {
	updateCropCoordinates();
	cropper.value?.ShowPreview(false);
	repairPanel.value?.SetResizeQuality(images.value[index].resizeQuality);
	bucketPanel.value?.SetBucketId(images.value[index].bucket);
	selectedIndex.value = index;
}

const showAlert = shallowRef(false);
function onCropperChange(coordinate: Rect) {
	displayCrop.value = coordinate;
	const makeAlert = function() {
		console.log("sdsdsd", selectedIndex.value, images.value[selectedIndex.value].bucket);
		if (selectedIndex.value == -1) return false;
		if (images.value[selectedIndex.value].bucket == -1) return false;
		const size = buckets.value[images.value[selectedIndex.value].bucket].size;
		if (displayCrop.value.width < size.width || displayCrop.value.height < size.height) {
			return true;
		}
		return false;
	}
	showAlert.value = makeAlert();
}

function onAddConfigApplyClicked(width: number, height: number) {
	buckets.value.push({
		size: {
			width: width,
			height: height,
		},
		ratio: calculateAspectRatio(width, height),
	});
	const index = buckets.value.length - 1;
	images.value[selectedIndex.value].bucket = index;
	bucketPanel.value?.SetBucketId(index);
	bucketPanel.value?.HideAddConfigDialog();
}
function onAddConfigBtnClicked() {
	if (!cropper.value) return;
	if (cropper.value.IsPreviewMode()) {
		alert("Please exit preview mode.");
		return;
	}

	const cropRect = cropper.value.GetResult();
	bucketPanel.value?.ShowAddConfigDialog(cropRect.width, cropRect.height);
}
function onBucketChange(value: number) {
	if (value == -1) {
		cropper.value?.SetRatio(null);
	} else {
		cropper.value?.SetRatio(buckets.value[value].ratio);
	}
}


function onFileAdded(files: File[]) {
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
					resizeQuality: "medium",
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

		const cropImgPromise = applyImage(img.src, img.crop, targetSize, img.resizeQuality, "blob");
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

function onResizeQualityChanged(val: ImageSmoothingQuality) {
	images.value[selectedIndex.value].resizeQuality = val;
	cropper.value?.Refresh();
}


const deleteDialog = useTemplateRef("deleteDialog");
function onKeyup(e: KeyboardEvent) {
	if (e.key == '`') {
		e.stopPropagation();
		e.preventDefault();

		if (cropper.value) {
			if (cropper.value.IsPreviewMode()) {
				cropper.value.ShowPreview(false);
			} else {
				updateCropCoordinates();
				cropper.value.ShowPreview(true);
			}
		}
	}

	if (e.key.toLowerCase() == 'delete') {
		if (selectedIndex.value == -1) return;
		
		deleteDialog.value?.ShowDialog();
	}
}
const imageList = useTemplateRef("imageList");
function onDeleteDialogApplyClicked() {
	cropper.value?.ShowPreview(false);
	const imgCount = images.value.length;
	images.value.splice(selectedIndex.value, 1);
	if (selectedIndex.value == imgCount - 1) {
		selectedIndex.value = imgCount - 2;
	}
	if (selectedIndex.value != -1) {
		bucketPanel.value?.SetBucketId(images.value[selectedIndex.value].bucket);
	}
	imageList.value?.SetID(selectedIndex.value);
	deleteDialog.value?.HideDialog();
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
		<DeleteDialog ref="deleteDialog" @on-confirm-delete="onDeleteDialogApplyClicked">
			确定删除该图片吗？
		</DeleteDialog>
		<SplitView @on-panel-resize="cropper?.Refresh()" panelbg-color="rgba(127, 127, 127, 0.5)">
			<template v-slot:sidebar>
				<VContainer>
					<VRow class="mb-5">
						<UploadBtn multiple accept="image/*" prepend-icon="mdi-plus" @on-select-files="onFileAdded" color="teal-darken-3">添加图片</UploadBtn>
					</VRow>
					<VRow class="mb-5">
						<VBtn class="w-100" prepend-icon="mdi-export" @click="exportAsZip">导出</VBtn>
					</VRow>
					<VRow>
						<VExpansionPanels v-if="selectedIndex !== -1" v-model="sidebarMenuExpansion" multiple>
							<ImageInfoExpansionPanel :img="images[selectedIndex]" :display-crop="displayCrop" :show-alert="showAlert" />
							<BucketsExpansionPanel ref="bucket-panel" :buckets="buckets" :images="images" @on-add-config-btn-clicked="onAddConfigBtnClicked" @on-add-config="onAddConfigApplyClicked" @-on-bucket-changed="onBucketChange" />
							<RepairExpansionPanel ref="repair-panel" @on-resize-quality-changed="onResizeQualityChanged" />
							<ShortcutExpansionPanel />
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
						<CropperWithPreview 
							ref="cropper"
							:img="images[selectedIndex]" 
							:buckets="buckets"
							@on-cropper-update="onCropperChange" 
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