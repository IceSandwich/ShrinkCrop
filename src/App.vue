<script setup lang="ts">

import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { onMounted, ref, useTemplateRef } from 'vue'

interface BBox {
	x: number,
	y: number,
	width: number,
	height: number
}

interface ImageFile {
	Src: string
	Box: BBox
	UseFixedBox: boolean
	FixedRatio: [number, number]
	Size: [number, number]
	ImgElement: HTMLImageElement
}

let images = ref<ImageFile[]>([]);
let selected = ref(-1);
let cropper = useTemplateRef<VueCropper>("cropper");

declare class fxTexture {
	public destroy(): void;
}
declare class fxCanvas {
	public texture(img: HTMLImageElement): fxTexture;
	public unsharpMask(radius: number, strength: number): fxCanvas;
	public draw(tex: fxTexture): fxCanvas;
	public update(): fxCanvas;
}
declare class fx {
	public static canvas(): fxCanvas
}

let glfx = ref<null | fxCanvas>(null);

onMounted(() => {
	try {
		glfx.value = fx.canvas();
	} catch (e) {
		console.error(e);
	}
})

function handleFileUpload(event: any) {
	if (!event.target) return;

	const files = event.target.files;

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
			if (!e ||!e.target) return;
			const img = new Image();
			img.src = e.target.result as string;
			img.onload = function() {
				let ins: ImageFile = {
					Src: img.src,
					Box: {
						x: 0,
						y: 0,
						width: 0,
						height: 0
					},
					UseFixedBox: false,
					FixedRatio: [1, 1],
					Size: [img.width, img.height],
					ImgElement: img
				};
				images.value.push(ins);
			}
        };
        reader.readAsDataURL(file);
    }
}

function openCropper(index: number){
	if (selected.value != -1) {
		images.value[selected.value].Box = getCropBox();
	}
	selected.value = index;
	console.log(selected.value);
}

function changeScale(scale: number) {
	scale = scale || 1;
	cropper.value?.changeScale(scale);
}

function getCropBox(): BBox {
	const cropAxis = cropper.value.getCropAxis();
	const imgAxis = cropper.value.getImgAxis();
	const imgWidth = imgAxis.x2-imgAxis.x1;
	const imgHeight = imgAxis.y2-imgAxis.y1;
	const cropX = cropAxis.x1 - imgAxis.x1;
	const cropY = cropAxis.y1 - imgAxis.y1;
	const cropWidth = cropAxis.x2 - cropAxis.x1;
	const cropHeight  = cropAxis.y2-cropAxis.y1;
	const cropX_normalize = cropX / imgWidth;
	const cropY_normalize = cropY / imgHeight;
	const cropWidth_normalize = cropWidth / imgWidth;
	const cropHeight_normalize = cropHeight / imgHeight;
	return {
		x: cropX_normalize,
		y: cropY_normalize,
		width: cropWidth_normalize,
		height: cropHeight_normalize,
	};
}

function changeFixRatio(e: Event) {
	images.value[selected.value].FixedRatio[0] = (e as any).target.value;
}

function cropAndResizeImage(img: ImageFile, cropAxis: BBox, targetSize: [number, number]) {
	const canvas = document.createElement('canvas');
	let imgCanvas = canvas.getContext("2d");
	if (!imgCanvas) {
		alert('Please load an image first');
		return;
	}
	canvas.width = targetSize[0];
	canvas.height = targetSize[1];
	imgCanvas.imageSmoothingEnabled = true;
	imgCanvas.imageSmoothingQuality = 'high';
	imgCanvas.drawImage(img.ImgElement, cropAxis.x, cropAxis.y, cropAxis.width, cropAxis.height, 0, 0, targetSize[0], targetSize[1]);

	const croppedImg = new Image();
	croppedImg.src = canvas.toDataURL('image/png');
	return croppedImg;
}

function unsharpMask(img: ImageFile) {
	if (!glfx.value) {
		alert('Please load an image first');
		return;
	}

	let texture = glfx.value.texture(img.ImgElement);
	glfx.value.draw(texture).unsharpMask(20, 20).update();
}

let options = {
	canScale: false,
	info: false,
	autoCrop: true,
	centerBox: true,
}

</script>

<template>
	<div>
		<!-- 图片上传 -->
		<input type="file" id="fileInput" accept="image/*" multiple v-on:change="handleFileUpload($event)">
	</div>

	<!-- 图片列表展示 -->
	<div class="image-preview-list">
		<div v-for="(image, index) in images" :key="index" class="image-preview-item" :class="{ selected: index === selected }" >
			<img :src="image.Src" alt="Preview" @click="openCropper(index)"  />
		</div>
	</div>

	<div class="container" v-if="selected > -1">
        <div class="scope-btn">
          <i class="far fa-search-plus" :style="{ fontSize: '32px' }" @click="changeScale(1)"/>
          <i class="far fa-search-minus" :style="{ fontSize: '32px', marginRight: '20px' }" @click="changeScale(-1)"/>
          <button class="btn" @click="console.log(getCropBox())">show</button>
          <button class="btn" @click="images[selected].UseFixedBox=true">Keep ratio</button>
		  <input type="number" :value="images[selected].FixedRatio[0]" @change="changeFixRatio($event)" /> :
        </div>
		<vueCropper
			ref="cropper"
			:img="images[selected].Src"
			:autoCrop="options.autoCrop"
			:canScale="options.canScale"
			:info="options.info"
			:centerBox="options.centerBox"
			:fixed="images[selected].UseFixedBox"
			:fixedNumber="images[selected].FixedRatio"
		></vueCropper>

	</div>

	<canvas ref="canvas"></canvas>
</template>

<style lang="css" scoped>
.container {
	width: 600px;
	height: 400px;
	background-color: #a22;
}
.image-preview-list {
  display: flex;
  margin-top: 20px;
  overflow: scroll;
}

.image-preview-item {
  padding: 10px;
  display: flex;
}

.image-preview-item:hover {
	background-color: dodgerblue;
}

.image-preview-list .selected {
	background-color: brown;
}

.image-preview-item img {
  max-width: 150px;
  cursor: pointer;
}

</style>