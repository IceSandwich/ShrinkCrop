<script setup lang="ts">
import BucketDialog from './BucketDialog.vue';
import ModifyBucketDialog from './ModifyBucketDialog.vue';
import { CalcRatio, MaxRectWithRatio } from '@/utils/Functions';
import type { Bucket, CropRect } from '@/utils/Types';
import { useTemplateRef } from 'vue';
const props = defineProps<{
	crop: CropRect,
	buckets: Map<string, Bucket>,
}>();
const emits = defineEmits<{
	OnBucketUpdate: [key: string],
}>();

/*
const addConfigTargetWidth = shallowRef(0);
const addConfigTargetHeight = shallowRef(0);
const addConfigKeepRatioCheckbox = shallowRef(true);
const addConfigRatio = shallowRef(0);
const bucketDialog = shallowRef(false);

function onAddBucketClicked() {
	console.log(props.crop);
	addConfigTargetWidth.value = props.crop.width;
	addConfigTargetHeight.value = props.crop.height;
	onKeepRatioCheckboxChanged(true);
	addConfigKeepRatioCheckbox.value = true;
	bucketDialog.value = true;
}

function onKeepRatioCheckboxChanged(value: boolean | null) {
	if (value) {
		addConfigRatio.value = CalcRatio(addConfigTargetWidth.value, addConfigTargetHeight.value);
	}
}

function onAddConfigTargetWidthChanged(val: boolean) {
	if (addConfigKeepRatioCheckbox.value == true) {
		addConfigTargetHeight.value = CalcHeightWithRatio(addConfigTargetWidth.value, addConfigRatio.value);
	}
}


function onAddConfigTargetHeightChanged(val: boolean) {
	if (addConfigKeepRatioCheckbox.value == true) {
		addConfigTargetWidth.value = CalcWidthWidthRatio(addConfigTargetHeight.value, addConfigRatio.value);
	}
}

function onAddConfigApplyClicked() {
	const bucketID = window.crypto.randomUUID().toString();
	const ratio = CalcRatio(addConfigTargetWidth.value, addConfigTargetHeight.value);
	props.buckets.set(bucketID, {
		width: addConfigTargetWidth.value,
		height: addConfigTargetHeight.value,
		ratio: ratio,
	});
	props.crop.bucket = bucketID;
	const newSize = MaxRectWithRatio(props.crop.width, props.crop.height, ratio);
	props.crop.width = newSize.width;
	props.crop.height = newSize.height;
	emits("OnBucketUpdate", bucketID);

	bucketDialog.value = false;
}*/

const addBucketDialog = useTemplateRef("addBucketDialog");
function onAddBucketClicked() {
	addBucketDialog.value?.OpenDialog(props.crop.width, props.crop.height);
}

function onAddBucketApply(width: number, height: number) {
	const bucketID = window.crypto.randomUUID().toString();
	const ratio = CalcRatio(width, height);
	props.buckets.set(bucketID, {
		width: width,
		height: height,
		ratio: ratio,
	});
	props.crop.bucket = bucketID;
	const newSize = MaxRectWithRatio(props.crop.width, props.crop.height, ratio);
	props.crop.width = newSize.width;
	props.crop.height = newSize.height;
	emits("OnBucketUpdate", bucketID);
}

const modifyBucketDialog = useTemplateRef("modifyBucketDialog");
function onModifyBucketClicked() {
	const bucket = props.buckets.get(props.crop.bucket);
	if (bucket) {
		modifyBucketDialog.value?.OpenDialog(bucket.width, bucket.height);
	}
}
function onModifyBucketApply(width: number, height: number) {
	const bucket = props.buckets.get(props.crop.bucket);
	if (bucket) {
		bucket.width = width;
		bucket.height = height;
		bucket.ratio = CalcRatio(width, height);
		emits("OnBucketUpdate", props.crop.bucket);
		// TODO: update all image rects in correct ratio with this bucket
	}
}

function onSetSameSizeClicked() {
	const bucket = props.buckets.get(props.crop.bucket);
	if (bucket) {
		props.crop.width = bucket.width;
		props.crop.height = bucket.height;

		// TODO: maybe out side of image
		emits("OnBucketUpdate", props.crop.bucket);
	}
}

function onRadioChanged(v: string | null) {
	if (v != null) {
		if (v !== "") {
			const newSize = MaxRectWithRatio(props.crop.width, props.crop.height, props.buckets.get(v)!.ratio);
			props.crop.width = newSize.width;
			props.crop.height = newSize.height;
		}
		emits("OnBucketUpdate", v);
	}
}

function formatBucket(bucket: Bucket) {
	return `${bucket.width} x ${bucket.height}, ${bucket.ratio.toFixed(2)}`;
}
</script>

<template>
	<VExpansionPanel>
		<VExpansionPanelTitle>
			<VIcon icon="mdi-pail"></VIcon>&nbsp;&nbsp;桶
		</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				<VRadioGroup v-model="crop.bucket" @update:model-value="onRadioChanged">
					<VRadio v-for="(item, i) in buckets" :value="item[0]">
						<template v-slot:label>
							{{  formatBucket(item[1]) }}
						</template>
					</VRadio>
					<VRadio value="">
						<template v-slot:label>
							不使用
						</template>
					</VRadio>
				</VRadioGroup>
			</VRow>
			<VRow>
				<VBtn color="indigo-darken-3" size="large" prepend-icon="mdi-bookmark-plus-outline" class="w-100" @click="onAddBucketClicked">添加</VBtn>
				<BucketDialog dialog-title="添加桶" button-text="添加" @on-apply="onAddBucketApply" ref="addBucketDialog"></BucketDialog>
				<!-- <VBtn color="cyan-darken-3" size="large" prepend-icon="mdi-pen" class="w-100 mt-3" v-if="crop.bucket !== ''" @click="onModifyBucketClicked">修改</VBtn> -->
				<ModifyBucketDialog ref="modifyBucketDialog" @on-apply="onModifyBucketApply"></ModifyBucketDialog>
				<!-- <VBtn color="purple-darken-3" size="large" prepend-icon="mdi-crop" class="w-100 mt-3" v-if="crop.bucket !== ''" @click="onSetSameSizeClicked">设置裁剪跟桶一样</VBtn> -->
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>

<style lang="css" scoped>

</style>