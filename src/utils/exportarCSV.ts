import { obterCategoria, obterSubcategoria } from '@/stores/categorias'
import { obterConta } from '@/stores/contas'
import type { Lancamento } from '@/stores/lancamentos'
import { formatarMoeda } from './formatar'

/**
 * Exporta lançamentos para CSV legível no Excel em português:
 * separador ";" (padrão pt-BR), datas AAAA-MM-DD, valores numéricos
 * com vírgula decimal e BOM UTF-8 (acentos corretos no Windows).
 */
export function exportarCSV(lancamentos: Lancamento[]): void {
  const linhas: string[][] = [
    ['Descrição', 'Valor', 'Tipo', 'Categoria', 'Subcategoria', 'Conta', 'Data', 'Observação'],
  ]

  for (const lancamento of lancamentos) {
    const categoria = obterCategoria(lancamento.categoriaId)
    const subcategoria = lancamento.subcategoriaId
      ? obterSubcategoria(lancamento.categoriaId, lancamento.subcategoriaId)
      : undefined

    linhas.push([
      lancamento.descricao,
      formatarMoeda(lancamento.valor).replace('R$', '').trim(),
      lancamento.tipo === 'receita' ? 'Receita' : 'Despesa',
      categoria?.nome ?? 'Sem categoria',
      subcategoria?.nome ?? '',
      obterConta(lancamento.contaId)?.nome ?? '',
      lancamento.data,
      lancamento.observacao ?? '',
    ])
  }

  const corpo = linhas
    .map((linha) =>
      linha
        // Escape padrão CSV: aspas duplicadas dentro do texto.
        .map((celula) => `"${celula.replace(/"/g, '""')}"`)
        .join(';'),
    )
    .join('\r\n')

  const conteudo = `\uFEFF${corpo}`
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'lancamentos-financeiros.csv'
  link.click()
  URL.revokeObjectURL(url)
}
