<script setup lang="ts">
import { useTemplateRef } from 'vue';

interface ImageItem {
	src: string;
	title: string;
}
defineProps<{
	items: ImageItem[]
}>()
const emits = defineEmits<{
	change: [id: number],
}>();
const imageItems = useTemplateRef("imageItems");

let oldid = -1;
function onClick(e: MouseEvent) {
	e.preventDefault();

	let node = (e.target as HTMLElement).parentElement!;
	let idstr = node.getAttribute("data-id");
	if (!idstr) return;
	let id = parseInt(idstr);

	imageItems.value?.forEach((i, idx) => {
		if (idx === id) {
			i.classList.add('selected');
		} else {
			i.classList.remove('selected');
		}
	});

	if (id!== oldid) {
		oldid = id;
		emits('change', id);
	}
}
</script>

<template>
	<div class="image-list-bar" id="imageList">
		<div class="image-item" :data-id="index" v-for="item, index in items" @click="onClick" ref="imageItems">
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