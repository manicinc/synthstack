<template>
  <div class="file-upload">
    <q-file
      v-model="fileModel"
      :label="label"
      :hint="hint"
      :accept="accept"
      :multiple="multiple"
      :max-file-size="maxFileSize"
      :outlined="outlined"
      :filled="filled"
      :standout="standout"
      :disable="disable || uploading"
      :loading="uploading"
      @update:model-value="handleFileChange"
      @rejected="handleRejected"
    >
      <template #prepend>
        <q-icon name="attach_file" />
      </template>

      <template
        v-if="uploading"
        #append
      >
        <q-spinner
          color="primary"
          size="24px"
        />
      </template>

      <template
        v-else-if="fileModel"
        #append
      >
        <q-icon
          name="close"
          class="cursor-pointer"
          @click.stop="clearFile"
        />
      </template>

      <template
        v-if="showDropzone"
        #hint
      >
        <div class="text-caption">
          {{ hint || `Drag and drop or click to upload. Max size: ${formatBytes(maxFileSize)}` }}
        </div>
      </template>
    </q-file>

    <!-- File Preview -->
    <div
      v-if="preview && previewUrl"
      class="file-preview q-mt-md"
    >
      <q-card
        flat
        bordered
      >
        <q-card-section class="q-pa-sm">
          <div class="row items-center q-gutter-sm">
            <!-- Image Preview -->
            <div
              v-if="isImage"
              class="col-auto"
            >
              <q-img
                :src="previewUrl"
                style="width: 100px; height: 100px"
                fit="cover"
                class="rounded-borders"
              />
            </div>

            <!-- File Icon -->
            <div
              v-else
              class="col-auto"
            >
              <q-icon
                :name="getFileIcon()"
                size="48px"
                color="grey-7"
              />
            </div>

            <!-- File Info -->
            <div class="col">
              <div class="text-body2">
                {{ fileName }}
              </div>
              <div class="text-caption text-grey-7">
                {{ formatBytes(fileSize) }}
              </div>
            </div>

            <!-- Remove Button -->
            <div class="col-auto">
              <q-btn
                flat
                round
                dense
                icon="close"
                @click="clearFile"
              />
            </div>
          </div>

          <!-- Upload Progress -->
          <q-linear-progress
            v-if="uploading"
            :value="uploadProgress / 100"
            color="primary"
            class="q-mt-sm"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- Multiple Files List -->
    <div
      v-if="multiple && uploadedFiles.length > 0"
      class="uploaded-files q-mt-md"
    >
      <div class="text-subtitle2 q-mb-sm">
        Uploaded Files
      </div>
      <q-list
        bordered
        separator
      >
        <q-item
          v-for="(file, index) in uploadedFiles"
          :key="index"
        >
          <q-item-section avatar>
            <q-avatar>
              <q-icon :name="getFileIcon(file.name)" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ file.name }}</q-item-label>
            <q-item-label caption>
              {{ formatBytes(file.size) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn
              flat
              round
              dense
              icon="delete"
              @click="removeUploadedFile(index)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

interface Props {
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number;
  outlined?: boolean;
  filled?: boolean;
  standout?: boolean;
  disable?: boolean;
  preview?: boolean;
  showDropzone?: boolean;
  uploadUrl?: string; // API endpoint for file upload
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Choose file',
  accept: '*',
  multiple: false,
  maxFileSize: 10485760, // 10MB default
  outlined: true,
  filled: false,
  standout: false,
  disable: false,
  preview: true,
  showDropzone: true
});

const emit = defineEmits<{
  'update:modelValue': [files: File[] | null];
  'uploaded': [response: any];
  'error': [error: Error];
}>();

const $q = useQuasar();
const fileModel = ref<File | File[] | null>(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const previewUrl = ref<string | null>(null);
const uploadedFiles = ref<File[]>([]);

const fileName = computed(() => {
  if (!fileModel.value) return '';
  if (Array.isArray(fileModel.value)) {
    return fileModel.value.map(f => f.name).join(', ');
  }
  return fileModel.value.name;
});

const fileSize = computed(() => {
  if (!fileModel.value) return 0;
  if (Array.isArray(fileModel.value)) {
    return fileModel.value.reduce((sum, f) => sum + f.size, 0);
  }
  return fileModel.value.size;
});

const isImage = computed(() => {
  if (!fileModel.value || Array.isArray(fileModel.value)) return false;
  return fileModel.value.type.startsWith('image/');
});

const handleFileChange = async (file: File | File[] | null) => {
  if (!file) return;

  // Generate preview for single images
  if (!Array.isArray(file) && file.type.startsWith('image/')) {
    previewUrl.value = URL.createObjectURL(file);
  }

  // Auto-upload if URL provided
  if (props.uploadUrl) {
    await uploadFile(file);
  } else {
    emit('update:modelValue', Array.isArray(file) ? file : [file]);
  }
};

const uploadFile = async (file: File | File[]) => {
  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const formData = new FormData();
    if (Array.isArray(file)) {
      file.forEach(f => formData.append('files', f));
    } else {
      formData.append('file', file);
    }

    // Simulated upload - replace with actual API call
    const response = await fetch(props.uploadUrl!, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();

    // Add to uploaded files list
    if (props.multiple) {
      if (Array.isArray(file)) {
        uploadedFiles.value.push(...file);
      } else {
        uploadedFiles.value.push(file);
      }
    }

    emit('uploaded', result);

    $q.notify({
      type: 'positive',
      message: 'File uploaded successfully',
      position: 'top'
    });

    uploadProgress.value = 100;
  } catch (error) {
    logError('Upload error:', error);
    emit('error', error as Error);

    $q.notify({
      type: 'negative',
      message: 'Upload failed',
      position: 'top'
    });
  } finally {
    uploading.value = false;
  }
};

const handleRejected = (entries: any[]) => {
  const reasons = entries.map(entry => {
    if (entry.failedPropValidation === 'max-file-size') {
      return `File "${entry.file.name}" is too large`;
    }
    return `File "${entry.file.name}" was rejected`;
  }).join(', ');

  $q.notify({
    type: 'negative',
    message: reasons,
    position: 'top'
  });
};

const clearFile = () => {
  fileModel.value = null;
  previewUrl.value = null;
  uploadProgress.value = 0;
  emit('update:modelValue', null);
};

const removeUploadedFile = (index: number) => {
  uploadedFiles.value.splice(index, 1);
};

const getFileIcon = (filename?: string) => {
  if (!filename) {
    if (!fileModel.value || Array.isArray(fileModel.value)) return 'insert_drive_file';
    filename = fileModel.value.name;
  }

  const ext = filename.split('.').pop()?.toLowerCase();

  const icons: Record<string, string> = {
    pdf: 'picture_as_pdf',
    doc: 'description',
    docx: 'description',
    xls: 'table_chart',
    xlsx: 'table_chart',
    ppt: 'slideshow',
    pptx: 'slideshow',
    zip: 'folder_zip',
    rar: 'folder_zip',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'image',
    mp4: 'video_library',
    mov: 'video_library',
    mp3: 'audio_file',
    wav: 'audio_file'
  };

  return icons[ext || ''] || 'insert_drive_file';
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped lang="scss">
.file-upload {
  .file-preview {
    .rounded-borders {
      border-radius: 8px;
    }
  }

  .uploaded-files {
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
