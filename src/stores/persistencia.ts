import Dexie, { type Table } from 'dexie'
import { ref, watchEffect } from 'vue'
import { notificar } from './notificacoes'

/**
 * Persistência local OPCIONAL com consentimento explícito.
 *
 * Regras de privacidade desta camada:
 * - Dado financeiro só entra no IndexedDB DEPOIS que a pessoa ativa
 *   o salvamento por um clique (botão no banner de privacidade).
 * - O consentimento (uma flag) fica em localStorage — é preferência
 *   simples, nunca dado financeiro.
 * - Sem consentimento, o banco NEM É ABERTO (nada é criado).
 * - Nada é enviado pela internet: Dexie = IndexedDB puro do navegador.
 * - "Esquecer dados locais" apaga o banco e remove a flag.
 *
 * Padrão: cada store registra-se aqui { chave, coletar, aplicar, limpar }.
 * O registro torna o store conhecido pela hidratação (ao carregar) e pelo
 * salvamento automático (watchEffect por store, com debounce).
 */

export interface RegistroPersistencia {
  /** Nome único do estado (ex.: 'lancamentos'). */
  chave: string
  /** Devolve o estado atual serializável. */
  coletar: () => unknown
  /** Restaura um estado vindo do banco (validação defensiva interna). */
  aplicar: (dados: unknown) => void
  /** Zera o estado em memória (encerrar sessão). */
  limpar: () => void
}

const CHAVE_CONSENTIMENTO = 'consentimento-salvamento-local'
const ATRASO_GRAVACAO_MS = 400
const TAMANHO_MAX_BACKUP = 10 * 1024 * 1024 // 10 MB — cota generosa p/ JSON

/** Estado do salvamento local, reativo para a interface. */
export const salvamentoAtivo = ref(false)
/** Mensagem do último erro de gravação/leitura (null = sem erro). */
export const erroSalvamento = ref<string | null>(null)

// ── Banco (só existe com consentimento) ─────────────────────
interface RegistroEstado {
  chave: string
  dados: unknown
}

class BancoFinanceiro extends Dexie {
  estados!: Table<RegistroEstado, string>

  constructor() {
    super('organizador-financeiro')
    this.version(1).stores({ estados: 'chave' })
  }
}

let banco: BancoFinanceiro | null = null

function lerConsentimento(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO) === 'sim'
  } catch {
    return false
  }
}

function gravarConsentimento(): void {
  localStorage.setItem(CHAVE_CONSENTIMENTO, 'sim')
}

function removerConsentimento(): void {
  localStorage.removeItem(CHAVE_CONSENTIMENTO)
}

// ── Registro dos stores ─────────────────────────────────────
const registros: RegistroPersistencia[] = []
/** Snapshot vindo do banco, usado por stores que se registram depois. */
let dadosHidratados: Record<string, unknown> = {}
let hidratado = false

export function registrarEstado(registro: RegistroPersistencia): void {
  registros.push(registro)

  // Store registrado DEPOIS da hidratação: aplica o que veio do banco.
  if (hidratado && registro.chave in dadosHidratados) {
    registro.aplicar(dadosHidratados[registro.chave])
  }

  // Observa as mudanças DESTE store (coletar() acessa os refs → rastreia).
  watchEffect(() => {
    const dados = registro.coletar()
    if (!salvamentoAtivo.value || !hidratado) return
    agendarGravacao(registro.chave, dados)
  })
}

// ── Gravação com debounce ───────────────────────────────────
const pendencias = new Map<string, unknown>()
let temporizador: ReturnType<typeof setTimeout> | null = null

function agendarGravacao(chave: string, dados: unknown): void {
  pendencias.set(chave, dados)
  if (temporizador !== null) clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    temporizador = null
    void gravarPendencias()
  }, ATRASO_GRAVACAO_MS)
}

async function gravarPendencias(): Promise<void> {
  if (!banco || pendencias.size === 0) return
  const registrosParaGravar: RegistroEstado[] = [...pendencias.entries()].map(
    ([chave, dados]) => ({ chave, dados }),
  )
  pendencias.clear()

  try {
    await banco.estados.bulkPut(registrosParaGravar)
  } catch {
    erroSalvamento.value =
      'Não foi possível salvar neste navegador (espaço cheio ou modo restrito).'
    notificar(
      'O navegador recusou a gravação local. Faça uma cópia de segurança (.json) para não perder os dados.',
      'erro',
    )
  }
}

// ── Ciclo de vida ───────────────────────────────────────────

/** Chama uma vez, após montar o app. Idempotente. */
export async function iniciarPersistencia(): Promise<void> {
  if (!lerConsentimento()) {
    salvamentoAtivo.value = false
    hidratado = true
    return
  }

  try {
    banco = new BancoFinanceiro()
    const linhas = await banco.estados.toArray()
    for (const linha of linhas) dadosHidratados[linha.chave] = linha.dados

    salvamentoAtivo.value = true
    hidratado = true

    // Aplica nos stores já registrados (os demais recebem ao se registrar).
    for (const registro of registros) {
      if (registro.chave in dadosHidratados) {
        registro.aplicar(dadosHidratados[registro.chave])
      }
    }
  } catch {
    erroSalvamento.value =
      'O navegador bloqueou o acesso ao armazenamento local (modo privado?).'
    hidratado = true
    notificar(
      'Não foi possível ler a cópia local salva. Os dados em memória continuam disponíveis.',
      'erro',
    )
  }
}

/** Ativa o salvamento local e grava o estado atual de imediato. */
export async function ativarSalvamento(): Promise<void> {
  gravarConsentimento()
  banco = banco ?? new BancoFinanceiro()
  salvamentoAtivo.value = true

  for (const registro of registros) {
    pendencias.set(registro.chave, registro.coletar())
  }
  await gravarPendencias()
}

/**
 * Apaga a cópia local (IndexedDB) e revoga o consentimento.
 * Os dados EM MEMÓRIA permanecem — só a cópia salva é destruída.
 */
export async function esquecerDadosLocais(): Promise<void> {
  salvamentoAtivo.value = false
  hidratado = false
  pendencias.clear()
  if (temporizador !== null) {
    clearTimeout(temporizador)
    temporizador = null
  }

  const bancoAnterior = banco
  banco = null
  dadosHidratados = {}
  removerConsentimento()

  try {
    if (bancoAnterior) {
      bancoAnterior.close()
      await bancoAnterior.delete()
    } else {
      // Nunca aberto neste ciclo: apaga caso exista de uma sessão anterior.
      await Dexie.delete('organizador-financeiro')
    }
  } catch {
    // Delete recusado (raro): a flag já foi removida, então nada mais será gravado.
  }

  hidratado = true
}

/** Zera TODOS os estados registrados em memória (encerrar sessão). */
export function limparTudoNaMemoria(): void {
  for (const registro of registros) registro.limpar()
}

// ── API para backup externo (.json) ─────────────────────────

/** Snapshot de todos os stores registrados. */
export function coletarTudo(): Record<string, unknown> {
  const dados: Record<string, unknown> = {}
  for (const registro of registros) dados[registro.chave] = registro.coletar()
  return dados
}

/** Aplica um snapshot validado nos stores registrados. */
export function aplicarTudo(dados: Record<string, unknown>): string[] {
  const aplicadas: string[] = []
  for (const registro of registros) {
    if (registro.chave in dados) {
      registro.aplicar(dados[registro.chave])
      aplicadas.push(registro.chave)
    }
  }
  return aplicadas
}

/** Chaves dos stores atualmente conhecidos. */
export function chavesRegistradas(): string[] {
  return registros.map((registro) => registro.chave)
}

export const LIMITE_ARQUIVO_BYTES = TAMANHO_MAX_BACKUP
