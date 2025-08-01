<script setup lang="ts">
import { shallowRef } from 'vue';

const deleteDialog = shallowRef(false);
function ShowDialog() {
	deleteDialog.value = true;
}
function HideDialog() {
	deleteDialog.value = false;
}

defineEmits<{
	OnConfirmDelete: [],
}>();
defineExpose({
	ShowDialog,
	HideDialog,
})
</script>

<template>
	<VDialog v-model="deleteDialog" max-width="600">
		<VCard>
			<VCardText>
				<slot></slot>
			</VCardText>
			<template v-slot:actions>
				<VBtn @click="deleteDialog = false">取消</VBtn>
				<VBtn @click="$emit('OnConfirmDelete')" prepend-icon="mdi-delete" variant="tonal" color="red-darken-3">确定删除</VBtn>
			</template>
		</VCard>
	</VDialog>
</template>