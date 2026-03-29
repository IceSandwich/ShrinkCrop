<script setup lang="ts">
import BucketDialog from '../dialogs/BucketDialog.vue';
import ModifyBucketDialog from './ModifyBucketDialog.vue';
import { CalcRatio, MaxRectWithRatio } from '@/utils/Functions';
import type { ProjectV1Bucket, ProjectV1CropRect } from '@/utils/Project';
import { useTemplateRef } from 'vue';

const props = defineProps<{
	crop: ProjectV1CropRect,
	buckets: Map<string, ProjectV1Bucket>,
}>();

const emits = defineEmits<{
	OnBucketUpdate: [key: string],
}>();

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

function formatBucket(bucket: ProjectV1Bucket) {
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
							{{ formatBucket(item[1]) }}
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
				<VBtn color="indigo-darken-3" size="large" prepend-icon="mdi-bookmark-plus-outline" class="w-100"
					@click="onAddBucketClicked">添加</VBtn>
				<BucketDialog dialog-title="添加桶" button-text="添加" @on-apply="onAddBucketApply" ref="addBucketDialog">
				</BucketDialog>
				<ModifyBucketDialog ref="modifyBucketDialog" @on-apply="onModifyBucketApply"></ModifyBucketDialog>
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>

<style lang="css" scoped></style>