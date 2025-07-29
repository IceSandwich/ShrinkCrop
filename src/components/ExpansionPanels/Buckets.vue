<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue';
import type { Bucket, Image, Size } from '../commons';
const props = defineProps<{
	images: Image[],
	buckets: Bucket[],
}>();
const emits = defineEmits<{
	OnAddConfigBtnClicked: [],
	OnAddConfig: [width: number, height: number],
	OnBucketChanged: [val: number],
}>();
const fetchUnusedBuckets = computed(() => {
	return props.images.filter(v => v.bucket == -1).length;
});

const addConfigTargetWidth = shallowRef(0);
const addConfigTargetHeight = shallowRef(0);
const addConfigKeepRatioCheckbox = shallowRef(true);
const bucketDialog = shallowRef(false);
const bucketRadio = shallowRef(-1);

function ShowAddConfigDialog(width: number, height: number) {
	addConfigTargetWidth.value = width;
	addConfigTargetHeight.value = height;
	bucketDialog.value = true;
}
function HideAddConfigDialog() {
	bucketDialog.value = false;
}
function GetBucketId() {
	return bucketRadio.value;
}
function SetBucketId(val: number) {
	bucketRadio.value = val;
	onBucketChange(val);
}

function onAddConfigApplyClicked() {
	emits('OnAddConfig', addConfigTargetWidth.value, addConfigTargetHeight.value);
}


let oldTargetSize: Size = {width: 0, height: 0};
function saveTargetSize() {
	oldTargetSize.width = addConfigTargetWidth.value;
	oldTargetSize.height = addConfigTargetHeight.value;
}
function onAddConfigTargetWidthChanged(val: boolean) {
	if (val) {
		saveTargetSize();
	} else {
		if (oldTargetSize.width != 0 && addConfigKeepRatioCheckbox.value) {
			addConfigTargetHeight.value = Math.floor(addConfigTargetWidth.value * oldTargetSize.height / oldTargetSize.width);
		}
	}
}
function onAddConfigTargetHeightChanged(val: boolean) {
	if (val) {
		saveTargetSize();
	} else {
		if (oldTargetSize.height != 0 && addConfigKeepRatioCheckbox.value) {
			addConfigTargetWidth.value = Math.floor(addConfigTargetHeight.value * oldTargetSize.width / oldTargetSize.height);
		}
	}
}

function onBucketChange(value: number | null) {
	if (value == null) return;

	emits('OnBucketChanged', value);
}

function onAddConfigBtnClicked() {
	emits('OnAddConfigBtnClicked');
}

function onKeyup(e: KeyboardEvent) {
	if (e.key.toLowerCase() == 'a') {
		onAddConfigBtnClicked();
	}
}
onMounted(() => {
	document.addEventListener('keyup', onKeyup);
})
onUnmounted(() => {
	document.removeEventListener('keyup', onKeyup);
})

defineExpose({
	ShowAddConfigDialog,
	HideAddConfigDialog,
	GetBucketId,
	SetBucketId,
})
</script>

<template>
	<VExpansionPanel>
		<VExpansionPanelTitle>桶</VExpansionPanelTitle>
		<VExpansionPanelText class="px-3 py-3">
			<VRow>
				<VRadioGroup v-model="bucketRadio" @update:model-value="onBucketChange">
					<VRadio v-for="(item, i) in buckets" :value="i">
						<template v-slot:label>
							{{ item.size.width }} x {{ item.size.height }} ( {{ item.ratio.width }} : {{ item.ratio.height }})
						</template>
					</VRadio>
					<VRadio :value="-1">
						<template v-slot:label>
							不使用 ( {{ fetchUnusedBuckets }} / {{ images.length }} )
						</template>
					</VRadio>
				</VRadioGroup>
			</VRow>
			<VRow>
				<VBtn color="indigo-darken-3" size="large" prepend-icon="mdi-bookmark-plus-outline" class="w-100"
					@click="onAddConfigBtnClicked">添加配置 (A)</VBtn>
				<VDialog v-model="bucketDialog" max-width="600">
					<VCard prepend-icon="mdi-bookmark-plus-outline" title="添加配置">
						<VCardText>
							<VRow>
								<VCol cols="6">
									<VNumberInput control-variant="hidden" label="Target Width"
										v-model="addConfigTargetWidth"
										@update:focused="onAddConfigTargetWidthChanged" />
								</VCol>
								<VCol cols="6">
									<VNumberInput control-variant="hidden" label="Target Height"
										v-model="addConfigTargetHeight"
										@update:focused="onAddConfigTargetHeightChanged" />
								</VCol>
							</VRow>
							<VRow>
								<VCheckbox label="保存宽高比" v-model="addConfigKeepRatioCheckbox" />
							</VRow>
						</VCardText>
						<template v-slot:actions>
							<VBtn class="ms-auto" text="添加" @click="onAddConfigApplyClicked" />
						</template>
					</VCard>
				</VDialog>
			</VRow>
		</VExpansionPanelText>
	</VExpansionPanel>
</template>