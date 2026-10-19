import * as XLSX from 'xlsx'
import {
  ROTULOS_GRUPOS,
  listarCategorias,
  obterCategoria,
  obterSubcategoria,
} from '@/stores/categorias'
import { ROTULOS_TIPOS_CONTA, contas, obterConta, transferencias } from '@/stores/contas'
import { usarLancamentos, type Lancamento } from '@/stores/lancamentos'
import { cartoes, compras, obterCartao, pagamentosFatura } from '@/stores/cartoes'
import {
  ROTULOS_MOVIMENTACOES,
  ROTULOS_TIPOS_INVESTIMENTO,
  investimentos,
  movimentacoes,
  obterInvestimento,
  rendimentoEstimado,
} from '@/stores/investimentos'
import { ROTULOS_TIPOS_BEM, ROTULOS_TIPOS_DIVIDA, bens, dividas } from '@/stores/patrimonio'
import { metas, orcamentos, progressoMeta } from '@/stores/orcamentos'
import { ROTULOS_TIPO_COMPROMISSO, compromissos } from '@/stores/compromissos'
import { dataHoje } from './formatar'

/**
 * Geração de planilhas Excel (.xlsx) 100% local, via SheetJS.
 *
 * Dois caminhos:
 * - `exportarExcel(lancamentos)`: só os lançamentos recebidos (usado pelos
 *   botões das telas de Lançamentos e de Análise, que já filtram antes).
 * - `exportarTudoExcel()`: uma aba por módulo, com todos os dados do app.
 *
 * Nada sai do computador: o arquivo é montado no navegador e baixado.
 */

type Linha = Record<string, string | number>

/**
 * Monta uma aba a partir das linhas e de uma lista fixa de colunas.
 * Passar `header` garante que o cabeçalho apareça mesmo quando o módulo
 * ainda não tem nenhum registro (aba vazia, mas legível).
 */
function criarAba(linhas: Linha[], colunas: string[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(linhas, { header: colunas })
}

const COLUNAS_LANCAMENTOS = [
  'Descrição',
  'Valor',
  'Tipo',
  'Categoria',
  'Subcategoria',
  'Conta',
  'Parcela',
  'Data',
  'Observação',
]

function linhasDeLancamentos(lancamentos: Lancamento[]): Linha[] {
  return lancamentos.map((lancamento) => {
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
}

/** Exporta APENAS os lançamentos recebidos (já filtrados por quem chama). */
export function exportarExcel(lancamentos: Lancamento[]) {
  const arquivo = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    arquivo,
    criarAba(linhasDeLancamentos(lancamentos), COLUNAS_LANCAMENTOS),
    'Lançamentos',
  )

  XLSX.writeFile(arquivo, 'lancamentos-financeiros.xlsx')
}

// ── Planilha completa (uma aba por módulo) ──────────────────

/** Nome da categoria a partir do id (para abas que só guardam o id). */
function nomeCategoria(categoriaId: string): string {
  return obterCategoria(categoriaId)?.nome ?? 'Sem categoria'
}

function nomeConta(contaId: string | undefined): string {
  return obterConta(contaId)?.nome ?? ''
}

function simNao(valor: boolean): string {
  return valor ? 'Sim' : 'Não'
}

/**
 * Monta o livro com uma aba por módulo do app.
 * Devolve o `WorkBook` do SheetJS (útil para testes e reuso).
 */
export function montarPlanilhaCompleta(): XLSX.WorkBook {
  const { lancamentos } = usarLancamentos()
  const arquivo = XLSX.utils.book_new()

  const abas: { nome: string; colunas: string[]; linhas: Linha[] }[] = [
    {
      nome: 'Lançamentos',
      colunas: COLUNAS_LANCAMENTOS,
      linhas: linhasDeLancamentos(lancamentos.value),
    },
    {
      nome: 'Categorias',
      colunas: ['Categoria', 'Grupo', 'Ícone', 'Cor', 'Subcategorias', 'Ativa'],
      linhas: listarCategorias({ incluirInativas: true }).map((categoria) => ({
        Categoria: categoria.nome,
        Grupo: ROTULOS_GRUPOS[categoria.grupo],
        Ícone: categoria.icone,
        Cor: categoria.cor,
        Subcategorias: categoria.subcategorias.map((sub) => sub.nome).join(', '),
        Ativa: simNao(categoria.ativa),
      })),
    },
    {
      nome: 'Contas',
      colunas: ['Conta', 'Tipo', 'Saldo inicial', 'Ativa', 'Observação'],
      linhas: contas.value.map((conta) => ({
        Conta: conta.nome,
        Tipo: ROTULOS_TIPOS_CONTA[conta.tipo],
        'Saldo inicial': conta.saldoInicial,
        Ativa: simNao(conta.ativa),
        Observação: conta.observacao ?? '',
      })),
    },
    {
      nome: 'Transferências',
      colunas: ['Data', 'Origem', 'Destino', 'Valor', 'Descrição'],
      linhas: transferencias.value.map((transferencia) => ({
        Data: transferencia.data,
        Origem: nomeConta(transferencia.contaOrigemId),
        Destino: nomeConta(transferencia.contaDestinoId),
        Valor: transferencia.valor,
        Descrição: transferencia.descricao ?? '',
      })),
    },
    {
      nome: 'Cartões',
      colunas: [
        'Cartão',
        'Bandeira',
        'Limite',
        'Dia de fechamento',
        'Dia de vencimento',
        'Ativo',
        'Observação',
      ],
      linhas: cartoes.value.map((cartao) => ({
        Cartão: cartao.nome,
        Bandeira: cartao.bandeira ?? '',
        Limite: cartao.limite,
        'Dia de fechamento': cartao.diaFechamento,
        'Dia de vencimento': cartao.diaVencimento,
        Ativo: simNao(cartao.ativo),
        Observação: cartao.observacao ?? '',
      })),
    },
    {
      nome: 'Compras no cartão',
      colunas: [
        'Data da compra',
        'Cartão',
        'Descrição',
        'Categoria',
        'Valor total',
        'Parcelas',
        'Observação',
      ],
      linhas: compras.value.map((compra) => ({
        'Data da compra': compra.dataCompra,
        Cartão: obterCartao(compra.cartaoId)?.nome ?? '',
        Descrição: compra.descricao,
        Categoria: nomeCategoria(compra.categoriaId),
        'Valor total': compra.valorTotal,
        Parcelas: compra.parcelas,
        Observação: compra.observacao ?? '',
      })),
    },
    {
      nome: 'Pagamentos de fatura',
      colunas: ['Data', 'Cartão', 'Mês da fatura', 'Valor', 'Conta'],
      linhas: pagamentosFatura.value.map((pagamento) => ({
        Data: pagamento.data,
        Cartão: obterCartao(pagamento.cartaoId)?.nome ?? '',
        'Mês da fatura': pagamento.mes,
        Valor: pagamento.valor,
        Conta: nomeConta(pagamento.contaId),
      })),
    },
    {
      nome: 'Compromissos',
      colunas: [
        'Descrição',
        'Tipo',
        'Valor',
        'Vencimento',
        'Categoria',
        'Situação',
        'Recorrente',
        'Observação',
      ],
      linhas: compromissos.value.map((compromisso) => ({
        Descrição: compromisso.descricao,
        Tipo: ROTULOS_TIPO_COMPROMISSO[compromisso.tipo],
        Valor: compromisso.valor,
        Vencimento: compromisso.vencimento,
        Categoria: nomeCategoria(compromisso.categoriaId),
        Situação: compromisso.status === 'pago' ? 'Pago' : 'Pendente',
        Recorrente: simNao(compromisso.recorrenteMensal),
        Observação: compromisso.observacao ?? '',
      })),
    },
    {
      nome: 'Orçamentos',
      colunas: ['Mês', 'Categoria', 'Limite', 'Observação'],
      linhas: orcamentos.value.map((orcamento) => ({
        Mês: orcamento.mes,
        Categoria: nomeCategoria(orcamento.categoriaId),
        Limite: orcamento.limite,
        Observação: orcamento.observacao ?? '',
      })),
    },
    {
      nome: 'Metas',
      colunas: ['Meta', 'Valor alvo', 'Valor atual', 'Progresso (%)', 'Prazo', 'Observação'],
      linhas: metas.value.map((meta) => ({
        Meta: meta.nome,
        'Valor alvo': meta.valorAlvo,
        'Valor atual': meta.valorAtual,
        'Progresso (%)': progressoMeta(meta),
        Prazo: meta.prazo ?? '',
        Observação: meta.observacao ?? '',
      })),
    },
    {
      nome: 'Investimentos',
      colunas: [
        'Investimento',
        'Tipo',
        'Data inicial',
        'Valor atual',
        'Rendimento estimado',
        'Atualizado em',
        'Ativo',
        'Observação',
      ],
      linhas: investimentos.value.map((investimento) => ({
        Investimento: investimento.nome,
        Tipo: ROTULOS_TIPOS_INVESTIMENTO[investimento.tipo],
        'Data inicial': investimento.dataInicial,
        'Valor atual': investimento.valorAtual,
        'Rendimento estimado': rendimentoEstimado(investimento.id),
        'Atualizado em': investimento.atualizadoEm,
        Ativo: simNao(investimento.ativo),
        Observação: investimento.observacao ?? '',
      })),
    },
    {
      nome: 'Movimentações',
      colunas: ['Data', 'Investimento', 'Tipo', 'Valor', 'Observação'],
      linhas: movimentacoes.value.map((movimentacao) => ({
        Data: movimentacao.data,
        Investimento: obterInvestimento(movimentacao.investimentoId)?.nome ?? '',
        Tipo: ROTULOS_MOVIMENTACOES[movimentacao.tipo],
        Valor: movimentacao.valor,
        Observação: movimentacao.observacao ?? '',
      })),
    },
    {
      nome: 'Bens',
      colunas: ['Bem', 'Tipo', 'Valor estimado', 'Data de aquisição', 'Observação'],
      linhas: bens.value.map((bem) => ({
        Bem: bem.nome,
        Tipo: ROTULOS_TIPOS_BEM[bem.tipo],
        'Valor estimado': bem.valorEstimado,
        'Data de aquisição': bem.dataAquisicao ?? '',
        Observação: bem.observacao ?? '',
      })),
    },
    {
      nome: 'Dívidas',
      colunas: [
        'Dívida',
        'Tipo',
        'Valor original',
        'Saldo devedor',
        'Parcelas',
        'Parcelas pagas',
        'Valor da parcela',
        'Observação',
      ],
      linhas: dividas.value.map((divida) => ({
        Dívida: divida.nome,
        Tipo: ROTULOS_TIPOS_DIVIDA[divida.tipo],
        'Valor original': divida.valorOriginal,
        'Saldo devedor': divida.saldoDevedor,
        Parcelas: divida.parcelasTotal,
        'Parcelas pagas': divida.parcelasPagas,
        'Valor da parcela': divida.valorParcela,
        Observação: divida.observacao ?? '',
      })),
    },
  ]

  for (const aba of abas) {
    XLSX.utils.book_append_sheet(arquivo, criarAba(aba.linhas, aba.colunas), aba.nome)
  }

  return arquivo
}

/** Baixa uma planilha única com uma aba para cada módulo do app. */
export function exportarTudoExcel(): void {
  XLSX.writeFile(montarPlanilhaCompleta(), `dados-financeiros-${dataHoje()}.xlsx`)
}
