<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, useTemplateRef } from 'vue';
import ImageList from './components/ImageList.vue';
import SplitView from './components/SplitView.vue';
import BucketsExpansionPanels from './components/ExpansionPanels/Buckets.vue';
import { DownloadFile, OpenFileDialog, PackAsZIP, ReadAsImage, ReadAsJson, type ImageInstance } from './utils/FileSystem';
import type { Bucket, CropRect, ImageItem, Project, ProjectImageData, Rect } from './utils/Types';
import { CalculateDefaultCrop, CropImageAsBlob, FindJsonInFileList, HasBucket, HasUpscale } from './utils/Functions';
import Cropper from './components/Cropper.vue';
import { remove } from 'jszip';

let images = ref<ImageItem[]>([]);
const imglist = useTemplateRef("imglist");
const cropper = useTemplateRef("cropper");
let imgIndex = ref(-1);
let selectedCropIndex = ref(-1);
let buckets = reactive(new Map<string, Bucket>());
const expandModel = shallowRef(["bucket"]);

function onImportClicked() {
	OpenFileDialog("image/*", true, async function (filelist) {
		const imgs = await Promise.all(filelist.map((v, i) => ReadAsImage(v)))

		imgs.forEach((v, i) => {
			let crops: CropRect[] = [{
				...CalculateDefaultCrop({
					width: v.img.naturalWidth,
					height: v.img.naturalHeight,
				}, 0.8),
				bucket: "",
			}];
			images.value.push({
				imgurl: v.url,
				filename: v.filename,
				width: v.img.naturalWidth,
				height: v.img.naturalHeight,
				crops: crops,
				cachedHasCrop: false,
				cachedHasUpscale: false,
			});
		});

		if (imgIndex.value === -1) {
			imglist.value?.SetID(0);
			onImgListChangeIndex(0);
		}
	});
}

function onImportProjectClicked() {
	OpenFileDialog("application/json", false, async function (filelist) {
		const filenameToIndex = new Map<string, number>();
		images.value.forEach((v, i) => filenameToIndex.set(v.filename, i));

		const jsonData = await ReadAsJson<Project>(filelist[0]);
		if (jsonData.metadata.version !== 1) {
			alert(`Unsupported version ${jsonData.metadata.version}`);
			return;
		}
		for (const [key, value] of Object.entries(jsonData.buckets)) {
			buckets.set(key, value);
		}

		let missingFiles: string[] = [];
		for (const [key, value] of Object.entries(jsonData.files)) {
			const index = filenameToIndex.get(key);
			if (index) {
				images.value[index].crops = value.crops;
				images.value[index].cachedHasCrop = HasBucket(images.value[index]);
				if (images.value[index].cachedHasCrop) {
					images.value[index].cachedHasUpscale = HasUpscale(images.value[index], buckets);
				}
			} else {
				missingFiles.push(key);
			}
		}

		cleanUselessBuckets();

		// TODO: print missing files
	});
}

function cleanUselessBuckets() {
	let count: number[] = [];
	let indexToName: string[] = [];
	let nameToIndex = new Map<string, number>();
	for (const [key, value] of buckets) {
		indexToName.push(key);
		nameToIndex.set(key, count.length);
		count.push(0);
	}

	for (const item of images.value) {
		for (const crop of item.crops) {
			if (crop.bucket) {
				const bucketIdx = nameToIndex.get(crop.bucket);
				if (bucketIdx !== undefined) {
					count[bucketIdx] += 1;
				}
			}
		}
	}

	let remove = 0;
	for (var i = 0; i < count.length; i++) {
		if (count[i] === 0) {
			buckets.delete(indexToName[i]);
			remove += 1;
		}
	}

	return remove;
}

function onRemoveUselessBucketsClicked() {
	const count = cleanUselessBuckets();
	if (count === 0) {
		alert(`已最优化。`);
	} else {
		alert(`已清理 ${count} 个桶。`);
	}
}

async function onExportClicked() {
	if (images.value.length === 0) {
		alert("没有任何文件需要导出");
		return;
	}

	let project: Project = {
		metadata: {
			version: 1,
		},
		files: Object.fromEntries(images.value.map((v) => [v.filename, {
			crops: v.crops,
		}])),
		buckets: Object.fromEntries(buckets.entries()),
	};
	let zipfile = new Map<string, string | Blob>();
	for (var j = 0; j < images.value.length; j++) {
		const v = images.value[j];
		for (var i = 0; i < v.crops.length; i++) {
			let tw = v.crops[i].width, th = v.crops[i].height;
			if (v.crops[i].bucket !== "") {
				const bucket = buckets.get(v.crops[i].bucket);
				if (bucket) {
					tw = bucket.width;
					th = bucket.height;
				}
			}
			zipfile.set(`${v.filename}_${i}.png`, await CropImageAsBlob(v.imgurl, v.crops[i].x, v.crops[i].y, v.crops[i].width, v.crops[i].height, tw, th));
		}
	}
	zipfile.set(`project.json`, JSON.stringify(project, null, 4));
	DownloadFile("export.zip", await PackAsZIP(zipfile));
}

function onImgListChangeIndex(id: number) {
	imgIndex.value = id;
	selectedCropIndex.value = 0;
	cropper.value?.OnResize();
	cropper.value?.SetImage(images.value[id], selectedCropIndex.value);
}

function onCropperUpdated() {
	images.value[imgIndex.value].cachedHasCrop = HasBucket(images.value[imgIndex.value]);
	if (images.value[imgIndex.value].cachedHasCrop) {
		images.value[imgIndex.value].cachedHasUpscale = HasUpscale(images.value[imgIndex.value], buckets);
	} else {
		images.value[imgIndex.value].cachedHasUpscale = false;
	}
}

function onBucketUpdated() {
	onCropperUpdated();
	cropper.value?.Redraw();
}

const formatBar = computed(() => {
	const ig = images.value[imgIndex.value];
	const r = ig.crops[selectedCropIndex.value];
	return `Img: ${imgIndex.value + 1} / ${images.value.length}, Crop: ${r.x}, ${r.y}, ${r.width} x ${r.height} / ${ig.width} x ${ig.height}`;
});

function onBeforeUnload(e: BeforeUnloadEvent) {
	if (images.value.length === 0) return;

	e.preventDefault();
	e.returnValue = '';
}

function onGithubClicked() {
	window.open("https://icesandwich.github.io/ShrinkCrop", "_blank");
}

onMounted(() => {
	window.addEventListener("beforeunload", onBeforeUnload);
})

onUnmounted(() => {
	window.removeEventListener("beforeunload", onBeforeUnload);
})

</script>

<template>
	<VApp theme="PurpleTheme">
		<VAppBar class="bg-purple-darken-4">
			<VBtn size="large" class="ms-3" prepend-icon="mdi-crop" variant="text">
				<VAppBarTitle class="select">ShrinkCrop</VAppBarTitle>
			</VBtn>

			<VDivider vertical inset class="ms-3"></VDivider>

			<VToolbarItems variant="plain">
				<VBtn prepend-icon="mdi-plus" class="text-none" @click="onImportClicked">
					导入图片
				</VBtn>
				<VBtn prepend-icon="mdi-cog" class="text-none" @click="onImportProjectClicked">
					导入工程
				</VBtn>
				<VBtn prepend-icon="mdi-export" class="text-none" @click="onExportClicked">
					导出结果
				</VBtn>
				<VBtn prepend-icon="mdi-pail-remove" class="text-none" @click="onRemoveUselessBucketsClicked">
					清理无用桶
				</VBtn>
				<VBtn prepend-icon="mdi-github" class="text-none" @click="onGithubClicked">
					Github
				</VBtn>
			</VToolbarItems>

			<VSpacer></VSpacer>

			<VToolbarItems variant="plain" class="mr-4">
				<VLabel>
					<div v-if="imgIndex != -1 && selectedCropIndex != -1">
						{{ formatBar }}
					</div>
				</VLabel>
			</VToolbarItems>
		</VAppBar>

		<VMain>
			<SplitView panelbg-color="lightgray" @on-panel-resize="cropper?.OnResize()">
				<template v-slot:sidebar>
					<VContainer>
						<VRow>
							<VExpansionPanels v-if="imgIndex !== -1 && selectedCropIndex !== -1" multiple v-model="expandModel" >
								<BucketsExpansionPanels :crop="images[imgIndex].crops[selectedCropIndex]" :buckets="buckets" @on-bucket-update="onBucketUpdated"></BucketsExpansionPanels value="bucket">
							</VExpansionPanels>
						</VRow>
					</VContainer>
				</template>
				<template v-slot:content>
					<div class="content">
						<ImageList :items="images" @change="onImgListChangeIndex" ref="imglist"></ImageList>
						<Cropper ref="cropper" @on-changed-crop-index="id => selectedCropIndex = id" :buckets="buckets" @on-update="onCropperUpdated"></Cropper>
					</div>
				</template>
			</SplitView>
		</VMain>
	</VApp>
</template>

<style lang="css" scoped>
.content {
	display: flex;
	flex-direction: column;
	height: 100%;
}
</style>