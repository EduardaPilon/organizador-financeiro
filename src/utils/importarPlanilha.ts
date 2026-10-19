import * as XLSX from 'xlsx'
import { arredondar2, paraNumero } from './moeda'

/**
 * Leitura e conversão de planilhas (XLSX/XLS/CSV) 100% local.
 * O arquivo nunca sai do computador: lido via FileReader do navegador.
 *
 * Todas as funções são puras/testáveis; `lerPlanilha` é a única assíncrona
 * (depende apenas do arquivo escolhido).
 */

export const TAMANHO_MAX_ARQUIVO = 5 * 1024 * 1024 // 5 MB

export type CelulaPlanilha = string | number | boolean | Date | null

export interface ArquivoLido {
  nomeArquivo: string
  abas: string[]
  aba: string
  colunas: string[]
  linhas: Record<string, CelulaPlanilha>[]
}

/** Lê .xlsx/.xls/.csv (SheetJS, client-side) e devolve a primeira aba útil. */
export async function lerPlanilha(
  arquivo: File,
  abaDesejada?: string,
): Promise<ArquivoLido> {
  if (arquivo.size > TAMANHO_MAX_ARQUIVO) {
    throw new Error('O arquivo é maior que o limite de 5 MB.')
  }

  let buffer: ArrayBuffer
  try {
    buffer = await arquivo.arrayBuffer()
  } catch {
    throw new Error('Não foi possível ler o arquivo selecionado.')
  }

  let livro: XLSX.WorkBook
  try {
    livro = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch {
    throw new Error('Formato não reconhecido. Use arquivos .xlsx, .xls ou .csv.')
  }

  if (livro.SheetNames.length === 0) {
    throw new Error('O arquivo não contém abas.')
  }

  const aba =
    abaDesejada && livro.SheetNames.includes(abaDesejada)
      ? abaDesejada
      : (livro.SheetNames[0] as string)

  const planilha = livro.Sheets[aba]
  if (!planilha) throw new Error('Aba não encontrada no arquivo.')

  const linhas = XLSX.utils.sheet_to_json<Record<string, CelulaPlanilha>>(
    planilha,
    { defval: null, raw: true },
  )

  if (linhas.length === 0) {
    throw new Error('A aba selecionada está vazia.')
  }

  return {
    nomeArquivo: arquivo.name,
    abas: livro.SheetNames,
    aba,
    colunas: Object.keys(linhas[0] ?? {}),
    linhas,
  }
}

// ── Mapeamento de colunas ───────────────────────────────────

export interface Mapeamento {
  /** Coluna com a data do lançamento. */
  data: string | null
  /** Coluna com a descrição/histórico. */
  descricao: string | null
  /** Coluna com o valor monetário. */
  valor: string | null
  /** Coluna opcional com o tipo (receita/despesa). */
  tipo: string | null
  /** Coluna opcional com o nome da categoria. */
  categoria: string | null
}

const REGRAS_DETECCAO: Record<keyof Mapeamento, RegExp> = {
  data: /data|date|dia/i,
  descricao: /descri|hist[oó]rico|memo|lan[çc]amento|t[ií]tulo|nome/i,
  valor: /valor|montante|quantia|amount|total/i,
  tipo: /tipo|natureza/i,
  categoria: /categoria|category|grupo/i,
}

/** Chute inicial do mapeamento a partir dos cabeçalhos (editável). */
export function detectarMapeamento(colunas: string[]): Mapeamento {
  const mapa: Mapeamento = {
    data: null,
    descricao: null,
    valor: null,
    tipo: null,
    categoria: null,
  }
  const usadas = new Set<string>()

  for (const campo of ['data', 'descricao', 'valor', 'tipo', 'categoria'] as const) {
    const achada = colunas.find(
      (coluna) => !usadas.has(coluna) && REGRAS_DETECCAO[campo].test(coluna),
    )
    if (achada) {
      mapa[campo] = achada
      usadas.add(achada)
    }
  }

  return mapa
}

// ── Conversão de células ────────────────────────────────────

function isoLocal(ano: number, mes: number, dia: number): string | null {
  const data = new Date(ano, mes - 1, dia)
  const valida =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia
  if (!valida) return null
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/**
 * Converte qualquer célula de data em ISO "AAAA-MM-DD".
 * Aceita: Date (Excel), número serial do Excel, "AAAA-MM-DD",
 * "DD/MM/AAAA" (brasileiro) e "MM/DD/AAAA" (americano, só quando o
 * formato brasileiro seria impossível).
 */
export function paraDataCelula(valor: CelulaPlanilha | undefined): string | null {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean') return null

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return isoLocal(valor.getFullYear(), valor.getMonth() + 1, valor.getDate())
  }

  if (typeof valor === 'number' && valor > 0) {
    // Serial do Excel: 1 = 01/01/1900 (com o desvio histórico do leap bug).
    const milis = Date.UTC(1899, 11, 30) + Math.round(valor) * 86_400_000
    const data = new Date(milis)
    return isoLocal(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate())
  }

  const texto = String(valor).trim()

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(texto)
  if (iso) {
    const [, a, m, d] = iso
    return isoLocal(Number(a), Number(m), Number(d))
  }

  const barras = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(texto)
  if (barras) {
    const [, p1, p2, ano] = barras
    const brasileira = isoLocal(Number(ano), Number(p2), Number(p1))
    if (brasileira) return brasileira
    // Ex.: 04/13/2026 não existe como dia/mês → tenta mês/dia.
    return isoLocal(Number(ano), Number(p1), Number(p2))
  }

  return null
}

/**
 * Converte qualquer célula monetária em número ABSOLUTO.
 * Aceita: number, "1.234,56", "1234.56", "R$ 1.234,56", "(1.234,56)" (nega),
 * "-1234.56". Devolve null quando não é número.
 */
export function paraValorCelula(valor: CelulaPlanilha | undefined): number | null {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean') return null

  if (valor instanceof Date) return null

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? arredondar2(Math.abs(valor)) : null
  }

  let texto = String(valor).trim()
  let negativo = false

  if (/^\(.*\)$/.test(texto)) {
    negativo = true
    texto = texto.slice(1, -1)
  }
  if (texto.startsWith('-')) {
    negativo = true
    texto = texto.slice(1)
  }

  const numero = paraNumero(texto)
  if (numero === null) return null

  return negativo ? Math.abs(numero) : numero
}

/** Se a célula indica receita/despesa. */
export function paraTipoCelula(
  valor: CelulaPlanilha | undefined,
): 'receita' | 'despesa' | null {
  if (valor === null || valor === '' || typeof valor !== 'string') return null
  const texto = valor.trim().toLowerCase()
  if (/receita|cr[ée]dito|entrad|ganho|dep[oó]sito|\/r\b/.test(texto)) {
    return 'receita'
  }
  if (/despesa|d[ée]bito|sa[íi]da|pagamento|compra|\/d\b/.test(texto)) {
    return 'despesa'
  }
  return null
}

// ── Conversão em lote ───────────────────────────────────────

export interface LinhaConvertida {
  /** Número da linha na planilha (1 = cabeçalho). */
  numeroLinha: number
  descricao: string
  /** Valor absoluto (o sinal vira tipo). */
  valor: number
  tipo: 'receita' | 'despesa'
  /** Data ISO "AAAA-MM-DD". */
  data: string
  /** Nome da categoria na planilha (null quando ausente). */
  categoriaNome: string | null
}

export interface ErroConversao {
  numeroLinha: number
  motivo: string
}

export interface ResultadoConversao {
  convertidos: LinhaConvertida[]
  erros: ErroConversao[]
}

/**
 * Converte as linhas lidas usando o mapeamento escolhido.
 *
 * Regra de tipo quando NÃO há coluna de tipo: valores negativos viram
 * despesas e positivos receitas ( convenção de extratos bancários).
 * A prévia mostra o resultado antes da confirmação — revise antes de importar.
 */
export function converterLinhas(
  linhas: Record<string, CelulaPlanilha>[],
  mapeamento: Mapeamento,
): ResultadoConversao {
  if (!mapeamento.data || !mapeamento.descricao || !mapeamento.valor) {
    throw new Error('Mapeie as colunas de data, descrição e valor para continuar.')
  }

  // Cópias locais: o TypeScript não sustenta o estreitamento dentro do
  // callback do forEach (propriedades mutáveis do parâmetro).
  const colunaData = mapeamento.data
  const colunaDescricao = mapeamento.descricao
  const colunaValor = mapeamento.valor
  const colunaTipo = mapeamento.tipo
  const colunaCategoria = mapeamento.categoria

  const convertidos: LinhaConvertida[] = []
  const erros: ErroConversao[] = []

  linhas.forEach((linha, indice) => {
    const numeroLinha = indice + 2 // a linha 1 é o cabeçalho

    const data = paraDataCelula(linha[colunaData])
    if (!data) {
      erros.push({ numeroLinha, motivo: 'Data vazia ou inválida.' })
      return
    }

    const valorCelula = linha[colunaValor]
    const valor = paraValorCelula(valorCelula)
    if (valor === null || valor === 0) {
      erros.push({ numeroLinha, motivo: 'Valor vazio ou inválido.' })
      return
    }

    const descricao = String(linha[colunaDescricao] ?? '').trim()
    if (!descricao) {
      erros.push({ numeroLinha, motivo: 'Descrição vazia.' })
      return
    }

    const tipoDetectado = paraTipoCelula(colunaTipo ? linha[colunaTipo] : null)
    const tipo: 'receita' | 'despesa' =
      tipoDetectado ??
      (typeof valorCelula === 'number' && valorCelula < 0 ? 'despesa' : 'receita')

    const categoriaCelula = colunaCategoria ? linha[colunaCategoria] : null
    const categoriaNome =
      categoriaCelula === null || categoriaCelula === undefined
        ? null
        : String(categoriaCelula).trim() || null

    convertidos.push({ numeroLinha, descricao, valor, tipo, data, categoriaNome })
  })

  return { convertidos, erros }
}
