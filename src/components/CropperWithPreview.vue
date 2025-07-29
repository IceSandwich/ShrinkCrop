<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { applyImage, sharpenImage, type Bucket, type Image, type Rect, type Size } from './commons';
import { Cropper, type CropperResult } from 'vue-advanced-cropper'
const props = defineProps<{
	img: Image,
	buckets: Bucket[],
}>();
const emits = defineEmits<{
	OnCropperUpdate: [coordinate: Rect],
}>();
const cropper = useTemplateRef("cropper");

function getCropperDefaultPosition() {
	return {
		left: props.img.crop.x,
		top: props.img.crop.y,
	};
}
function getCropperDefaultSize() {
	return {
		width: props.img.crop.width,
		height: props.img.crop.height
	};
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
function SetRatio(ratio: Size | null) {
	currentRatio.value = ratio;
}

const showPreview = shallowRef<string | null>(null);
function ShowPreview(enable: boolean, force: boolean = false) {
	if (!force && ((showPreview.value == null && !enable) || (showPreview.value != null && enable))) {
		return; // nothing to do
	}

	if (enable) {
		const targetSize = props.img.bucket == -1 ? {
			width: props.img.crop.width,
			height: props.img.crop.height,
		} : props.buckets[props.img.bucket].size;
		
		console.log("===>", props.img.resizeQuality);
		const crop = applyImage(props.img.src, props.img.crop, targetSize, props.img.resizeQuality, "base64");
		if (crop == null) {
			alert("cannot get preview image.");
			return;
		}

		crop.then((dataUrl) => {
			if (props.img.sharpness > 0) {
				sharpenImage(dataUrl as string, props.img.sharpness).then((dataUrl2) => {
					console.log("sharpen: ", props.img.sharpness);
					showPreview.value = dataUrl2 as string;
				});
			} else {
				showPreview.value = dataUrl as string;
			}
		})
	} else {
		showPreview.value  = null;
	}
}
function IsPreviewMode() {
	return showPreview.value != null;
}

function onCropperChange(options: CropperResult) {
	emits("OnCropperUpdate", {
		x: options.coordinates.left,
		y: options.coordinates.top,
		width: options.coordinates.width,
		height: options.coordinates.height,
	})
}

/**
 * 确保在非Preview模式下访问
 */
function GetResult(): Rect {
	const cropRect = cropper.value!.getResult();
	return {
		x: cropRect?.coordinates.left,
		y: cropRect?.coordinates.top,
		width: cropRect?.coordinates.width,
		height: cropRect?.coordinates.height,
	};
}

function Refresh() {
	cropper.value?.refresh();
	ShowPreview(IsPreviewMode(), true);
}

defineExpose({
	SetRatio,
	ShowPreview,
	GetResult,
	Refresh,
	IsPreviewMode,
})
</script>

<template>
	<template v-if="showPreview">
		<img :src="showPreview" />
	</template>
	<template v-else>
		<Cropper class="cropper" :src="img.src"
			:stencil-props="cropperStencilProps" ref="cropper"
			@change="onCropperChange" :default-position="getCropperDefaultPosition"
			:default-size="getCropperDefaultSize" />
	</template>
</template>