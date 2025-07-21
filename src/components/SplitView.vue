<script setup lang="ts">
import { computed, ref } from 'vue';
const props = defineProps({
	disableHandler: Boolean,
	vertical: Boolean
})

const getFlexDirection = computed(() => {
	return props.vertical ? 'column' : 'row';
})

let dragStart = 0;
let oldSidebarWidth = 0;
let sidebarWidth = ref(200);
function onResizerMouseDown(e: MouseEvent) {
	dragStart = e.clientX;
	oldSidebarWidth = sidebarWidth.value;

	document.addEventListener("mousemove", onResizerMouseMove);
	document.addEventListener("mouseup", onResizerMouseUp);
}

function onResizerMouseMove(e: MouseEvent) {
	const delta = e.clientX - dragStart;
	sidebarWidth.value = Math.min(Math.max(oldSidebarWidth + delta, 150), 800);
}

function onResizerMouseUp(e: MouseEvent) {
	document.removeEventListener("mousemove", onResizerMouseMove);
	document.removeEventListener("mouseup", onResizerMouseUp);
}

</script>

<template>
	<div class="container-fluid" :style="{ flexDirection: getFlexDirection }">
		<div class="resizable-sidebar" id="sidebar"
			:style="vertical ? { width: '100%' } : { width: sidebarWidth + 'px', height: '100%' }">
			<slot name="sidebar"></slot>
		</div>

		<div class="resizer" :class="vertical ? 'resizer-vertical' : 'resizer-horizontal'" id="resizer"
			@mousedown="onResizerMouseDown" v-if="!disableHandler"></div>

		<div class="content">
			<slot name="content"></slot>
		</div>
	</div>
</template>

<style lang="css" scoped>
.container-fluid {
	display: flex;
	width: 100%;
	height: 100%;
}

.resizable-sidebar {
	/* width: 250px; */
	/* min-width: 150px;
	max-width: 500px; */
	/* background-color: #f8f9fa; */
	padding: 15px;
	overflow: auto;
}

.resizer-horizontal {
	width: 5px;
	cursor: ew-resize;
}

.resizer-vertical {
	height: 5px;
	cursor: ns-resize;
}

.resizer {
	background-color: #ddd;
	position: relative;
	user-select: none;
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	/* background-color: #ffffff; */
	overflow: hidden;
	padding: 18px;
}
</style>