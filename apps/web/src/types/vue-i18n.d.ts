/**
 * Vue I18n Type Augmentation
 *
 * Extends vue-i18n types to properly define the `t()` function signature
 * with optional parameters for interpolation.
 *
 * This fixes TypeScript errors like "Expected 3 arguments, but got 1"
 * when calling t(key) without interpolation values.
 *
 * @see https://vue-i18n.intlify.dev/guide/advanced/typescript.html
 */
import type { LocaleMessages } from '@/i18n/types';

declare module 'vue-i18n' {
  // Define the message schema for type-safe translations
  // This allows vue-i18n to infer the correct t() function overloads
  export interface DefineLocaleMessage extends LocaleMessages {}
}

export {};
