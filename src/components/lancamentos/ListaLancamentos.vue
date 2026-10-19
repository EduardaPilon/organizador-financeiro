<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ROTULOS_GRUPOS,
  listarCategorias,
  listarCategoriasDoTipo,
  listarGruposDoTipo,
  listarSubcategoriasAtivas,
  obterCategoria,
  obterSubcategoria,
} from '@/stores/categorias'
import {
  atualizarLancamento,
  removerLancamento,
  usarLancamentos,
  type Lancamento,
  type TipoLancamento,
} from '@/stores/lancamentos'
import { notificar } from '@/stores/notificacoes'
import { listarContas } from '@/stores/contas'
import { formatarMoeda } from '@/utils/formatar'
import { exportarExcel } from '@/utils/exportarExcel'
import { exportarCSV } from '@/utils/exportarCSV'
import { validarLancamento } from '@/utils/validacao'
import { resumirPorMes, somarPorTipo } from '@/utils/resumos'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'
import ResumoMensal from './ResumoMensal.vue'

const { lancamentos } = usarLancamentos()

/** Contas ativas para vincular lançamentos na edição. */
const contasDisponiveis = computed(() => listarContas())

/** Exporta exatamente o que está visível com os filtros atuais. */
function baixarExcel() {
  exportarExcel(lancamentosFiltrados.value)
  notificar('Planilha Excel gerada com os lançamentos filtrados.')
}

function baixarCSV() {
  exportarCSV(lancamentosFiltrados.value)
  notificar('Arquivo CSV gerado com os lançamentos filtrados.')
}

function rotuloCategoria(id: string): string {
  const categoria = obterCategoria(id)
  return categoria ? `${categoria.icone} ${categoria.nome}` : 'Sem categoria'
}

function rotuloSubcategoria(categoriaIdValor: string, subId?: string): string {
  if (!subId) return ''
  return obterSubcategoria(categoriaIdValor, subId)?.nome ?? ''
}

// ── Pesquisa, filtros e ordenação ──────────────────────────
type OrdemLista = 'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'

const busca = ref('')
const filtroTipo = ref<'todos' | TipoLancamento>('todos')
const filtroCategoria = ref('')
const filtroDe = ref('')
const filtroAte = ref('')
const ordem = ref<OrdemLista>('data_desc')

const OPCOES_ORDEM: { valor: OrdemLista; rotulo: string }[] = [
  { valor: 'data_desc', rotulo: 'Data (mais recente)' },
  { valor: 'data_asc', rotulo: 'Data (mais antiga)' },
  { valor: 'valor_desc', rotulo: 'Maior valor' },
  { valor: 'valor_asc', rotulo: 'Menor valor' },
]

const COMPARADORES: Record<
  OrdemLista,
  (a: Lancamento, b: Lancamento) => number
> = {
  data_desc: (a, b) => b.data.localeCompare(a.data) || b.id - a.id,
  data_asc: (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
  valor_desc: (a, b) => b.valor - a.valor,
  valor_asc: (a, b) => a.valor - b.valor,
}

const categoriasFiltro = computed(() => listarCategorias())

const lancamentosFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  const lista = lancamentos.value.filter((lancamento) => {
    if (filtroTipo.value !== 'todos' && lancamento.tipo !== filtroTipo.value) {
      return false
    }
    if (filtroCategoria.value && lancamento.categoriaId !== filtroCategoria.value) {
      return false
    }
    if (filtroDe.value && lancamento.data < filtroDe.value) return false
    if (filtroAte.value && lancamento.data > filtroAte.value) return false
    if (termo) {
      const texto = `${lancamento.descricao} ${lancamento.observacao ?? ''}`.toLowerCase()
      if (!texto.includes(termo)) return false
    }
    return true
  })

  return [...lista].sort(COMPARADORES[ordem.value])
})

const totalReceitasFiltro = computed(() =>
  somarPorTipo(lancamentosFiltrados.value, 'receita'),
)

const totalDespesasFiltro = computed(() =>
  somarPorTipo(lancamentosFiltrados.value, 'despesa'),
)

const resultadoFiltro = computed(
  () => totalReceitasFiltro.value - totalDespesasFiltro.value,
)

const temFiltrosAtivos = computed(
  () =>
    busca.value.trim() !== '' ||
    filtroTipo.value !== 'todos' ||
    filtroCategoria.value !== '' ||
    filtroDe.value !== '' ||
    filtroAte.value !== '',
)

function limparFiltros() {
  busca.value = ''
  filtroTipo.value = 'todos'
  filtroCategoria.value = ''
  filtroDe.value = ''
  filtroAte.value = ''
}

const resumoMeses = computed(() => resumirPorMes(lancamentosFiltrados.value))

// ── Edição de lançamento ───────────────────────────────────
const emEdicao = ref<number | null>(null)
const errosEdicao = ref<string[]>([])
const edicao = ref({
  descricao: '',
  valor: null as number | null,
  tipo: 'despesa' as TipoLancamento,
  categoriaId: '',
  subcategoriaId: '',
  data: '',
  observacao: '',
  contaId: '',
})

function iniciarEdicao(lancamento: Lancamento) {
  emEdicao.value = lancamento.id
  errosEdicao.value = []
  edicao.value = {
    descricao: lancamento.descricao,
    valor: lancamento.valor,
    tipo: lancamento.tipo,
    categoriaId: lancamento.categoriaId,
    subcategoriaId: lancamento.subcategoriaId ?? '',
    data: lancamento.data,
    observacao: lancamento.observacao ?? '',
    contaId: lancamento.contaId ?? '',
  }
}

function cancelarEdicao() {
  emEdicao.value = null
  errosEdicao.value = []
}

function aoMudarTipoEdicao() {
  edicao.value.categoriaId =
    listarCategoriasDoTipo(edicao.value.tipo)[0]?.id ?? ''
  edicao.value.subcategoriaId = ''
}

function salvarEdicao() {
  if (emEdicao.value === null) return

  const listaErros = validarLancamento({
    descricao: edicao.value.descricao,
    valor: edicao.value.valor !== null ? String(edicao.value.valor) : '',
    categoriaId: edicao.value.categoriaId,
    data: edicao.value.data,
  })

  if (listaErros.length > 0) {
    errosEdicao.value = listaErros
    return
  }

  errosEdicao.value = []
  atualizarLancamento(emEdicao.value, {
    descricao: edicao.value.descricao.trim(),
    valor: edicao.value.valor as number,
    tipo: edicao.value.tipo,
    categoriaId: edicao.value.categoriaId,
    subcategoriaId: edicao.value.subcategoriaId || undefined,
    data: edicao.value.data,
    observacao: edicao.value.observacao.trim() || undefined,
    contaId: edicao.value.contaId || undefined,
  })

  notificar('Lançamento atualizado.')
  emEdicao.value = null
}

// ── Exclusão (com modal de confirmação) ─────────────────────
const exclusaoPendente = ref<Lancamento | null>(null)

function pedirExclusao(lancamento: Lancamento) {
  exclusaoPendente.value = lancamento
}

function cancelarExclusao() {
  exclusaoPendente.value = null
}

function confirmarExclusao() {
  const alvo = exclusaoPendente.value
  if (!alvo) return

  removerLancamento(alvo.id)
  if (emEdicao.value === alvo.id) emEdicao.value = null
  exclusaoPendente.value = null
  notificar(`Lançamento "${alvo.descricao}" excluído.`)
}
</script>

<template>
  <section class="panel">
    <div class="panel-topo">
      <h3>Lançamentos cadastrados</h3>
      <div class="linha-acoes">
        <button type="button" class="botao-secundario" @click="baixarExcel">
          <font-awesome-icon icon="file-excel" aria-hidden="true" />
          Excel
        </button>
        <button type="button" class="botao-secundario" @click="baixarCSV">
          <font-awesome-icon icon="download" aria-hidden="true" />
          CSV
        </button>
      </div>
    </div>

    <div class="filtros">
      <div class="campo">
        <label for="busca">Pesquisar</label>
        <input
          id="busca"
          v-model="busca"
          type="search"
          placeholder="Descrição ou observação"
        />
      </div>

      <div class="campo">
        <label for="filtro-tipo">Tipo</label>
        <select id="filtro-tipo" v-model="filtroTipo">
          <option value="todos">Todos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
      </div>

      <div class="campo">
        <label for="filtro-categoria">Categoria</label>
        <select id="filtro-categoria" v-model="filtroCategoria">
          <option value="">Todas</option>
          <option
            v-for="categoria in categoriasFiltro"
            :key="categoria.id"
            :value="categoria.id"
          >
            {{ categoria.icone }} {{ categoria.nome }}
          </option>
        </select>
      </div>

      <div class="campo">
        <label for="filtro-de">Período de</label>
        <input id="filtro-de" v-model="filtroDe" type="date" />
      </div>

      <div class="campo">
        <label for="filtro-ate">Até</label>
        <input id="filtro-ate" v-model="filtroAte" type="date" />
      </div>

      <div class="campo">
        <label for="ordem">Ordenar por</label>
        <select id="ordem" v-model="ordem">
          <option
            v-for="opcao in OPCOES_ORDEM"
            :key="opcao.valor"
            :value="opcao.valor"
          >
            {{ opcao.rotulo }}
          </option>
        </select>
      </div>

      <button
        v-if="temFiltrosAtivos"
        type="button"
        class="botao-secundario botao-limpar"
        @click="limparFiltros"
      >
        <font-awesome-icon icon="xmark" aria-hidden="true" />
        Limpar filtros
      </button>
    </div>

    <div class="resumo-filtro">
      <div class="resumo-bloco">
        <span>Receitas</span>
        <strong class="receita">{{ formatarMoeda(totalReceitasFiltro) }}</strong>
      </div>
      <div class="resumo-bloco">
        <span>Despesas</span>
        <strong class="despesa">{{ formatarMoeda(totalDespesasFiltro) }}</strong>
      </div>
      <div class="resumo-bloco">
        <span>Resultado</span>
        <strong :class="resultadoFiltro >= 0 ? 'receita' : 'despesa'">
          {{ formatarMoeda(resultadoFiltro) }}
        </strong>
      </div>
      <p class="contagem">
        {{ lancamentosFiltrados.length }} lançamento(s)
      </p>
    </div>

    <p v-if="lancamentos.length === 0" class="panel-description">
      Você ainda não cadastrou nenhum lançamento.
    </p>

    <p v-else-if="lancamentosFiltrados.length === 0" class="panel-description">
      Nenhum lançamento corresponde aos filtros aplicados.
    </p>

    <div
      v-for="lancamento in lancamentosFiltrados"
      :key="lancamento.id"
      class="lancamento-item"
    >
      <template v-if="emEdicao !== lancamento.id">
        <div>
          <strong>{{ lancamento.descricao }}</strong>
          <p class="detalhe-lancamento">
            {{ rotuloCategoria(lancamento.categoriaId) }}
            <template v-if="lancamento.subcategoriaId">
              · {{ rotuloSubcategoria(lancamento.categoriaId, lancamento.subcategoriaId) }}
            </template>
            · {{ lancamento.data }}
          </p>
          <p v-if="lancamento.observacao" class="observacao-lancamento">
            {{ lancamento.observacao }}
          </p>
        </div>

        <div class="lancamento-fim">
          <strong :class="lancamento.tipo">
            {{ lancamento.tipo === 'receita' ? '+' : '-' }}
            {{ formatarMoeda(lancamento.valor) }}
          </strong>

          <button
            type="button"
            class="botao-acao-lista"
            @click="iniciarEdicao(lancamento)"
          >
            <font-awesome-icon icon="pencil" aria-hidden="true" />
            Editar
          </button>

          <button
            type="button"
            class="botao-excluir"
            @click="pedirExclusao(lancamento)"
          >
            <font-awesome-icon icon="trash" aria-hidden="true" />
            Excluir
          </button>
        </div>
      </template>

      <form v-else class="edicao-form" @submit.prevent="salvarEdicao">
        <ul v-if="errosEdicao.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosEdicao" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label :for="`edicao-descricao-${lancamento.id}`">Descrição</label>
          <input
            :id="`edicao-descricao-${lancamento.id}`"
            v-model="edicao.descricao"
            type="text"
            maxlength="120"
            required
          />
        </div>

        <CampoMoeda
          :id="`edicao-valor-${lancamento.id}`"
          v-model="edicao.valor"
          rotulo="Valor (R$)"
          :obrigatorio="true"
        />

        <div class="campo">
          <label :for="`edicao-tipo-${lancamento.id}`">Tipo</label>
          <select
            :id="`edicao-tipo-${lancamento.id}`"
            v-model="edicao.tipo"
            @change="aoMudarTipoEdicao"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>

        <div class="campo">
          <label :for="`edicao-categoria-${lancamento.id}`">Categoria</label>
          <select
            :id="`edicao-categoria-${lancamento.id}`"
            v-model="edicao.categoriaId"
            required
            @change="edicao.subcategoriaId = ''"
          >
            <optgroup
              v-for="grupo in listarGruposDoTipo(edicao.tipo)"
              :key="grupo"
              :label="ROTULOS_GRUPOS[grupo]"
            >
              <option
                v-for="categoria in listarCategoriasDoTipo(edicao.tipo).filter(
                  (item) => item.grupo === grupo,
                )"
                :key="categoria.id"
                :value="categoria.id"
              >
                {{ categoria.icone }} {{ categoria.nome }}
              </option>
            </optgroup>
          </select>
        </div>

        <div
          v-if="listarSubcategoriasAtivas(edicao.categoriaId).length > 0"
          class="campo"
        >
          <label :for="`edicao-subcategoria-${lancamento.id}`">
            Subcategoria
          </label>
          <select
            :id="`edicao-subcategoria-${lancamento.id}`"
            v-model="edicao.subcategoriaId"
          >
            <option value="">Sem subcategoria</option>
            <option
              v-for="sub in listarSubcategoriasAtivas(edicao.categoriaId)"
              :key="sub.id"
              :value="sub.id"
            >
              {{ sub.nome }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label :for="`edicao-data-${lancamento.id}`">Data</label>
          <input
            :id="`edicao-data-${lancamento.id}`"
            v-model="edicao.data"
            type="date"
            required
          />
        </div>

        <div v-if="contasDisponiveis.length > 0" class="campo">
          <label :for="`edicao-conta-${lancamento.id}`">Conta (opcional)</label>
          <select
            :id="`edicao-conta-${lancamento.id}`"
            v-model="edicao.contaId"
          >
            <option value="">Sem conta vinculada</option>
            <option v-for="conta in contasDisponiveis" :key="conta.id" :value="conta.id">
              {{ conta.nome }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label :for="`edicao-observacao-${lancamento.id}`">
            Observação (opcional)
          </label>
          <input
            :id="`edicao-observacao-${lancamento.id}`"
            v-model="edicao.observacao"
            type="text"
            maxlength="120"
          />
        </div>

        <div class="edicao-acoes">
          <button class="botao-salvar" type="submit">Salvar</button>
          <button
            type="button"
            class="botao-secundario"
            @click="cancelarEdicao"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </section>

  <ResumoMensal :meses="resumoMeses" />

  <ModalConfirmacao
    :visivel="exclusaoPendente !== null"
    titulo="Excluir lançamento"
    :texto="
      exclusaoPendente
        ? `Excluir o lançamento '${exclusaoPendente.descricao}'? Esta ação não pode ser desfeita.`
        : ''
    "
    rotulo-confirmar="Excluir"
    @confirmar="confirmarExclusao"
    @cancelar="cancelarExclusao"
  />
</template>

<style scoped>
.panel {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

.panel h3 {
  margin: 0;
}

.panel-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-topo .botao-secundario {
  margin-top: 0;
}

.panel-description {
  margin-bottom: 24px;
  color: var(--color-muted);
  font-size: 14px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.campo label {
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
}

.campo input,
.campo select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
  color: var(--color-text);
}

.campo input:focus,
.campo select:focus {
  outline: 2px solid var(--color-focus);
  border-color: var(--color-primary);
}

.botao-salvar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  align-self: end;
  min-height: 44px;
  padding: 10px 16px;
  border: 0;
  border-radius: 9px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  cursor: pointer;
}

.botao-salvar:hover {
  background: var(--color-primary-dark);
}

.botao-secundario {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  min-height: 40px;
  padding: 9px 16px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.botao-secundario:hover {
  border-color: var(--color-focus);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.filtros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  align-items: end;
  margin: 18px 0 16px;
}

.filtros .botao-limpar {
  margin-top: 0;
  align-self: end;
}

.resumo-filtro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  background: var(--color-surface-faint);
}

.resumo-bloco {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resumo-bloco span {
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.resumo-bloco strong {
  font-size: 14px;
}

.contagem {
  margin: 0 0 0 auto;
  color: var(--color-muted);
  font-size: 12px;
}

.lancamento-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.lancamento-item:last-child {
  border-bottom: 0;
}

/* Texto longo não pode empurrar os botões para fora da tela. */
.lancamento-item > div:first-child {
  min-width: 0;
}

.lancamento-item > div:first-child strong {
  overflow-wrap: anywhere;
}

.detalhe-lancamento {
  margin: 6px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.observacao-lancamento {
  margin: 4px 0 0;
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-style: italic;
}

.lancamento-fim {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.botao-acao-lista {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.botao-acao-lista:hover {
  border-color: var(--color-focus);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.botao-excluir {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1px solid var(--color-danger-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-danger-dark);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.botao-excluir:hover {
  background: var(--color-danger-soft);
}

.edicao-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  flex: 1 1 100%;
  width: 100%;
  padding: 16px;
  border: 1px dashed var(--color-focus);
  border-radius: 11px;
  background: var(--color-surface-faint);
}

.edicao-acoes {
  display: flex;
  grid-column: 1 / -1;
  gap: 10px;
}

.edicao-acoes .botao-secundario {
  margin-top: 0;
}

.receita {
  color: var(--color-positive);
}

.despesa {
  color: var(--color-danger);
}

@media (max-width: 600px) {
  .panel {
    padding: 18px;
  }

  .lancamento-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .filtros {
    grid-template-columns: 1fr;
  }

  .resumo-filtro {
    gap: 16px;
  }

  .contagem {
    margin-left: 0;
  }

  .edicao-form {
    grid-template-columns: 1fr;
  }
}
</style>
