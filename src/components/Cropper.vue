<script lang="ts" setup>
import type { Bucket, ImageItem } from '@/utils/Types';
import { onMounted, onUnmounted, useTemplateRef, type Ref } from 'vue';
import type { Rect } from './commons';
import { CalcHeightWithRatio, CalcRatio, CalcWidthWidthRatio, Clamp } from '@/utils/Functions';
const props = defineProps<{
	buckets: Map<string, Bucket>,
}>();
const emits = defineEmits<{
	OnChangedCropIndex: [id: number],
	OnUpdate: [id: number, rect: Rect],
}>();

const viewport = useTemplateRef("viewport");
const canvas = useTemplateRef("canvas");
let ctx: CanvasRenderingContext2D | null = null;
let imgItem: ImageItem | null = null;
let imgInstance: HTMLImageElement = new Image();
// (p.x + p.w * handle.x, p.y + p.h * handle.y)
const handles = [
	{x: 0.0, y: 0.0, cursor: 'nw-resize'},
	{x: 0.5, y: 0.0, cursor: 'n-resize'},
	{x: 1.0, y: 0.0, cursor: 'ne-resize'},
	{x: 0.0, y: 0.5, cursor: 'w-resize'},
	{x: 0.0, y: 0.0, cursor: ''}, // 凑数
	{x: 1.0, y: 0.5, cursor: 'e-resize'},
	{x: 0.0, y: 1.0, cursor: 'sw-resize'},
	{x: 0.5, y: 1.0, cursor: 's-resize'},
	{x: 1.0, y: 1.0, cursor: 'se-resize'},
];
const handleRadius = 9;
enum State {
	Idle,
	PanView,
	ResizeRect,
	MoveRect,
	MoveHandle,
}
interface Point2d {
	x: number;
	y: number;
}
interface Drag {
	px: number;
	py: number;
	rect: Rect;
	index: number;
}
let currentState: State = State.Idle;
let currentActiveCrop: number = -1;
let drag: Drag = { 
	px: 0, 
	py: 0, 
	rect: {
		x: 0, 
		y: 0, 
		width: 0, 
		height: 0
	}, 
	index: 0,
}
let view = {
	scale: 1,
	offsetX: 0,
	offsetY: 0,
};

function imageToScreen(x: number, y: number): Point2d {
	return {
		x: x * view.scale + view.offsetX,
		y: y * view.scale + view.offsetY,
	};
}
function screenToImage(x: number, y: number): Point2d {
	return {
		x: (x - view.offsetX) / view.scale,
		y: (y - view.offsetY) / view.scale,
	};
}
function pointInWhichHandles(p: Point2d, c: Rect): number {
	for (var i = 0; i < handles.length; i++) {
		if (handles[i].cursor === "") continue;
		const handlePos = { x: c.x + c.width * handles[i].x, y: c.y + c.height * handles[i].y };
		const realHandleRadius = handleRadius / view.scale;
		const handleBox = { x: handlePos.x - realHandleRadius, y: handlePos.y - realHandleRadius, w: realHandleRadius * 2, h: realHandleRadius * 2};
		if (p.x >= handleBox.x && p.x <= handleBox.x + handleBox.w && p.y >= handleBox.y && p.y <= handleBox.y + handleBox.h) {
			return i;
		}
	}
	return -1;
}
function pointInRect(p: Point2d, r: Rect): boolean {
	return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}



function Redraw() {
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);

	if (!imgInstance) return;
	if (!imgItem) return;

	ctx.save();
	ctx.translate(view.offsetX, view.offsetY);
	ctx.scale(view.scale, view.scale);

	// // 设置阴影属性
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; // 阴影颜色
	ctx.shadowOffsetX = 5; // 水平偏移
	ctx.shadowOffsetY = 5; // 垂直偏移
	ctx.shadowBlur = 10; // 模糊程度
	ctx.drawImage(imgInstance, 0, 0);

	// 重置阴影属性
	ctx.shadowColor = 'transparent';
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = 'rgba(0,0,0, 0.6)';
	ctx.fillRect(0, 0, canvas.value!.width, canvas.value!.height);
	ctx.restore();

	for (var i = 0; i < imgItem!.crops.length; i++) {
		const r = imgItem!.crops[i];
		ctx.strokeStyle = i === currentActiveCrop ? 'red' : 'lime';
		ctx.lineWidth = 2 / view.scale;
		ctx.strokeRect(r.x, r.y, r.width, r.height);

		ctx.drawImage(imgInstance, r.x, r.y, r.width, r.height, r.x, r.y, r.width, r.height);

		if (i === currentActiveCrop) {
			for (var j = 0; j < handles.length; j++) {
				if (r.bucket !== "" && j % 2 === 1) continue; // 上、左、右、下的控制柄
				const handlePos = { x: r.x + r.width * handles[j].x, y: r.y + r.height * handles[j].y };
				const realHandleRadius = handleRadius / view.scale;
				const handleBox = { x: handlePos.x - realHandleRadius, y: handlePos.y - realHandleRadius, w: realHandleRadius * 2, h: realHandleRadius * 2};

				ctx.fillStyle = "white";
				ctx.fillRect(handleBox.x, handleBox.y, handleBox.w, handleBox.h);

				ctx.strokeStyle = "black";
				ctx.strokeRect(handleBox.x, handleBox.y, handleBox.w, handleBox.h);
			}
		}
	}
	ctx.restore();
}

function OnResize() {
	canvas.value!.width = viewport.value!.clientWidth;
	canvas.value!.height = viewport.value!.clientHeight;
	Redraw();
	console.log("resize", viewport.value?.clientWidth, viewport.value?.clientHeight);
}

function onWheel(e: WheelEvent) {
	e.preventDefault();
	const mouse = screenToImage(e.offsetX, e.offsetY);
	const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;

	view.scale *= scaleFactor;
	view.offsetX = e.offsetX - mouse.x * view.scale;
	view.offsetY = e.offsetY - mouse.y * view.scale;
	Redraw();

	// TODO: 支持触控板PanView
}

function onMouseDown(e: MouseEvent) {
	if (!imgItem) return;
	const p = screenToImage(e.offsetX, e.offsetY);

	switch (e.button) {
		case 1: // 中键
		case 2: // 右键
			currentState = State.PanView;
			drag.px = e.offsetX;
			drag.py = e.offsetY;
			drag.rect.x = view.offsetX;
			drag.rect.y = view.offsetY;
		break;
		case 0: // 左键
			if (currentActiveCrop !== -1) {
				const rect = imgItem.crops[currentActiveCrop];
				let pindex = pointInWhichHandles(p, rect);
				if (rect.bucket !== "" && pindex % 2 === 1) pindex = -1; // 去掉部分控制柄
				if (pindex >= 0) {
					currentState = State.MoveHandle;
					drag.px = p.x;
					drag.py = p.y;
					drag.index = pindex;
					drag.rect = {...rect};
					break;
				}
			}

			currentActiveCrop = imgItem.crops.findIndex(r => pointInRect(p, r));
			if (currentActiveCrop >= 0) {
				currentState = State.MoveRect;
				drag.px = p.x;
				drag.py = p.y;
				drag.rect = {...imgItem.crops[currentActiveCrop]};
			}
			emits("OnChangedCropIndex", currentActiveCrop);
			Redraw();
		break;
	}

	// TODO: disable context menu when right click
}

function onMouseMove(e: MouseEvent) {
	const p = screenToImage(e.offsetX, e.offsetY);

	switch (currentState) {
		case State.Idle:
			if (currentActiveCrop !== -1) {
				const rect = imgItem!.crops[currentActiveCrop];
				let cursor = "default";
				let pindex = pointInWhichHandles(p, rect);
				if (rect.bucket !== "" && pindex % 2 === 1) pindex = -1; // 去掉部分控制柄
				if (pindex >= 0) {
					cursor = handles[pindex].cursor;
				} else if (pointInRect(p, rect)) {
					cursor = "move";
				}
				canvas.value!.style.cursor = cursor;
			}
			break;
		case State.PanView:
			view.offsetX = drag.rect.x + (e.offsetX - drag.px);
			view.offsetY = drag.rect.y + (e.offsetY - drag.py);
			Redraw();
			break;
		case State.MoveRect: {
			const r = imgItem!.crops[currentActiveCrop];
			r.x = Math.max(0, Math.min(imgItem!.width -  r.width, drag.rect.x + (p.x - drag.px)));
			r.y = Math.max(0, Math.min(imgItem!.height - r.height, drag.rect.y + (p.y - drag.py)));
			r.x = Math.round(r.x);
			r.y = Math.round(r.y);
			emits("OnUpdate", currentActiveCrop, r);
			Redraw();
		}
			break;
		case State.MoveHandle: {
			const r = imgItem!.crops[currentActiveCrop];
			const dx = p.x - drag.px;
			const dy = p.y - drag.py;

			const p1: Point2d = { x: r.x, y: r.y };
			const p2: Point2d = { x: r.x + r.width, y: r.y + r.height };

			// Layer 1: Arbitary move
			if (drag.index <= 2) {
				p1.y = drag.rect.y + dy;
			} else if (drag.index >= 6) {
				p2.y = drag.rect.y + drag.rect.height + dy;
			}

			if (drag.index % 3 == 0) {
				p1.x = drag.rect.x + dx;
			} else if (drag.index % 3 == 2) {
				p2.x = drag.rect.x + drag.rect.width + dx;
			}

			// Layer 2: Round
			p1.x = Math.round(p1.x);
			p1.y = Math.round(p1.y);
			p2.x = Math.round(p2.x);
			p2.y = Math.round(p2.y);

			// Layer 3: Fix overflow
			p1.x = Clamp(p1.x, 0, imgItem!.width);
			p1.y = Clamp(p1.y, 0, imgItem!.height);
			p2.x = Clamp(p2.x, 0, imgItem!.width);
			p2.y = Clamp(p2.y, 0, imgItem!.height);

			// Layer 4: Keep ratio
			if (r.bucket !== "") {
				const bucket = props.buckets.get(r.bucket);
				if (bucket) {
					const newWidth = Math.abs(p2.x - p1.x);
					const newHeight = Math.abs(p2.y - p1.y);
					const newRatio = CalcRatio(newWidth, newHeight);
					if (newRatio >= bucket.ratio) {
						// 高度主导
						const nWidth = CalcWidthWidthRatio(newHeight, bucket.ratio);
						switch (drag.index) {
							case 0:
								p1.y = Clamp(p2.y - newHeight, 0, imgItem!.height);
								p1.x = Clamp(p2.x - nWidth, 0, imgItem!.width);
								break;
							case 2:
								p1.y = Clamp(p2.y - newHeight, 0, imgItem!.height);
								p2.x = Clamp(nWidth + p1.x, 0, imgItem!.width);
								break;
							case 6:
								p1.x = Clamp(p2.x - nWidth, 0, imgItem!.width);
								p2.y = Clamp(p1.y + newHeight, 0, imgItem!.height);
							case 8:
								p2.x = Clamp(nWidth + p1.x, 0, imgItem!.width);
								p2.y = Clamp(p1.y + newHeight, 0, imgItem!.height);
								break;	
						}
					} else {
						// 宽度主导
						const nHeight = CalcHeightWithRatio(newWidth, bucket.ratio);
						switch (drag.index) {
							case 0:
								p1.y = Clamp(p2.y - nHeight, 0, imgItem!.height);
								p1.x = Clamp(p2.x - newWidth, 0, imgItem!.width);
								break;
							case 2:
								p1.y = Clamp(p2.y - nHeight, 0, imgItem!.height);
								p2.x = Clamp(p1.x + newWidth, 0, imgItem!.width);
								break;
							case 6:
								p1.x = Clamp(p2.x - newWidth, 0, imgItem!.width);
								p2.y = Clamp(nHeight + p1.y, 0, imgItem!.height);
								break;
							case 8:
								p2.x = Clamp(p1.x + newWidth, 0, imgItem!.width);
								p2.y = Clamp(nHeight + p1.y, 0, imgItem!.height);
								break;
							
						}
					}
				}
			}

			// Layer 5: Convert to r
			r.x = Math.min(p1.x, p2.x);
			r.y = Math.min(p1.y, p2.y);
			r.width = Math.abs(p2.x - p1.x);
			r.height = Math.abs(p2.y - p1.y);

			emits("OnUpdate", currentActiveCrop, r);
			Redraw();
		}
			break;
	}
}

function onMouseUp(e: MouseEvent) {
	currentState = State.Idle;
}

function onMouseLeave() {
	currentState = State.Idle;
}

onMounted(() => {
	window.addEventListener("resize", OnResize);
	if (canvas.value) {
		canvas.value!.addEventListener("wheel", onWheel);
		canvas.value!.addEventListener("mousedown", onMouseDown);
		canvas.value!.addEventListener("mousemove", onMouseMove);
		canvas.value!.addEventListener("mouseup", onMouseUp);
		canvas.value!.addEventListener("mouseleave", onMouseLeave);

		ctx = canvas.value!.getContext("2d");
	}
});
onUnmounted(() => {
	window.removeEventListener("resize", OnResize);
	if (canvas.value) {
		canvas.value!.removeEventListener("wheel", onWheel);
		canvas.value!.removeEventListener("mousedown", onMouseDown);
		canvas.value!.removeEventListener("mousemove", onMouseMove);
		canvas.value!.removeEventListener("mouseup", onMouseUp);
		canvas.value!.removeEventListener("mouseleave", onMouseLeave);

		ctx = null;
	}
})

function SetImage(img: ImageItem, cropId: number = -1) {
	imgItem = img;
	currentActiveCrop = cropId;
	currentState = State.Idle;
	canvas.value!.style.cursor = "default";

	imgInstance.onload = () => {
		view.scale = Math.min(
			canvas!.value!.width / img.width * 0.8,
			canvas!.value!.height / img.height * 0.8,
		);
		view.offsetX = (canvas!.value!.width - img.width * view.scale) / 2;
		view.offsetY = (canvas!.value!.height - img.height * view.scale) / 2;
		Redraw();
	}
	imgInstance.src = imgItem.imgurl;
}

defineExpose({
	SetImage,
	OnResize,
	Redraw,
})
</script>


<template>
	<div class="viewport" ref="viewport">
		<canvas ref="canvas"></canvas>
	</div>
</template>

<style lang="css" scoped>
.viewport {
	position: relative;

	width: 100%;
	height: 100%;
	flex: 1;

	overflow: hidden;
	/* display: flex;
	justify-content: center;
	align-items: center; */
	background: #c7c7c7;
	cursor: default;
}
canvas {
	position:absolute;
	left: 0;
	top: 0;
}
</style>