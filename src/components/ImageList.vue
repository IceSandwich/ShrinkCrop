<script setup lang="ts">
import { ImageItemBucketStatus, type ImageItem, type ImageItemExtra } from '@/utils/Project';
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';

const props = defineProps<{
	images: ImageItem[],
	status: ImageItemExtra[],
}>();

const emits = defineEmits<{
	OnChange: [id: number],
}>();
const imageList = useTemplateRef("imageList");

// let curid = ref(-1);
const curid = defineModel<number>("selectedIndex", {required: true});
function onClick(e: MouseEvent) {
	e.preventDefault();
	e.stopPropagation();

	let node = (e.target as HTMLElement).parentElement!;
	let idstr = node.getAttribute("data-id");
	if (!idstr) return;
	let id = parseInt(idstr);

	if (id!== curid.value) {
		curid.value = id;
		emits('OnChange', id);
	}
}

function clamp(v: number, min: number = -Infinity, max: number = Infinity) {
	return Math.max(Math.min(v, max), min);
}

function onArrowKey(e: KeyboardEvent) {
	if (curid.value === -1) return;
	if (e.key !== 'ArrowLeft' && e.key!== 'ArrowRight') return;

	e.stopPropagation();
	e.preventDefault();

	let newid = -1;
	if (e.key === 'ArrowLeft') {
		newid = clamp(curid.value - 1, 0, props.images.length - 1);
	} else if (e.key === 'ArrowRight') {
		newid = clamp(curid.value + 1, 0, props.images.length - 1);
	}
	if (newid!== curid.value) {
		curid.value  = newid;
		emits('OnChange', curid.value);
	}
}

function onWheel(e: WheelEvent) {
	if (e.deltaY === 0) return;
    e.preventDefault();
    imageList.value!.scrollLeft += e.deltaY;
}

onMounted(() => {
	document.addEventListener("keydown", onArrowKey);
	imageList.value?.addEventListener("wheel", onWheel, { passive: false });
})

onUnmounted(() => {
	document.removeEventListener("keydown", onArrowKey);
	imageList.value?.removeEventListener("wheel", onWheel);
});
</script>

<template>
	<div class="image-list-bar" ref="imageList">
		<div class="image-item" :data-id="index" 
			v-for="item, index in images"
			 @click="onClick" 
			ref="imageItems" 
			:class="{ selected: index === curid }"
		>
			<img :src="item.imgurl">
			<div>{{ item.srcfilename }}</div>
			<VIcon class="badge elevation-5" 
				v-if="status[index].bucket_status.value != ImageItemBucketStatus.NO_BUCKET" 
				:icon="status[index].bucket_status.value == ImageItemBucketStatus.BUCKET_UPSACLE ? 'mdi-pail-plus' : 'mdi-pail'" 
				:class="status[index].bucket_status.value == ImageItemBucketStatus.BUCKET_UPSACLE ? 'pail-plus-badge' : 'pail-badge'"
			></VIcon>
		</div>
	</div>
</template>

<style lang="css" scoped>
.image-list-bar {
	width: 100%;
	flex: 0 0 auto;
	overflow-x: auto;
	white-space: nowrap;
	/* border-bottom: 1px solid #ccc; */
	padding: 10px;
	/* background-color: #f1f1f1; */
}


.image-item {
	position: relative;
	display: inline-block;
	text-align: center;
	margin-right: 10px;
	cursor: pointer;
	border: 2px solid transparent;
	border-radius: 5px;
	padding: 5px;
	transition: border-color 0.2s;
}

.image-item img {
	max-height: 80px;
	height: auto;
	max-width: 120px;
	object-fit: contain;
	display: block;
	margin: 0 auto;
}

.image-item.selected {
	border-color: #007bffb0;
	background-color: #e6f0ff5e;
}

.badge {
	position: absolute;
	border-radius: 50%;
	padding: 18px;
	color: white;
	top: -6px;
	right: -8px;
}

.pail-badge {
	background-color: #007bffb0;
}

.pail-plus-badge {
	background-color: #ff1e00b0;
}
</style>
