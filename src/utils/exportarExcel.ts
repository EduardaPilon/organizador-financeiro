
import * as XLSX from 'xlsx'
import type { Lancamento } from '@/stores/lancamentos'

export function exportarExcel(lancamentos: Lancamento[]) {
  const dados = lancamentos.map((lancamento) => ({
    Descrição: lancamento.descricao,
    Valor: lancamento.valor,
    Tipo: lancamento.tipo === 'receita' ? 'Receita' : 'Despesa',
    Categoria: lancamento.categoria,
    Data: lancamento.data,
  }))

  const planilha = XLSX.utils.json_to_sheet(dados)

  const arquivo = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(arquivo, planilha, 'Lançamentos')

  XLSX.writeFile(arquivo, 'lancamentos-financeiros.xlsx')
}
