import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { adicionarLancamento } from '@/stores/lancamentos'
import { adicionarConta } from '@/stores/contas'
import { montarPlanilhaCompleta } from './exportarExcel'

/** Lê uma aba do livro gerado, como matriz de células (linha 0 = cabeçalho). */
function lerAba(livro: XLSX.WorkBook, aba: string): unknown[][] {
  const binario = XLSX.write(livro, { type: 'array', bookType: 'xlsx' })
  const relido = XLSX.read(binario, { type: 'array' })
  const planilha = relido.Sheets[aba]
  if (!planilha) throw new Error(`Aba "${aba}" não encontrada.`)
  return XLSX.utils.sheet_to_json<unknown[]>(planilha, { header: 1 })
}

const ABAS_ESPERADAS = [
  'Lançamentos',
  'Categorias',
  'Contas',
  'Transferências',
  'Cartões',
  'Compras no cartão',
  'Pagamentos de fatura',
  'Compromissos',
  'Orçamentos',
  'Metas',
  'Investimentos',
  'Movimentações',
  'Bens',
  'Dívidas',
]

describe('montarPlanilhaCompleta', () => {
  it('cria uma aba para cada módulo do app, na ordem esperada', () => {
    expect(montarPlanilhaCompleta().SheetNames).toEqual(ABAS_ESPERADAS)
  })

  it('mantém o cabeçalho visível mesmo quando o módulo está vazio', () => {
    // "Metas" começa sem nenhum registro nesta suíte.
    const [cabecalho] = lerAba(montarPlanilhaCompleta(), 'Metas')
    expect(cabecalho).toEqual([
      'Meta',
      'Valor alvo',
      'Valor atual',
      'Progresso (%)',
      'Prazo',
      'Observação',
    ])
  })

  it('leva os lançamentos com o nome da categoria e da conta', () => {
    const conta = adicionarConta({
      nome: 'Nubank',
      tipo: 'digital',
      saldoInicial: 0,
    })
    adicionarLancamento({
      descricao: 'Mercado do mês',
      valor: 120.5,
      tipo: 'despesa',
      categoriaId: 'ess-supermercado',
      data: '2026-10-05',
      contaId: conta.id,
    })

    const linhas = lerAba(montarPlanilhaCompleta(), 'Lançamentos')
    expect(linhas[1]?.slice(0, 6)).toEqual([
      'Mercado do mês',
      120.5,
      'Despesa',
      'Supermercado e alimentação',
      '',
      'Nubank',
    ])
  })
})
