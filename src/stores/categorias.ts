import { ref } from 'vue'
import type { TipoLancamento } from './lancamentos'
import { registrarEstado } from './persistencia'
import { PALETA, RAMPA } from '@/styles/paleta'

/**
 * Privacidade: as categorias ficam em memória por padrão, como os
 * lançamentos. O salvamento local (IndexedDB) só ocorre com consentimento
 * explícito no banner de privacidade — ver stores/persistencia.
 *
 * Cores: as categorias do catálogo padrão usam as rampas da paleta oficial
 * (styles/paleta.ts) — o grupo define a família de cor
 * (receita = verde, essenciais = azul, pessoais = coral, financeiras =
 * coral escuro, investimentos = teal). O usuário pode trocar a cor de
 * qualquer categoria; a cor escolhida é um DADO e é preservada.
 */

export type GrupoCategoria =
  | 'receita'
  | 'despesa_essencial'
  | 'despesa_pessoal'
  | 'despesa_financeira'
  | 'investimento'

export const ROTULOS_GRUPOS: Record<GrupoCategoria, string> = {
  receita: 'Receitas',
  despesa_essencial: 'Despesas essenciais',
  despesa_pessoal: 'Despesas pessoais',
  despesa_financeira: 'Despesas financeiras',
  investimento: 'Investimentos',
}

/**
 * Cor "identidade" de cada grupo — usada em marcadores de seção e como cor
 * sugerida para categorias novas. Vem sempre da paleta oficial.
 */
export const COR_DO_GRUPO: Record<GrupoCategoria, string> = {
  receita: PALETA.verde,
  despesa_essencial: PALETA.azul,
  despesa_pessoal: PALETA.coral,
  despesa_financeira: RAMPA.coralEscuro[0],
  investimento: PALETA.teal,
}

export const ORDEM_GRUPOS: GrupoCategoria[] = [
  'receita',
  'despesa_essencial',
  'despesa_pessoal',
  'despesa_financeira',
  'investimento',
]

export function ehReceita(grupo: GrupoCategoria): boolean {
  return grupo === 'receita'
}

export function ehDespesa(grupo: GrupoCategoria): boolean {
  return grupo === 'despesa_essencial'
    || grupo === 'despesa_pessoal'
    || grupo === 'despesa_financeira'
}

export function ehInvestimento(grupo: GrupoCategoria): boolean {
  return grupo === 'investimento'
}

export interface Subcategoria {
  id: string
  nome: string
  ativa: boolean
}

export interface Categoria {
  id: string
  nome: string
  /** Cor hexadecimal da paleta oficial, ex.: a cor base do verde */
  cor: string
  /** Ícone curto (emoji ou símbolo) exibido junto ao nome */
  icone: string
  grupo: GrupoCategoria
  subcategorias: Subcategoria[]
  ativa: boolean
}

export type NovaCategoria = {
  nome: string
  cor: string
  icone: string
  grupo: GrupoCategoria
  /** Nomes das subcategorias; os ids são gerados automaticamente */
  subcategorias?: string[]
}

function gerarId(): string {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function criarSubcategorias(nomes: string[]): Subcategoria[] {
  return nomes.map((nome) => ({
    id: `${gerarId()}-${nome.length}`,
    nome,
    ativa: true,
  }))
}

/**
 * Catálogo padrão com as categorias sugeridas.
 * Pode ser personalizado (cores, ícones, nomes) e ampliado pelo usuário.
 */
const CATALOGO_PADRAO: Categoria[] = [
  // ── Receitas ──────────────────────────────────────────────
  {
    id: 'rec-salario',
    nome: 'Salário e estágio',
    cor: RAMPA.verde[0],
    icone: '💼',
    grupo: 'receita',
    subcategorias: criarSubcategorias(['Salário', 'Estágio']),
    ativa: true,
  },
  {
    id: 'rec-renda-extra',
    nome: 'Renda extra',
    cor: RAMPA.verde[1],
    icone: '✨',
    grupo: 'receita',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'rec-freelances',
    nome: 'Freelances',
    cor: RAMPA.verde[2],
    icone: '💻',
    grupo: 'receita',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'rec-vendas',
    nome: 'Vendas',
    cor: RAMPA.verde[3],
    icone: '🏷️',
    grupo: 'receita',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'rec-rendimentos',
    nome: 'Rendimentos de investimentos',
    cor: RAMPA.verde[4],
    icone: '📈',
    grupo: 'receita',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'rec-cashback',
    nome: 'Cashback e reembolsos',
    cor: RAMPA.verde[5],
    icone: '💸',
    grupo: 'receita',
    subcategorias: criarSubcategorias(['Cashback', 'Reembolsos']),
    ativa: true,
  },
  {
    id: 'rec-outros',
    nome: 'Outras receitas',
    cor: PALETA.neutro,
    icone: '➕',
    grupo: 'receita',
    subcategorias: [],
    ativa: true,
  },

  // ── Despesas essenciais ───────────────────────────────────
  {
    id: 'ess-moradia',
    nome: 'Moradia',
    cor: RAMPA.azul[0],
    icone: '🏠',
    grupo: 'despesa_essencial',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'ess-utilidades',
    nome: 'Água, energia, internet e gás',
    cor: RAMPA.azul[1],
    icone: '💡',
    grupo: 'despesa_essencial',
    subcategorias: criarSubcategorias(['Água', 'Energia', 'Internet', 'Gás']),
    ativa: true,
  },
  {
    id: 'ess-supermercado',
    nome: 'Supermercado e alimentação',
    cor: RAMPA.azul[2],
    icone: '🛒',
    grupo: 'despesa_essencial',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'ess-transporte',
    nome: 'Transporte e combustível',
    cor: RAMPA.azul[3],
    icone: '🚗',
    grupo: 'despesa_essencial',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'ess-saude',
    nome: 'Saúde e medicamentos',
    cor: RAMPA.azul[4],
    icone: '💊',
    grupo: 'despesa_essencial',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'ess-educacao',
    nome: 'Educação e cursos',
    cor: RAMPA.azul[5],
    icone: '🎓',
    grupo: 'despesa_essencial',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'ess-servicos',
    nome: 'Serviços e assinaturas',
    cor: RAMPA.azul[6],
    icone: '🔁',
    grupo: 'despesa_essencial',
    subcategorias: [],
    ativa: true,
  },

  // ── Despesas pessoais ─────────────────────────────────────
  {
    id: 'pes-restaurantes',
    nome: 'Restaurantes e lanches',
    cor: RAMPA.coral[0],
    icone: '🍽️',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-delivery',
    nome: 'Delivery',
    cor: RAMPA.coral[1],
    icone: '🛵',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-roupas',
    nome: 'Roupas e acessórios',
    cor: RAMPA.coral[2],
    icone: '👕',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-beleza',
    nome: 'Beleza e cuidados pessoais',
    cor: RAMPA.coral[3],
    icone: '💄',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-lazer',
    nome: 'Entretenimento e lazer',
    cor: RAMPA.coral[4],
    icone: '🎬',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-viagens',
    nome: 'Viagens',
    cor: RAMPA.coral[5],
    icone: '✈️',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-presentes',
    nome: 'Presentes',
    cor: RAMPA.coral[6],
    icone: '🎁',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-pets',
    nome: 'Pets',
    cor: RAMPA.coral[7],
    icone: '🐾',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'pes-compras',
    nome: 'Compras diversas',
    cor: RAMPA.coral[8],
    icone: '🛍️',
    grupo: 'despesa_pessoal',
    subcategorias: [],
    ativa: true,
  },

  // ── Despesas financeiras ──────────────────────────────────
  {
    id: 'fin-tarifas',
    nome: 'Tarifas',
    cor: RAMPA.coralEscuro[0],
    icone: '🧾',
    grupo: 'despesa_financeira',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'fin-juros',
    nome: 'Juros e multas',
    cor: RAMPA.coralEscuro[1],
    icone: '⚠️',
    grupo: 'despesa_financeira',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'fin-impostos',
    nome: 'Impostos',
    cor: PALETA.coral,
    icone: '🏛️',
    grupo: 'despesa_financeira',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'fin-outras',
    nome: 'Outras despesas financeiras',
    cor: PALETA.neutro,
    icone: '🔻',
    grupo: 'despesa_financeira',
    subcategorias: [],
    ativa: true,
  },

  // ── Investimentos ─────────────────────────────────────────
  {
    id: 'inv-reserva',
    nome: 'Reserva de emergência',
    cor: RAMPA.teal[0],
    icone: '🛟',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-cdb',
    nome: 'CDB e RDB',
    cor: RAMPA.teal[1],
    icone: '🏦',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-tesouro',
    nome: 'Tesouro Direto',
    cor: RAMPA.teal[2],
    icone: '🪙',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-acoes',
    nome: 'Ações',
    cor: RAMPA.teal[3],
    icone: '📊',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-fii',
    nome: 'Fundos imobiliários',
    cor: RAMPA.teal[4],
    icone: '🏢',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-etf',
    nome: 'ETFs',
    cor: RAMPA.teal[5],
    icone: '🧺',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-fundos',
    nome: 'Fundos de investimento',
    cor: RAMPA.teal[6],
    icone: '🗂️',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-previdencia',
    nome: 'Previdência privada',
    cor: RAMPA.teal[7],
    icone: '🛡️',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-cripto',
    nome: 'Criptomoedas',
    cor: PALETA.coral,
    icone: '₿',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
  {
    id: 'inv-outros',
    nome: 'Outros investimentos',
    cor: PALETA.neutro,
    icone: '🔀',
    grupo: 'investimento',
    subcategorias: [],
    ativa: true,
  },
]

function clonarCatalogo(): Categoria[] {
  return CATALOGO_PADRAO.map((categoria) => ({
    ...categoria,
    subcategorias: categoria.subcategorias.map((sub) => ({ ...sub })),
  }))
}

export const categorias = ref<Categoria[]>(clonarCatalogo())

export interface OpcoesFiltro {
  grupo?: GrupoCategoria
  incluirInativas?: boolean
}

export function listarCategorias(opcoes: OpcoesFiltro = {}): Categoria[] {
  return categorias.value.filter((categoria) => {
    if (opcoes.grupo && categoria.grupo !== opcoes.grupo) return false
    if (!opcoes.incluirInativas && !categoria.ativa) return false
    return true
  })
}

export function obterCategoria(id: string): Categoria | undefined {
  return categorias.value.find((categoria) => categoria.id === id)
}

export function obterSubcategoria(
  categoriaId: string,
  subcategoriaId: string,
): Subcategoria | undefined {
  return obterCategoria(categoriaId)?.subcategorias.find(
    (sub) => sub.id === subcategoriaId,
  )
}

// ── Consultas por tipo de movimentação ─────────────────────
// Compartilhadas pelos formulários de lançamento para oferecer
// apenas grupos, categorias e subcategorias compatíveis com o tipo.

/** Grupos de categoria aplicáveis a um tipo (receita ou despesa). */
export function listarGruposDoTipo(tipo: TipoLancamento): GrupoCategoria[] {
  return ORDEM_GRUPOS.filter((grupo) =>
    tipo === 'receita' ? ehReceita(grupo) : ehDespesa(grupo),
  )
}

/** Categorias ativas aplicáveis a um tipo (receita ou despesa). */
export function listarCategoriasDoTipo(tipo: TipoLancamento): Categoria[] {
  return listarCategorias().filter((categoria) =>
    tipo === 'receita'
      ? ehReceita(categoria.grupo)
      : ehDespesa(categoria.grupo),
  )
}

/** Subcategorias ativas de uma categoria. */
export function listarSubcategoriasAtivas(categoriaId: string): Subcategoria[] {
  return (
    obterCategoria(categoriaId)?.subcategorias.filter((sub) => sub.ativa) ?? []
  )
}

export function adicionarCategoria(dados: NovaCategoria): Categoria {
  const categoria: Categoria = {
    id: gerarId(),
    nome: dados.nome.trim(),
    cor: dados.cor,
    icone: dados.icone.trim(),
    grupo: dados.grupo,
    subcategorias: criarSubcategorias(dados.subcategorias ?? []),
    ativa: true,
  }

  categorias.value.push(categoria)
  return categoria
}

export function atualizarCategoria(
  id: string,
  dadosParciais: Partial<Pick<Categoria, 'nome' | 'cor' | 'icone'>>,
): void {
  const categoria = obterCategoria(id)
  if (!categoria) return

  if (dadosParciais.nome !== undefined) {
    categoria.nome = dadosParciais.nome.trim()
  }
  if (dadosParciais.cor !== undefined) categoria.cor = dadosParciais.cor
  if (dadosParciais.icone !== undefined) {
    categoria.icone = dadosParciais.icone.trim()
  }
}

export function alternarAtivaCategoria(id: string): void {
  const categoria = obterCategoria(id)
  if (categoria) categoria.ativa = !categoria.ativa
}

export function removerCategoria(id: string): void {
  const indice = categorias.value.findIndex((categoria) => categoria.id === id)
  if (indice !== -1) categorias.value.splice(indice, 1)
}

export function adicionarSubcategoria(
  categoriaId: string,
  nome: string,
): void {
  const categoria = obterCategoria(categoriaId)
  const nomeLimpo = nome.trim()
  if (!categoria || !nomeLimpo) return

  categoria.subcategorias.push({
    id: gerarId(),
    nome: nomeLimpo,
    ativa: true,
  })
}

export function renomearSubcategoria(
  categoriaId: string,
  subcategoriaId: string,
  nome: string,
): void {
  const subcategoria = obterSubcategoria(categoriaId, subcategoriaId)
  const nomeLimpo = nome.trim()
  if (!subcategoria || !nomeLimpo) return

  subcategoria.nome = nomeLimpo
}

export function removerSubcategoria(
  categoriaId: string,
  subcategoriaId: string,
): void {
  const categoria = obterCategoria(categoriaId)
  if (!categoria) return

  const indice = categoria.subcategorias.findIndex(
    (sub) => sub.id === subcategoriaId,
  )
  if (indice !== -1) categoria.subcategorias.splice(indice, 1)
}

export function limparSessaoCategorias() {
  categorias.value = clonarCatalogo()
}

export function usarCategorias() {
  return { categorias }
}

// ── Persistência local opcional (com consentimento) ─────────
function ehSubcategoriaValida(dado: unknown): dado is Subcategoria {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Subcategoria>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.ativa === 'boolean'
  )
}

function ehCategoriaValida(dado: unknown): dado is Categoria {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Categoria>
  if (
    typeof item.id !== 'string' ||
    typeof item.nome !== 'string' ||
    typeof item.cor !== 'string' ||
    typeof item.icone !== 'string' ||
    !ORDEM_GRUPOS.includes(item.grupo as GrupoCategoria)
  ) {
    return false
  }
  item.subcategorias = Array.isArray(item.subcategorias)
    ? item.subcategorias.filter(ehSubcategoriaValida)
    : []
  item.ativa = typeof item.ativa === 'boolean' ? item.ativa : true
  return true
}

registrarEstado({
  chave: 'categorias',
  coletar: () => categorias.value,
  aplicar: (dados) => {
    if (!Array.isArray(dados)) return
    const validas = dados.filter(ehCategoriaValida)
    // Lista vazia nunca substitui o catálogo (protege contra cópia truncada).
    if (validas.length > 0) categorias.value = validas
  },
  limpar: () => {
    categorias.value = clonarCatalogo()
  },
})
