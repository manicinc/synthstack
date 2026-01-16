<script setup lang="ts">
/**
 * DirectusVisualEditorPreview
 * Mock preview of the Visual Editor / In-Place Editing feature
 */

import { ref } from 'vue'

const isEditing = ref(false)
const editingField = ref<string | null>(null)

const content = ref({
  title: 'Build Faster with SynthStack',
  subtitle: 'The complete Vue + Directus + LangGraph starter kit',
  cta: 'Get Started'
})

function startEdit(field: string) {
  isEditing.value = true
  editingField.value = field
}

function stopEdit() {
  isEditing.value = false
  editingField.value = null
}
</script>

<template>
  <div class="visual-editor-preview">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">
          <q-icon
            name="edit_note"
            size="16px"
          />
          Visual Editing Mode
        </span>
        <span
          class="status-badge"
          :class="{ active: isEditing }"
        >
          {{ isEditing ? 'Editing' : 'Preview' }}
        </span>
      </div>
      <div class="toolbar-actions">
        <button
          class="toolbar-btn"
          :class="{ active: isEditing }"
          @click="isEditing = !isEditing"
        >
          <q-icon
            :name="isEditing ? 'visibility' : 'edit'"
            size="16px"
          />
          {{ isEditing ? 'Preview' : 'Edit' }}
        </button>
        <button
          v-if="isEditing"
          class="toolbar-btn save"
        >
          <q-icon
            name="save"
            size="16px"
          />
          Save
        </button>
      </div>
    </div>

    <!-- Preview Area -->
    <div
      class="preview-area"
      :class="{ 'edit-mode': isEditing }"
    >
      <div class="preview-content">
        <!-- Editable Title -->
        <div 
          class="editable-block"
          :class="{ 'is-editing': editingField === 'title' }"
          @click="isEditing && startEdit('title')"
        >
          <div
            v-if="isEditing"
            class="edit-indicator"
          >
            <q-icon
              name="edit"
              size="12px"
            />
          </div>
          <h1 
            class="preview-title"
            :contenteditable="editingField === 'title'"
            @blur="stopEdit"
          >
            {{ content.title }}
          </h1>
        </div>

        <!-- Editable Subtitle -->
        <div 
          class="editable-block"
          :class="{ 'is-editing': editingField === 'subtitle' }"
          @click="isEditing && startEdit('subtitle')"
        >
          <div
            v-if="isEditing"
            class="edit-indicator"
          >
            <q-icon
              name="edit"
              size="12px"
            />
          </div>
          <p 
            class="preview-subtitle"
            :contenteditable="editingField === 'subtitle'"
            @blur="stopEdit"
          >
            {{ content.subtitle }}
          </p>
        </div>

        <!-- Editable CTA -->
        <div 
          class="editable-block cta-block"
          :class="{ 'is-editing': editingField === 'cta' }"
          @click="isEditing && startEdit('cta')"
        >
          <div
            v-if="isEditing"
            class="edit-indicator"
          >
            <q-icon
              name="edit"
              size="12px"
            />
          </div>
          <button 
            class="preview-cta"
            :contenteditable="editingField === 'cta'"
            @blur="stopEdit"
          >
            {{ content.cta }}
          </button>
        </div>

        <!-- Feature Pills -->
        <div class="feature-pills">
          <span class="pill">
            <q-icon
              name="check_circle"
              size="14px"
            />
            In-Context Editing
          </span>
          <span class="pill">
            <q-icon
              name="check_circle"
              size="14px"
            />
            Live Preview
          </span>
          <span class="pill">
            <q-icon
              name="check_circle"
              size="14px"
            />
            Auto-Save
          </span>
        </div>
      </div>

      <!-- Floating Panel (when editing) -->
      <Transition name="slide-up">
        <div
          v-if="editingField"
          class="floating-panel"
        >
          <div class="panel-header">
            <span>Editing: {{ editingField }}</span>
            <button
              class="close-btn"
              @click="stopEdit"
            >
              <q-icon
                name="close"
                size="14px"
              />
            </button>
          </div>
          <div class="panel-content">
            <div class="field-group">
              <label>Text Content</label>
              <input
                type="text"
                :value="content[editingField as keyof typeof content]"
              >
            </div>
            <div class="field-group">
              <label>CSS Class</label>
              <input
                type="text"
                placeholder="custom-class"
              >
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.visual-editor-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 12px;
  }
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);

  .q-icon {
    color: #6366f1;
  }
}

.status-badge {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);

  &.active {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &.active {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
    color: #a5b4fc;
  }

  &.save {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.4);
    color: #34d399;
  }
}

.preview-area {
  position: relative;
  padding: 40px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  min-height: 280px;

  &.edit-mode {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  @media (max-width: 600px) {
    padding: 24px;
  }
}

.preview-content {
  text-align: center;
}

.editable-block {
  position: relative;
  display: inline-block;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 8px;
  transition: all 0.2s ease;

  .edit-mode & {
    cursor: pointer;

    &:hover {
      background: rgba(99, 102, 241, 0.15);
      outline: 2px dashed rgba(99, 102, 241, 0.5);
    }
  }

  &.is-editing {
    background: rgba(99, 102, 241, 0.2);
    outline: 2px solid #6366f1;
  }
}

.edit-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #6366f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;

  .editable-block:hover &,
  .editable-block.is-editing & {
    opacity: 1;
    transform: scale(1);
  }
}

.preview-title {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  outline: none;

  @media (max-width: 600px) {
    font-size: 1.5rem;
  }
}

.preview-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  outline: none;
}

.cta-block {
  margin-top: 16px;
}

.preview-cta {
  padding: 12px 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.feature-pills {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);

  .q-icon {
    color: #10b981;
  }
}

// Floating Panel
.floating-panel {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 280px;
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: capitalize;
}

.close-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
}

.panel-content {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  input {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #fff;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: #6366f1;
    }
  }
}

// Transitions
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

// Light mode
:global(.body--light) {
  .editor-toolbar {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .toolbar-label {
    color: #334155;
  }

  .status-badge {
    background: rgba(0, 0, 0, 0.05);
    color: #64748b;
  }

  .toolbar-btn {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
    color: #475569;

    &:hover {
      background: rgba(0, 0, 0, 0.08);
      color: #1e293b;
    }
  }

  .preview-area {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .preview-title {
    color: #1e293b;
  }

  .preview-subtitle {
    color: #475569;
  }

  .pill {
    background: rgba(0, 0, 0, 0.04);
    color: #475569;
  }

  .floating-panel {
    background: #fff;
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  }

  .panel-header {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
    color: #1e293b;
  }

  .field-group {
    label {
      color: #64748b;
    }

    input {
      background: rgba(0, 0, 0, 0.03);
      border-color: rgba(0, 0, 0, 0.1);
      color: #1e293b;
    }
  }
}
</style>


