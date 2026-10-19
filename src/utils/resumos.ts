import type { Lancamento, TipoLancamento } from '@/stores/lancamentos'
import { formatarMes } from './formatar'
import { arredondar2, somarEmCentavos } from './moeda'

/** Consolidado de receitas e despesas de um mês (chave "AAAA-MM"). */
export interface ResumoMes {
  chave: string
  rotulo: string
  quantidade: number
  receitas: number
  despesas: number
  resultado: number
}

/**
 * Agrupa lançamentos por mês e devolve o consolidado de cada um,
 * do mês mais recente para o mais antigo.
 */
export function resumirPorMes(lancamentos: Lancamento[]): ResumoMes[] {
  const porMes = new Map<string, ResumoMes>()

  for (const lancamento of lancamentos) {
    const chave = lancamento.data.slice(0, 7)
    let resumo = porMes.get(chave)

    if (!resumo) {
      resumo = {
        chave,
        rotulo: formatarMes(chave),
        quantidade: 0,
        receitas: 0,
        despesas: 0,
        resultado: 0,
      }
      porMes.set(chave, resumo)
    }

    if (lancamento.tipo === 'receita') resumo.receitas += lancamento.valor
    else resumo.despesas += lancamento.valor
    resumo.quantidade += 1
  }

  return [...porMes.values()]
    .map((resumo) => ({
      ...resumo,
      receitas: arredondar2(resumo.receitas),
      despesas: arredondar2(resumo.despesas),
      resultado: arredondar2(resumo.receitas - resumo.despesas),
    }))
    .sort((a, b) => b.chave.localeCompare(a.chave))
}

/** Soma os valores dos lançamentos de um tipo (receita ou despesa). */
export function somarPorTipo(
  lancamentos: Lancamento[],
  tipo: TipoLancamento,
): number {
  return somarEmCentavos(
    lancamentos
      .filter((lancamento) => lancamento.tipo === tipo)
      .map((lancamento) => lancamento.valor),
  )
}
