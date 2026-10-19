import { ref } from 'vue'

/**
 * Avisos rápidos (toast) exibidos na interface.
 * Ficam apenas em memória — nada é registrado em log nem enviado a lugar algum.
 */

export type TipoAviso = 'sucesso' | 'erro' | 'info'

export interface Aviso {
  id: number
  tipo: TipoAviso
  texto: string
}

const avisos = ref<Aviso[]>([])
let proximoId = 1

/** Mostra um aviso temporário (some sozinho após alguns segundos). */
export function notificar(texto: string, tipo: TipoAviso = 'sucesso'): void {
  const aviso: Aviso = { id: proximoId++, tipo, texto }
  avisos.value.push(aviso)
  window.setTimeout(() => dispensarAviso(aviso.id), 5000)
}

export function dispensarAviso(id: number): void {
  const indice = avisos.value.findIndex((aviso) => aviso.id === id)
  if (indice !== -1) avisos.value.splice(indice, 1)
}

export function usarNotificacoes() {
  return { avisos, notificar, dispensarAviso }
}
