
import * as XLSX from 'xlsx'
import { obterCategoria, obterSubcategoria } from '@/stores/categorias'
import { obterConta } from '@/stores/contas'
import type { Lancamento } from '@/stores/lancamentos'

export function exportarExcel(lancamentos: Lancamento[]) {
  const dados = lancamentos.map((lancamento) => {
    const categoria = obterCategoria(lancamento.categoriaId)
    const subcategoria = lancamento.subcategoriaId
      ? obterSubcategoria(lancamento.categoriaId, lancamento.subcategoriaId)
      : undefined

    return {
      Descrição: lancamento.descricao,
      Valor: lancamento.valor,
      Tipo: lancamento.tipo === 'receita' ? 'Receita' : 'Despesa',
      Categoria: categoria?.nome ?? 'Sem categoria',
      Subcategoria: subcategoria?.nome ?? '',
      Conta: obterConta(lancamento.contaId)?.nome ?? '',
      Parcela:
        lancamento.parcelaTotal && lancamento.parcelaTotal > 1
          ? `${lancamento.parcelaNumero}/${lancamento.parcelaTotal}`
          : '',
      Data: lancamento.data,
      Observação: lancamento.observacao ?? '',
    }
  })

  const planilha = XLSX.utils.json_to_sheet(dados)

  const arquivo = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(arquivo, planilha, 'Lançamentos')

  XLSX.writeFile(arquivo, 'lancamentos-financeiros.xlsx')
}
