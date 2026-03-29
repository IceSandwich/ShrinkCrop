<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import ImageList from './components/ImageList.vue';
import SplitView from './components/SplitView.vue';
import Cropper from './components/Cropper.vue';
import { TagModelInstance} from './utils/TagModel';
import AppBar from './ui/AppBar.vue';
import Sidebar from './ui/Sidebar.vue';
import { AppProject } from './ui/Shared';

const imgIndex = ref(-1);
const selectedCropIndex = ref(-1);

function onImportedImages() {
	if (imgIndex.value === -1) {
		imgIndex.value = 0;
		onImgListChangeIndex();
	}
}

const cropper = useTemplateRef("cropper");

function onImgListChangeIndex() {
	selectedCropIndex.value = 0;
	cropper.value?.Resize();
	cropper.value?.SetImage(AppProject.images.value[imgIndex.value], selectedCropIndex.value);
}

function onCropperUpdated() {
// 	images.value[imgIndex.value].cachedHasCrop = HasBucket(images.value[imgIndex.value]);
// 	if (images.value[imgIndex.value].cachedHasCrop) {
// 		images.value[imgIndex.value].cachedHasUpscale = HasUpscale(images.value[imgIndex.value], buckets);
// 	} else {
// 		images.value[imgIndex.value].cachedHasUpscale = false;
// 	}
}

function onBucketUpdated() {
	onCropperUpdated();
	cropper.value?.Redraw();
}

const formatBar = computed(() => {
	const ig = AppProject.images.value[imgIndex.value];
	const r = ig.crops[selectedCropIndex.value];
	return `Img: ${imgIndex.value + 1} / ${AppProject.images.value.length}, Crop: ${r.x}, ${r.y}, ${r.width} x ${r.height} / ${ig.width} x ${ig.height}`;
});

function onBeforeUnload(e: BeforeUnloadEvent) {
	if (AppProject.images.value.length === 0) return;

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
		<AppBar @on-imported-images="onImportedImages">
			<template v-slot:status>
				<VToolbarItems variant="plain" class="mr-4">
					<VLabel>
						<div v-if="imgIndex != -1 && selectedCropIndex != -1">
							{{ formatBar }}
						</div>
					</VLabel>
				</VToolbarItems>
			</template>
		</AppBar>

		<VMain style="height: 100%">
			<SplitView panelbg-color="lightgray" @on-panel-resize="cropper?.Resize()">
				<template v-slot:sidebar>
					<Sidebar :selected-image-index="imgIndex" :selected-crop-index="selectedCropIndex" @on-bucket-update="onBucketUpdated"></Sidebar>
				</template>
				<template v-slot:content>
					<div class="content">
						<ImageList :images="AppProject.images.value" :status="AppProject.extra"
							v-model:selected-index="imgIndex" @on-change="onImgListChangeIndex" ref="imglist"></ImageList>

						<Cropper ref="cropper" @on-changed-crop-index="id => selectedCropIndex = id"
							:buckets="AppProject.buckets.value" @on-update="onCropperUpdated"></Cropper>
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