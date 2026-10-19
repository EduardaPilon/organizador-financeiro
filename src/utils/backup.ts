import {
  LIMITE_ARQUIVO_BYTES,
  aplicarTudo,
  chavesRegistradas,
  coletarTudo,
} from '@/stores/persistencia'

/**
 * Cópia de segurança em JSON — arquivo simples, legível, gerado E lido
 * apenas no seu computador (nenhuma rede envolvida).
 *
 * Estrutura: { app, versao, emitidoEm, dados } onde `dados` é o snapshot
 * de todos os módulos (lançamentos, categorias, ...).
 */

export interface CopiaSeguranca {
  app: string
  versao: 1
  emitidoEm: string
  dados: Record<string, unknown>
}

const IDENTIFICADOR_APP = 'organizador-financeiro'

export function montarCopia(): CopiaSeguranca {
  return {
    app: IDENTIFICADOR_APP,
    versao: 1,
    emitidoEm: new Date().toISOString(),
    dados: coletarTudo(),
  }
}

/** Baixa a cópia como arquivo .json no formato YYYY-MM-DD. */
export function baixarCopia(): void {
  const copia = montarCopia()
  const data = copia.emitidoEm.slice(0, 10)
  const blob = new Blob([JSON.stringify(copia, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `backup-financeiro-${data}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Lê um arquivo .json e devolve a cópia validada.
 * Lança Error com mensagem amigável para qualquer problema.
 */
export async function lerArquivoCopia(arquivo: File): Promise<CopiaSeguranca> {
  if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
    throw new Error('O arquivo é grande demais para ser uma cópia deste app.')
  }

  let texto: string
  try {
    texto = await arquivo.text()
  } catch {
    throw new Error('Não foi possível ler o arquivo selecionado.')
  }

  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }

  return validarCopia(bruto)
}

/** Valida a estrutura da cópia; lança Error amigável se inválida. */
export function validarCopia(bruto: unknown): CopiaSeguranca {
  if (typeof bruto !== 'object' || bruto === null) {
    throw new Error('A cópia não contém um objeto válido.')
  }

  const copia = bruto as Partial<CopiaSeguranca>

  if (copia.app !== IDENTIFICADOR_APP) {
    throw new Error(
      'Este arquivo não é uma cópia de segurança deste aplicativo.',
    )
  }
  if (copia.versao !== 1) {
    throw new Error(
      `Cópia criada por uma versão incompatível (v${String(copia.versao)}).`,
    )
  }
  if (typeof copia.dados !== 'object' || copia.dados === null) {
    throw new Error('A cópia não contém dados.')
  }

  return {
    app: IDENTIFICADOR_APP,
    versao: 1,
    emitidoEm:
      typeof copia.emitidoEm === 'string' ? copia.emitidoEm : new Date().toISOString(),
    dados: copia.dados,
  }
}

/**
 * Restaura a cópia nos stores registrados.
 * Chaves desconhecidas são ignoradas (tolerância a versões antigas).
 */
export function restaurarCopia(copia: CopiaSeguranca): {
  aplicadas: string[]
  ignoradas: string[]
} {
  const reconhecidas = new Set(chavesRegistradas())
  const aplicadas = aplicarTudo(copia.dados)
  const ignoradas = Object.keys(copia.dados).filter(
    (chave) => !reconhecidas.has(chave),
  )
  return { aplicadas, ignoradas }
}
