<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';

interface ImageItem {
	src: string;
	title: string;
}
const props = defineProps<{
	items: ImageItem[]
}>()
const emits = defineEmits<{
	change: [id: number],
}>();
const imageItems = useTemplateRef("imageItems");

let curid = ref(-1);
function onClick(e: MouseEvent) {
	e.preventDefault();
	e.stopPropagation();

	let node = (e.target as HTMLElement).parentElement!;
	let idstr = node.getAttribute("data-id");
	if (!idstr) return;
	let id = parseInt(idstr);

	if (id!== curid.value) {
		curid.value = id;
		emits('change', id);
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
		newid = clamp(curid.value - 1, 0, props.items.length - 1);
	} else if (e.key === 'ArrowRight') {
		newid = clamp(curid.value + 1, 0, props.items.length - 1);
	}
	if (newid!== curid.value) {
		curid.value  = newid;
		emits('change', curid.value);
	}
}

function SetID(id: number) {
	curid.value = id;
	console.log("===>", curid.value);
}

onMounted(() => {
	document.addEventListener("keydown", onArrowKey);
})

onUnmounted(() => {
	document.removeEventListener("keydown", onArrowKey);
});

defineExpose({
	SetID,
})
</script>

<template>
	<div class="image-list-bar" id="imageList">
		<div class="image-item" :data-id="index" v-for="item, index in items" @click="onClick" ref="imageItems" :class="{ selected: index === curid }">
			<img :src="item.src">
			<div>{{ item.title }}</div>
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
</style>
