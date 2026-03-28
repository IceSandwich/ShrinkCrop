<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, useTemplateRef } from 'vue';
import ImageList from './components/ImageList.vue';
import SplitView from './components/SplitView.vue';
import BucketsExpansionPanels from './components/ExpansionPanels/Buckets.vue';
import TagsExpansionPanels from './components/ExpansionPanels/Tags.vue';
import { OpenFileDialog, PackAsZIP, ReadAsImage, ReadAsJson } from './utils/FileSystem';
import type { Bucket, CropRectWithTags, ImageItem, Project, ProjectImageData } from './utils/Types';
import { CalculateDefaultCrop, CalculateMD5, CropImageAsBase64, CropImageAsBlob, HasBucket, HasUpscale, MergeUniqueArrays } from './utils/Functions';
import Cropper from './components/Cropper.vue';
import { InvokeUserDownloadFile } from './utils/Network';
import ModelDialog from './components/ModelDialog.vue';
import { TagModelInstance, TagPool } from './utils/TagModel';
import TagEditDialog from './components/TagEditDialog.vue';

let images = ref<ImageItem[]>([]);
const imglist = useTemplateRef("imglist");
let imgIndex = ref(-1);
let selectedCropIndex = ref(-1);
let buckets = reactive(new Map<string, Bucket>());
const expandModel = shallowRef(["bucket"]);


/************* MENU FUNCTIONS ******************/

function onImportClicked() {
	OpenFileDialog("image/*", true, async function (filelist) {
		const imgs = await Promise.all(filelist.map((v, i) => ReadAsImage(v)))

		imgs.forEach((v, i) => {
			let crops: CropRectWithTags[] = [{
				...CalculateDefaultCrop({
					width: v.img.naturalWidth,
					height: v.img.naturalHeight,
				}, 0.8),
				bucket: "",
				srcTags: [],
				selectedTags: [],
			}];
			images.value.push({
				md5: CalculateMD5(v.url),
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

const modelDialog = useTemplateRef("modelDialog");
function onTagModelClicked() {
	modelDialog.value?.ShowDialog();
}

async function onExportClicked() {
	if (images.value.length === 0) {
		alert("没有任何文件需要导出");
		return;
	}

	let prjfiles: ProjectImageData[] = [];
	let availableBuckets = new Map<string, Bucket>();
	let zipfile = new Map<string, string | Blob>();
	
	for (var j = 0; j < images.value.length; j++) {
		const v = images.value[j];
		if (v.crops.length > 1) throw new Error("unsupported multiple crops");
		if (v.crops.length == 0) continue;

		const crop = v.crops[0];
		let tw = crop.width, th = crop.height;
		let usedBucket = crop.bucket;
		if (usedBucket !== "") {
			const bucket = buckets.get(usedBucket);
			if (!bucket) {
				alert(`cannot find the bucket for image ${v.filename}, unexpected logical error`);
				usedBucket = ""
			} else {
				tw = bucket.width;
				th = bucket.height;
				if (!availableBuckets.has(usedBucket)) {
					availableBuckets.set(usedBucket, bucket)
				}
			}
		}
		const name = `img${j}.png`;
		prjfiles.push({
			filename: name,
			md5: v.md5,
			crops: [{
				bucket: usedBucket,
				x: crop.x,
				y: crop.y,
				width: tw,
				height: th,
				srcTags: crop.srcTags,
				selectedTags: crop.selectedTags,
			}],
		})
		zipfile.set(`images/${name}`, await CropImageAsBlob(v.imgurl, crop.x, crop.y, crop.width, crop.height, tw, th));
	}
	let prj: Project = {
		metadata: {
			version: 1,
		},
		files: prjfiles,
		buckets: Object.fromEntries(availableBuckets.entries()),
	}
	zipfile.set(`project.json`, JSON.stringify(prj, null, 4));
	InvokeUserDownloadFile("export.zip", await PackAsZIP(zipfile));
}

function onGithubClicked() {
	window.open("https://github.com/IceSandwich/ShrinkCrop", "_blank");
}

/*********** CALLBACKS ***********/

const cropper = useTemplateRef("cropper");

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

const tagEditDialog = useTemplateRef("tagEditDialog");
async function onInvokeModelInfer() {
	if (TagModelInstance.value == null) {
		console.error(`TagModelInstance is null`);
		return;
	}
	if (selectedCropIndex.value == -1) {
		throw new Error(`selectedCropIndex is -1`);
	}

	const current = images.value[imgIndex.value];
	const crop = current.crops[selectedCropIndex.value];

	const cropedImg = await CropImageAsBase64(current.imgurl, current.crops[0].x, current.crops[0].y, current.crops[0].width, current.crops[0].height, current.crops[0].width, current.crops[0].height);

	const result = await TagModelInstance.value.InferTags(cropedImg);
	console.log(result);
	crop.srcTags = result.map(v => v.name);
	TagPool.value = MergeUniqueArrays(TagPool.value, crop.srcTags);
	crop.selectedTags = result.map(v => v.name);
}

function onTagSettingClicked() {
	tagEditDialog.value?.ShowDialog();
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


onMounted(() => {
	window.addEventListener("beforeunload", onBeforeUnload);
})

onUnmounted(async () => {
	window.removeEventListener("beforeunload", onBeforeUnload);

	await TagModelInstance.value?.Release();
})

</script>

<template>
	<VApp theme="PurpleTheme">
		<ModelDialog ref="modelDialog"></ModelDialog>
		<TagEditDialog ref="tagEditDialog"></TagEditDialog>

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
				<VBtn prepend-icon="mdi-tag" class="text-none" @click="onTagModelClicked">
					打标模型
				</VBtn>
				<VBtn prepend-icon="mdi-tag" class="text-none" @click="onTagSettingClicked" v-if="TagModelInstance != null">
					标签设置
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

		<VMain style="height: 100%">
			<SplitView panelbg-color="lightgray" @on-panel-resize="cropper?.OnResize()">
				<template v-slot:sidebar>
					<VContainer>
						<VRow>
							<VExpansionPanels v-if="imgIndex !== -1 && selectedCropIndex !== -1" multiple v-model="expandModel" >
								<BucketsExpansionPanels :crop="images[imgIndex].crops[selectedCropIndex]" :buckets="buckets" @on-bucket-update="onBucketUpdated"></BucketsExpansionPanels value="bucket">
								<TagsExpansionPanels v-model:cur-tags="images[imgIndex].crops[selectedCropIndex].selectedTags" @on-invoke-model-infer="onInvokeModelInfer" v-if="TagModelInstance != null"></TagsExpansionPanels>
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