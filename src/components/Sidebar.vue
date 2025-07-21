<script setup lang="ts">
const emits = defineEmits<{
	onAddImage: [files: File[]],
}>();

function onFileChanged(e: Event) {
	const files = (e.target as HTMLInputElement).files;
	emits("onAddImage", Array.from(files!));
}
</script>

<template>
	<div>
		<input type="file" style="display: none;" ref="input-field" @change="onFileChanged" multiple accept="image/*" />
		<button class="add-img" @click="$refs['input-field'].click()">添加图片</button>
	</div>
	<br />
	<div>
		<h2>桶</h2>
		<div class="list">
			<li class="select">Abc</li>
			<li>Def</li>
		</div>

	</div>
</template>

<style lang="css" scoped>
.add-img {
	width: 100%;
	height: 3rem;
	/* border: 2px solid #4166ddc5; */
	background-color: #a1a4c4a6;
}

.list {
	width: 100%;
	background-color: #fff;
	color: black;
	height: 15rem;
	overflow: auto;
}

.list li {
	user-select: none;
	padding: 2px 4px;
}

.list li.select {
	background-color: rgb(136, 128, 165);
}
</style>