<script setup lang="ts">
import { computed, ref, type StyleValue } from 'vue';
const props = defineProps({
	disableHandler: Boolean,
	vertical: Boolean,
	panelbgColor: String,
})
const emits = defineEmits<{
	onPanelResize: [],
}>();

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
	emits('onPanelResize');
}

function onResizerMouseUp(e: MouseEvent) {
	document.removeEventListener("mousemove", onResizerMouseMove);
	document.removeEventListener("mouseup", onResizerMouseUp);
}

</script>

<template>
	<div class="container-fluid" :style="{ flexDirection: getFlexDirection }">
		<div :style="!vertical ? { overflowY: 'unset', height: '100%' } : {}">
			<div class="resizable-sidebar" id="sidebar"
				:style="vertical ? { width: '100%', 'background-color': props.panelbgColor } : { width: sidebarWidth + 'px', height: '100%', 'background-color': props.panelbgColor,  }">
				<slot name="sidebar"></slot>
			</div>
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
	/* background-color: #ddd; */
	background-color: rgba(255, 255, 255, 0.12);
	position: relative;
	user-select: none;
}

.resizer:hover {
	background-color: rgba(122, 155, 247, 0.808);
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