/**
 * Visual Editing Composable (Stub)
 *
 * This is a no-op stub since Directus visual editing is not bundled.
 * The actual visual editing functionality requires @directus/visual-editing
 * which is only available when using a local Directus instance.
 */

/**
 * Options for the editableAttr function
 */
interface EditableAttrOptions {
  collection: string;
  item: string | number;
  fields: string;
  mode?: 'popover' | 'drawer';
}

/**
 * No-op visual editing composable
 * Returns empty functions for compatibility with existing code
 */
export function useVisualEditing() {
  return {
    // Returns empty object for v-bind usage
    // Accepts an options object matching the Directus visual editing API
    editableAttr: (_options: EditableAttrOptions) => ({}),
    // No-op functions
    isEditingEnabled: false,
    enableEditing: () => {},
    disableEditing: () => {},
  }
}

export default useVisualEditing
