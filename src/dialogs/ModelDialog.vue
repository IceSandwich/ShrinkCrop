<template>
    <v-dialog max-width="500" v-model="showModelDialog">
        <template v-slot:activator>
            <slot name="activator" :showDialog="ShowDialog">
                <v-btn @click="ShowDialog()">
                    打标模型
                </v-btn>
            </slot>
        </template>

        <template v-slot:default>
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
                                        item-title="name"></v-select>
                                    <v-slider color="orange" label="线程数" thumb-label="always" :min="1" :max="8" :step="1"
                                        :model-value="2" class="mt-5"></v-slider>
                                    <v-checkbox label="Warmup" v-model="shouldWarmup"></v-checkbox>
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
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, shallowRef, useTemplateRef, type ShallowRef } from 'vue';
import { GetFileInStore, GetTextInStore, SaveToStorage } from '@/utils/FileSystem';
import { DownloadFileWithProgress, DownloadTextFile } from '@/utils/Network';
import { CreateTagModel, TagModelInstance, type ModelTensorInfo } from '@/utils/TagModel';

interface ModelInfo {
    name: string;
    url: string;
    filename: string;
    tensors: ModelTensorInfo;
}

const pretrainedModels: ModelInfo[] = [];
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
const shouldWarmup = ref<boolean>(true);

const progressText = useTemplateRef("progressText");
const progressValue = ref(0);
function setProgress(norm_value: number, text: string) {
    progressValue.value = norm_value * 100;
    if (progressText.value) {
        progressText.value.textContent = text;
    }
}

const select: ShallowRef<ModelInfo> = shallowRef(pretrainedModels[0]);
const formDisable = ref(false);
const emit = defineEmits<{
    OnLoadedModel: []
}>();
async function onInitModel() {
    formDisable.value = true;
    console.log("selected: ", select.value);

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

    const [modelBuf, csvContent] = await Promise.all([modelPromise, csvPromise])

    setProgress(0, "Loading onnx-runtime...");
    TagModelInstance.value = await CreateTagModel(modelBuf, csvContent, select.value.tensors);

    if (shouldWarmup.value) {
        setProgress(100, "Warmup...");
        const tensor = TagModelInstance.value.NewEmptyTensor();
        await TagModelInstance.value.InferTags(tensor, 0.3485, false);
    }
    

    setProgress(100, "Complete!");
    formDisable.value = false;
    showModelDialog.value = false;
    emit('OnLoadedModel');
}

const showModelDialog = ref(false);

function ShowDialog() {
    showModelDialog.value = true;
}

defineExpose({
    ShowDialog
})

</script>