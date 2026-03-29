<script setup lang="ts">
import BucketsExpansionPanels from '@/expansion/Buckets.vue';
import TagsExpansionPanels from '@/expansion/Tags.vue';
import { TagModelInstance, TagPool } from '@/utils/TagModel';
import { shallowRef } from 'vue';
import { AppProject } from './Shared';

const props = defineProps<{
    selectedImageIndex: number,
    selectedCropIndex: number
}>();
const expandModel = shallowRef(["bucket"]);

defineEmits<{
    OnBucketUpdate: []
}>();
</script>

<template>
    <VContainer>
        <VRow>
            <VExpansionPanels v-if="selectedImageIndex !== -1 && selectedCropIndex !== -1" multiple v-model="expandModel">
                <BucketsExpansionPanels :crop="AppProject.images.value[selectedImageIndex].crops[selectedCropIndex]" 
                :buckets="AppProject.buckets.value"
                    @on-bucket-update="$emit('OnBucketUpdate')">
                </BucketsExpansionPanels>

                <TagsExpansionPanels
                    v-model:crop="AppProject.images.value[selectedImageIndex].crops[selectedCropIndex]"
                    v-model:tagpool="TagPool"
                    :item="AppProject.images.value[selectedImageIndex]"
                     v-if="TagModelInstance != null">
                </TagsExpansionPanels>
            </VExpansionPanels>
        </VRow>
    </VContainer>
</template>