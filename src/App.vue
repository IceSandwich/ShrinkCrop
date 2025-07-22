<script setup lang="ts">
import { onUpdated, ref, useTemplateRef, type Ref } from 'vue';
import ImageList from './components/ImageList.vue';
import SplitView from './components/SplitView.vue';
import Sidebar from './components/Sidebar.vue';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

interface Image {
	src: string;
	title: string;
	width: number;
	height: number;
}

let images = ref<Image[]>([]);
let selectedIndex = ref(-1);
function onImageChange(index: number) {
	console.log('图片改变', images.value[index]);
	selectedIndex.value = index;
}

function onAddImage(files: File[]) {
	files.forEach((file) => {
		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = function () {
				const append = {
					src: reader.result as string,
					title: file.name,
					width: img.naturalWidth,
					height: img.naturalHeight
				};
				images.value = [...images.value, append];
			}
			img.src = reader.result as string;
		};
		reader.readAsDataURL(file);
	});
}

const mainCropper = useTemplateRef("mainCropper");
function onCropperChange() {

}

function onPanelResize() {
	mainCropper.value?.refresh();
}

</script>

<template>
	<SplitView @on-panel-resize="onPanelResize">
		<template v-slot:sidebar>
			<Sidebar @onAddImage="onAddImage" />
		</template>
		<template v-slot:content>
			<SplitView vertical disableHandler>
				<template v-slot:sidebar>
					<ImageList :items="images" @change="onImageChange" />
				</template>
				<template v-slot:content v-if="selectedIndex !== -1">
					<cropper class="cropper" :src="images[selectedIndex].src" :stencil-props="{
						// aspectRatio: 1
					}" @change="onCropperChange" ref="mainCropper" />
				</template>
			</SplitView>
		</template>
	</SplitView>

</template>

<style lang="css" scoped>
.cropper {
	margin: auto;
}
</style>
