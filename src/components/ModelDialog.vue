<template>
    <v-dialog max-width="500" v-model="showModelDialog">
        <v-card title="打标模型" prepend-icon="mdi-package-variant-closed">
            <v-card-text>
                <v-container fluid>
                    <v-row>
                        <v-col>
                            使用打标模型对裁剪的图片进行标注
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col>
                            <v-form :disabled="formDisable">
                                <v-select label="Pretrained Model" :items="pretrainedModels" v-model="select"
                                    item-title="name" @update:model-value="onSelectedPretrainedModel"></v-select>
                                <v-slider color="orange" label="线程数" thumb-label="always" :min="1" :max="8" :step="1"
                                    :model-value="2" class="mt-5"></v-slider>
                                <v-checkbox label="Warmup"></v-checkbox>
                            </v-form>
                        </v-col>
                    </v-row>
                    <v-row v-if="formDisable">
                        <v-col cols="12">
                            <span ref="progressText">
                            </span>
                        </v-col>
                        <v-col>
                            <v-progress-linear color="deep-purple-accent-4" @indeterminate="progressValue == 0" rounded></v-progress-linear>
                        </v-col>
                    </v-row>
                    <v-row class="mt-10">
                        <v-spacer></v-spacer>
                        <v-btn class="bg-blue-darken-3 text-none" size="large" @click="onInitModel" :disabled="formDisable">加载</v-btn>
                    </v-row>

                </v-container>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, useTemplateRef, type ShallowRef } from 'vue';
import { GetFileInStore, GetTextInStore, SaveToStorage } from '@/utils/FileSystem';
import { DownloadFileWithProgress, DownloadTextFile } from '@/utils/Network';
import { CreateTagModel, TagModelInstance, type ModelTensorInfo } from '@/utils/TagModel';

interface ModelInfo {
    name: string;
    url: string;
    filename: string;
    tensors: ModelTensorInfo;
}

let pretrainedModels: ModelInfo[] = [];
pretrainedModels.push({
    name: "SmalingWolf/wd-v1-4-convnextv2-tagger-v2",
    url: "models/wd-v1-4-convnextv2-tagger-v2-slim.onnx",
    filename: "wd-v1-4-convnextv2-tagger-v2-slim.onnx",
    tensors: {
        input_width: 448,
        input_height: 448,
        input_channel: 3,
        output_classes: 9083,
        output_name: "predictions_sigmoid",
    }
})
const tagFileUrl = "models/selected_tags.csv";

const select: ShallowRef<ModelInfo> = shallowRef(pretrainedModels[0]);
const formDisable = ref(false);
let progressText = useTemplateRef("progressText");
const progressValue = ref(0);
function onInitModel() {
    formDisable.value = true;
    console.log("selected: ", select.value);

    const setProgress = (norm_value: number, text: string) => {
        progressValue.value = norm_value *100;
        if (progressText.value) {
            progressText.value.textContent = text;
        }
    }

    const modelPromise = GetFileInStore("models", select.value.filename).then((value) => {
        if (value == null) {
            return DownloadFileWithProgress(select.value.url, (loaded, total) => {
                setProgress(loaded / total, `Downloading... ${Math.floor(loaded / total * 100)}%`);
            }).then(async (buffer) => {
                setProgress(0, "Saving...");
                await SaveToStorage("models", select.value.filename, buffer);
                return buffer;
            })
        } else {
            return value;
        }
    })

    const csvPromise = GetTextInStore("models", "tags.csv").then((value) => {
        if (value == null) {
            return DownloadTextFile(tagFileUrl).then(async (value) => {
                await SaveToStorage("models", "tags.csv", value);
                return value;
            })
        } else {
            return value;
        }
    });

    Promise.all([modelPromise, csvPromise]).then(async ([modelBuf, csvContent]) => {
        setProgress(0, "Loading onnx-runtime...");
        return await CreateTagModel(modelBuf, csvContent, select.value.tensors);
    }).then(async (model) => {
        TagModelInstance.value = model;
        setProgress(100, "Complete!");

        formDisable.value = false;
        showModelDialog.value = false;
    });
}

const showModelDialog = ref(false);

function onSelectedPretrainedModel(value: ModelInfo | null) {
    // console.log("Selected pretrained model: ", value);
}

function ShowDialog() {
    showModelDialog.value = true;
}

defineExpose({
    ShowDialog
})

</script>