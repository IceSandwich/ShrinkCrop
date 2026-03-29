<script setup lang="ts">
import ModelDialog from '@/dialogs/ModelDialog.vue';
import TagEditDialog from '@/dialogs/TagEditDialog.vue';
import { OpenFileDialog, PackAsZIP, ReadAsImage, ReadAsJson } from '@/utils/FileSystem';
import { type ProjectBase } from '@/utils/Project';
import { InvokeUserDownloadFile } from '@/utils/Network';
import { TagModelInstance } from '@/utils/TagModel';
import { AppProject } from './Shared';

const emit = defineEmits<{
    OnImportedImages: [],
    OnImportedProject: [],
}>();

function onImportClicked() {
    OpenFileDialog("image/*", true, async function (filelist) {
        const imgs = await Promise.all(filelist.map((v, i) => ReadAsImage(v)))
        await AppProject.ImportImages(imgs);

        emit('OnImportedImages');
    });
}

function onImportProjectClicked() {
    OpenFileDialog("application/json", false, async function (filelist) {
        const jsonData = await ReadAsJson<ProjectBase>(filelist[0]);
        const missingFiles = await AppProject.ImportProject(jsonData);

        if (missingFiles.length > 0) {
            alert(`The following files are missing: \n${missingFiles.join('\n')}`);
        }
        emit('OnImportedProject');
    });
}

async function onExportClicked() {
    if (AppProject.images.value.length === 0) {
        alert("没有任何文件需要导出");
        return;
    }

    let zipfile = await AppProject.Export();
    InvokeUserDownloadFile("export.zip", await PackAsZIP(zipfile));
}

function onRemoveUselessBucketsClicked() {
    const count = AppProject.CleanUselessBuckets();
    if (count === 0) {
        alert(`已最优化。`);
    } else {
        alert(`已清理 ${count} 个桶。`);
    }
}

function onGithubClicked() {
	window.open("https://github.com/IceSandwich/ShrinkCrop", "_blank");
}

</script>

<template>
    <VAppBar class="bg-purple-darken-4">
        <VBtn size="large" class="ms-3" prepend-icon="mdi-crop" variant="text">
            <VAppBarTitle class="select">ShrinkCrop</VAppBarTitle>
        </VBtn>

        <VDivider vertical inset class="ms-3"></VDivider>

        <VToolbarItems variant="plain">
            <VBtn prepend-icon="mdi-plus" class="text-none" @click="onImportClicked">
                导入图片
            </VBtn>
            <VBtn prepend-icon="mdi-cog" class="text-none" @click="onImportProjectClicked">
                导入工程
            </VBtn>
            <VBtn prepend-icon="mdi-export" class="text-none" @click="onExportClicked">
                导出结果
            </VBtn>
            <VBtn prepend-icon="mdi-pail-remove" class="text-none" @click="onRemoveUselessBucketsClicked">
                清理无用桶
            </VBtn>
            <ModelDialog>
                <template v-slot:activator="{ showDialog }">
                    <VBtn prepend-icon="mdi-tag" class="text-none" @click="showDialog()">
                        打标模型
                    </VBtn>
                </template>
            </ModelDialog>
            <TagEditDialog v-if="TagModelInstance != null">
                <template v-slot:activator="{ showDialog }">
                    <VBtn prepend-icon="mdi-tag" class="text-none" @click="showDialog">
                        标签设置
                    </VBtn>
                </template>
            </TagEditDialog>
            <VBtn prepend-icon="mdi-github" class="text-none" @click="onGithubClicked">
                Github
            </VBtn>
        </VToolbarItems>

        <VSpacer></VSpacer>

        <slot name="status"></slot>
    </VAppBar>
</template>