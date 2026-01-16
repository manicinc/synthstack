/**
 * Module declarations for path aliases used in the project.
 * These allow TypeScript to resolve imports using aliases defined in tsconfig.json
 */

// Vue SFC module declarations for path aliases
declare module 'components/*' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'pages/*' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'layouts/*' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'stores/*' {
  const store: unknown
  export default store
  export * from 'stores/*'
}

declare module 'composables/*' {
  const composable: unknown
  export default composable
  export * from 'composables/*'
}

declare module 'services/*' {
  const service: unknown
  export default service
  export * from 'services/*'
}

declare module 'assets/*' {
  const asset: string
  export default asset
}

declare module 'boot/*' {
  const boot: unknown
  export default boot
}
