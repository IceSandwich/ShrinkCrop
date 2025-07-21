<script setup lang="ts">
import { ref, type Ref } from 'vue';
import ImageList from './components/ImageList.vue';
import SplitView from './components/SplitView.vue';
import Sidebar from './components/Sidebar.vue';

interface Image {
	src: string;
	title: string;
	width: number;
	height: number;
}

let images = ref<Image[]>([]);

function onImageChange(index: number) {
	console.log('图片改变', images.value[index]);
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
</script>

<template>
	<SplitView>
		<template v-slot:sidebar>
			<Sidebar @onAddImage="onAddImage" />
		</template>
		<template v-slot:content>
			<SplitView vertical disableHandler>
				<template v-slot:sidebar>
					<ImageList :items="images" @change="onImageChange" />
				</template>
				<template v-slot:content>
					<h2>内容</h2>
					<p>这里是右边的内容。</p>

				</template>
			</SplitView>
		</template>
	</SplitView>

</template>

<style lang="css" scoped>
</style>
