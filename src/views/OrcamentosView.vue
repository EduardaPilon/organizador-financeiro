<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { listarCategoriasDoTipo, obterCategoria } from '@/stores/categorias'
import { usarLancamentos } from '@/stores/lancamentos'
import {
  adicionarMeta,
  adicionarOrcamento,
  atualizarMeta,
  metas,
  orcamentos,
  progressoMeta,
  removerMeta,
  removerOrcamento,
  situacaoOrcamento,
  type Meta,
  type Orcamento,
} from '@/stores/orcamentos'
import { notificar } from '@/stores/notificacoes'
import { dataHoje, formatarMes, formatarMoeda } from '@/utils/formatar'
import { formatarDataBR } from '@/utils/datas'
import { somarEmCentavos } from '@/utils/moeda'
import { validarTextoObrigatorio } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'

const { lancamentos } = usarLancamentos()

// ── Orçamentos ──────────────────────────────────────────────
const mesAtual = ref(dataHoje().slice(0, 7))
const categoriasDespesa = computed(() => listarCategoriasDoTipo('despesa'))

const orcCategoriaId = ref('')
const orcMes = ref(mesAtual.value)
const orcLimite = ref<number | null>(null)
const errosOrc = ref<string[]>([])

watch(
  categoriasDespesa,
  (lista) => {
    if (!lista.some((categoria) => categoria.id === orcCategoriaId.value)) {
      orcCategoriaId.value = lista[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(mesAtual, (mes) => {
  orcMes.value = mes
})

function salvarOrcamento() {
  const listaErros = [
    ...(!orcCategoriaId.value ? ['Selecione a categoria.'] : []),
    ...(!orcMes.value ? ['Informe o mês de referência.'] : []),
    ...(orcLimite.value === null || orcLimite.value <= 0
      ? ['Informe um limite maior que zero.']
      : []),
  ]

  if (listaErros.length > 0) {
    errosOrc.value = listaErros
    return
  }

  errosOrc.value = []
  adicionarOrcamento({
    categoriaId: orcCategoriaId.value,
    mes: orcMes.value,
    limite: orcLimite.value as number,
  })

  notificar('Orçamento definido (substitui o anterior da mesma categoria/mês).')
  orcLimite.value = null
}

/** Gasto real da categoria no mês (lançamentos de despesa). */
function gastoDaCategoria(categoriaId: string, mes: string): number {
  return somarEmCentavos(
    lancamentos.value
      .filter(
        (lancamento) =>
          lancamento.tipo === 'despesa' &&
          lancamento.categoriaId === categoriaId &&
          lancamento.data.startsWith(mes),
      )
      .map((lancamento) => lancamento.valor),
  )
}

const orcamentosDoMes = computed(() =>
  orcamentos.value
    .filter((orcamento) => orcamento.mes === mesAtual.value)
    .map((orcamento) => {
      const gasto = gastoDaCategoria(orcamento.categoriaId, orcamento.mes)
      const { percentual, situacao } = situacaoOrcamento(orcamento, gasto)
      return { orcamento, gasto, percentual, situacao }
    })
    .sort((a, b) => b.percentual - a.percentual),
)

const limiteTotal = computed(() =>
  somarEmCentavos(orcamentosDoMes.value.map((item) => item.orcamento.limite)),
)

const gastoTotal = computed(() =>
  somarEmCentavos(orcamentosDoMes.value.map((item) => item.gasto)),
)

function nomeCategoria(id: string): string {
  return obterCategoria(id)?.nome ?? 'Categoria removida'
}

const orcamentoParaExcluir = ref<Orcamento | null>(null)

function confirmarExclusaoOrcamento() {
  const alvo = orcamentoParaExcluir.value
  if (!alvo) return
  removerOrcamento(alvo.id)
  orcamentoParaExcluir.value = null
  notificar('Orçamento removido.')
}

// ── Metas ───────────────────────────────────────────────────
const metaNome = ref('')
const metaAlvo = ref<number | null>(null)
const metaAtual = ref<number | null>(0)
const metaPrazo = ref('')
const errosMeta = ref<string[]>([])

function salvarMeta() {
  const listaErros = [
    ...validarTextoObrigatorio(metaNome.value, 'O nome da meta'),
    ...(metaAlvo.value === null || metaAlvo.value <= 0
      ? ['Informe o valor alvo (maior que zero).']
      : []),
    ...(metaAtual.value === null || metaAtual.value < 0
      ? ['Informe quanto já foi acumulado (use 0 se ainda não começou).']
      : []),
  ]

  if (listaErros.length > 0) {
    errosMeta.value = listaErros
    return
  }

  errosMeta.value = []
  adicionarMeta({
    nome: metaNome.value,
    valorAlvo: metaAlvo.value as number,
    valorAtual: metaAtual.value as number,
    prazo: metaPrazo.value || undefined,
  })

  notificar('Meta criada. O valor acumulado é informado por você.')
  metaNome.value = ''
  metaAlvo.value = null
  metaAtual.value = 0
  metaPrazo.value = ''
}

const metaEmEdicao = ref<string | null>(null)
const novoValorMeta = ref<number | null>(null)

function iniciarEdicaoMeta(meta: Meta) {
  metaEmEdicao.value = meta.id
  novoValorMeta.value = meta.valorAtual
}

function salvarValorMeta(meta: Meta) {
  if (novoValorMeta.value === null || novoValorMeta.value < 0) {
    notificar('Informe um valor válido para a meta.', 'erro')
    return
  }
  atualizarMeta(meta.id, { valorAtual: novoValorMeta.value })
  metaEmEdicao.value = null
  notificar('Progresso da meta atualizado.')
}

const metaParaExcluir = ref<Meta | null>(null)

function confirmarExclusaoMeta() {
  const alvo = metaParaExcluir.value
  if (!alvo) return
  removerMeta(alvo.id)
  metaParaExcluir.value = null
  notificar(`Meta "${alvo.nome}" removida.`)
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">PLANEJAMENTO</p>
      <h2>Orçamentos e metas que cabem na vida real.</h2>
      <p class="subtitle">
        Limite por categoria/mês comparado ao gasto real e metas de acúmulo.
      </p>
    </header>

    <section class="panel">
      <h3>Definir orçamento</h3>
      <p class="panel-description">
        Um limite por categoria e mês. Se já existir, o novo valor substitui.
      </p>

      <form class="formulario" @submit.prevent="salvarOrcamento">
        <ul v-if="errosOrc.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosOrc" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="orc-categoria">Categoria de despesa</label>
          <select id="orc-categoria" v-model="orcCategoriaId" required>
            <option v-for="categoria in categoriasDespesa" :key="categoria.id" :value="categoria.id">
              {{ categoria.icone }} {{ categoria.nome }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="orc-mes">Mês</label>
          <input id="orc-mes" v-model="orcMes" type="month" required />
        </div>

        <CampoMoeda id="orc-limite" v-model="orcLimite" rotulo="Limite mensal (R$)" :obrigatorio="true" />

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="bullseye" aria-hidden="true" />
          Salvar orçamento
        </button>
      </form>
    </section>

    <section class="panel">
      <div class="panel-topo-lista">
        <h3>Orçamentos de {{ formatarMes(mesAtual) }}</h3>
        <div class="campo campo-filtro">
          <label for="orc-mes-visualizado">Ver mês</label>
          <input id="orc-mes-visualizado" v-model="mesAtual" type="month" />
        </div>
      </div>

      <p v-if="orcamentosDoMes.length === 0" class="painel-vazio">
        Nenhum orçamento definido para este mês.
      </p>

      <template v-else>
        <p class="resumo-orcamento">
          Limite somado <strong>{{ formatarMoeda(limiteTotal) }}</strong> · gasto
          <strong>{{ formatarMoeda(gastoTotal) }}</strong>
        </p>

        <ul class="orcamentos-lista">
          <li v-for="item in orcamentosDoMes" :key="item.orcamento.id" class="orcamento-item">
            <div class="orcamento-topo">
              <div>
                <p class="orcamento-nome">{{ nomeCategoria(item.orcamento.categoriaId) }}</p>
                <p class="orcamento-valores">
                  {{ formatarMoeda(item.gasto) }} de
                  {{ formatarMoeda(item.orcamento.limite) }} ({{ item.percentual }}%)
                </p>
              </div>
              <span
                class="badge"
                :class="{
                  'badge-negativo': item.situacao === 'estourado',
                  'badge-atencao': item.situacao === 'atencao',
                  'badge-positivo': item.situacao === 'ok',
                }"
              >
                {{
                  item.situacao === 'estourado'
                    ? 'Estourou'
                    : item.situacao === 'atencao'
                      ? 'Atenção'
                      : 'Dentro do limite'
                }}
              </span>
            </div>

            <div
              class="barra-progresso"
              :class="{ atencao: item.situacao === 'atencao', estourado: item.situacao === 'estourado' }"
            >
              <div :style="{ width: `${Math.min(item.percentual, 100)}%` }"></div>
            </div>

            <button
              class="botao-acao botao-excluir"
              type="button"
              @click="orcamentoParaExcluir = item.orcamento"
            >
              <font-awesome-icon icon="trash" aria-hidden="true" />
              Remover orçamento
            </button>
          </li>
        </ul>
      </template>
    </section>

    <section class="panel">
      <h3>Nova meta</h3>
      <p class="panel-description">
        Ex.: reserva de emergência, viagem, entrada de imóvel. O quanto já foi
        acumulado é informado por você.
      </p>

      <form class="formulario" @submit.prevent="salvarMeta">
        <ul v-if="errosMeta.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosMeta" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="meta-nome">Nome</label>
          <input id="meta-nome" v-model="metaNome" type="text" maxlength="80" placeholder="Ex.: Reserva de emergência" required />
        </div>

        <CampoMoeda id="meta-alvo" v-model="metaAlvo" rotulo="Valor alvo (R$)" :obrigatorio="true" />
        <CampoMoeda id="meta-atual" v-model="metaAtual" rotulo="Já acumulado (R$)" dica="Informe manualmente" />

        <div class="campo">
          <label for="meta-prazo">Prazo (opcional)</label>
          <input id="meta-prazo" v-model="metaPrazo" type="date" />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="bullseye" aria-hidden="true" />
          Criar meta
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Metas</h3>
      <p v-if="metas.length === 0" class="painel-vazio">Nenhuma meta criada ainda.</p>

      <ul v-else class="metas-lista">
        <li v-for="meta in metas" :key="meta.id" class="meta-item">
          <div class="meta-topo">
            <div>
              <p class="meta-nome">{{ meta.nome }}</p>
              <p class="meta-valores">
                {{ formatarMoeda(meta.valorAtual) }} de {{ formatarMoeda(meta.valorAlvo) }}
                ({{ progressoMeta(meta) }}%)
                <template v-if="meta.prazo"> · prazo {{ formatarDataBR(meta.prazo) }}</template>
              </p>
            </div>
            <span class="badge" :class="progressoMeta(meta) >= 100 ? 'badge-positivo' : 'badge-neutro'">
              {{ progressoMeta(meta) >= 100 ? 'Concluída' : 'Em andamento' }}
            </span>
          </div>

          <div class="barra-progresso">
            <div :style="{ width: `${Math.min(progressoMeta(meta), 100)}%` }"></div>
          </div>

          <div v-if="metaEmEdicao === meta.id" class="meta-edicao">
            <CampoMoeda
              :id="`meta-edicao-${meta.id}`"
              v-model="novoValorMeta"
              rotulo="Novo valor acumulado (R$)"
            />
            <button class="botao-acao botao-primario" type="button" @click="salvarValorMeta(meta)">
              Salvar
            </button>
          </div>

          <div v-else class="linha-acoes">
            <button class="botao-acao" type="button" @click="iniciarEdicaoMeta(meta)">
              <font-awesome-icon icon="pencil" aria-hidden="true" />
              Atualizar valor
            </button>
            <button class="botao-acao botao-excluir" type="button" @click="metaParaExcluir = meta">
              <font-awesome-icon icon="trash" aria-hidden="true" />
              Excluir
            </button>
          </div>
        </li>
      </ul>
    </section>

    <p class="demo-note">
      Orçamentos e metas calculados localmente a partir dos seus lançamentos.
    </p>

    <ModalConfirmacao
      :visivel="orcamentoParaExcluir !== null"
      titulo="Remover orçamento"
      :texto="
        orcamentoParaExcluir
          ? `Remover o orçamento de ${nomeCategoria(orcamentoParaExcluir.categoriaId)} em ${formatarMes(orcamentoParaExcluir.mes)}?`
          : ''
      "
      rotulo-confirmar="Remover"
      @confirmar="confirmarExclusaoOrcamento"
      @cancelar="orcamentoParaExcluir = null"
    />

    <ModalConfirmacao
      :visivel="metaParaExcluir !== null"
      titulo="Excluir meta"
      :texto="metaParaExcluir ? `Excluir a meta '${metaParaExcluir.nome}'?` : ''"
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusaoMeta"
      @cancelar="metaParaExcluir = null"
    />
  </div>
</template>

<style scoped>
.panel-topo-lista {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.campo-filtro {
  min-width: 180px;
}

.resumo-orcamento {
  margin: 8px 0 20px;
  color: var(--color-muted);
  font-size: 12.5px;
}

.orcamentos-lista,
.metas-lista {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.orcamento-item,
.meta-item {
  padding: 16px;
  border: 1px solid var(--color-border-soft);
  border-radius: 12px;
}

.orcamento-topo,
.meta-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.orcamento-nome,
.meta-nome {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.orcamento-valores,
.meta-valores {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.orcamento-item .barra-progresso,
.meta-item .barra-progresso {
  margin-bottom: 14px;
}

.orcamento-item > .botao-acao {
  margin-top: 0;
}

.meta-edicao {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

@media (max-width: 600px) {
  .panel-topo-lista {
    flex-direction: column;
  }
}
</style>
