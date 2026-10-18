import { ref, watch } from 'vue'

export interface Lancamento {
  id: number
  descricao: string
  valor: number
  tipo: string
  categoria: string
  data: string
}

const dadosSalvos = localStorage.getItem('lancamentos')

const lancamentos = ref<Lancamento[]>(
  dadosSalvos ? JSON.parse(dadosSalvos) : [],
)

watch(
  lancamentos,
  (novosLancamentos) => {
    localStorage.setItem(
      'lancamentos',
      JSON.stringify(novosLancamentos),
    )
  },
  { deep: true },
)

export function usarLancamentos() {
  return { lancamentos }
}