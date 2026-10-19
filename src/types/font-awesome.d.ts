/**
 * Tipagem do componente global <font-awesome-icon> para o vue-tsc.
 * Registrado em src/main.ts via app.component(...).
 */
import '@vue/runtime-core'

declare module 'vue' {
  export interface GlobalComponents {
    FontAwesomeIcon: typeof import('@fortawesome/vue-fontawesome')['FontAwesomeIcon']
  }
}
