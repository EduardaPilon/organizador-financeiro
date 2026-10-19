<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ROTULOS_GRUPOS, listarCategoriasDoTipo } from '@/stores/categorias'
import {
  ROTULOS_TIPO_COMPROMISSO,
  adicionarCompromisso,
  atualizarCompromisso,
  compromissos,
  desmarcarPago,
  gerarProximaOcorrencia,
  marcarComoPago,
  removerCompromisso,
  situacaoCompromisso,
  type Compromisso,
  type SituacaoCompromisso,
  type TipoCompromisso,
} from '@/stores/compromissos'
import { notificar } from '@/stores/notificacoes'
import { dataHoje, formatarMoeda } from '@/utils/formatar'
import { diasAte, formatarDataBR } from '@/utils/datas'
import { somarEmCentavos } from '@/utils/moeda'
import { validarTextoObrigatorio } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'

const hoje = ref(dataHoje())

// ── Formulário ──────────────────────────────────────────────
const descricao = ref('')
const valor = ref<number | null>(null)
const tipo = ref<TipoCompromisso>('a_pagar')
const vencimento = ref(dataHoje())
const categoriaId = ref('')
const recorrenteMensal = ref(false)
const observacao = ref('')
const erros = ref<string[]>([])

/** Categorias compatíveis: despesa para "a pagar", receita para "a receber". */
const categoriasDisponiveis = computed(() =>
  listarCategoriasDoTipo(tipo.value === 'a_pagar' ? 'despesa' : 'receita'),
)

watch(tipo, () => {
  categoriaId.value = categoriasDisponiveis.value[0]?.id ?? ''
})

watch(
  categoriasDisponiveis,
  (lista) => {
    if (!lista.some((categoria) => categoria.id === categoriaId.value)) {
      categoriaId.value = lista[0]?.id ?? ''
    }
  },
  { immediate: true },
)

function salvarCompromisso() {
  const listaErros = [
    ...validarTextoObrigatorio(descricao.value, 'A descrição'),
    ...(valor.value === null || valor.value <= 0
      ? ['Informe um valor maior que zero.']
      : []),
    ...(!vencimento.value ? ['Informe a data de vencimento.'] : []),
    ...(!categoriaId.value ? ['Selecione uma categoria.'] : []),
  ]

  if (listaErros.length > 0) {
    erros.value = listaErros
    return
  }

  erros.value = []
  adicionarCompromisso({
    descricao: descricao.value,
    valor: valor.value as number,
    tipo: tipo.value,
    vencimento: vencimento.value,
    categoriaId: categoriaId.value,
    recorrenteMensal: recorrenteMensal.value,
    observacao: observacao.value.trim() || undefined,
  })

  notificar('Compromisso cadastrado.')
  descricao.value = ''
  valor.value = null
  observacao.value = ''
  recorrenteMensal.value = false
}

// ── Lista e filtros ─────────────────────────────────────────
const filtro = ref<'pendentes' | 'atrasados' | 'pagos' | 'todos'>('pendentes')

const compromissosOrdenados = computed(() =>
  [...compromissos.value].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
)

const listaFiltrada = computed(() => {
  const lista = compromissosOrdenados.value

  if (filtro.value === 'todos') return lista
  if (filtro.value === 'pagos') {
    return lista.filter((item) => item.status === 'pago')
  }
  if (filtro.value === 'atrasados') {
    return lista.filter((item) => situacao(item) === 'atrasado')
  }
  return lista.filter((item) => item.status === 'pendente')
})

function situacao(compromisso: Compromisso): SituacaoCompromisso {
  return situacaoCompromisso(compromisso, hoje.value)
}

const atrasados = computed(
  () => compromissos.value.filter((item) => situacao(item) === 'atrasado').length,
)

const vencemBreve = computed(
  () => compromissos.value.filter((item) => situacao(item) === 'vence_breve').length,
)

const totalAPagar = computed(() =>
  somarEmCentavos(
    compromissos.value
      .filter((item) => item.status === 'pendente' && item.tipo === 'a_pagar')
      .map((item) => item.valor),
  ),
)

const totalAReceber = computed(() =>
  somarEmCentavos(
    compromissos.value
      .filter((item) => item.status === 'pendente' && item.tipo === 'a_receber')
      .map((item) => item.valor),
  ),
)

const ROTULOS_SITUACAO: Record<SituacaoCompromisso, string> = {
  pago: 'Pago',
  atrasado: 'Atrasado',
  vence_breve: 'Vence em breve',
  pendente: 'Pendente',
}

const CLASSES_SITUACAO: Record<SituacaoCompromisso, string> = {
  pago: 'badge-positivo',
  atrasado: 'badge-negativo',
  vence_breve: 'badge-atencao',
  pendente: 'badge-neutro',
}

function diasTexto(compromisso: Compromisso): string {
  const dias = diasAte(compromisso.vencimento, hoje.value)
  if (compromisso.status === 'pago') return ''
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  if (dias > 1) return `em ${dias} dias`
  return `há ${Math.abs(dias)} dia(s)`
}

// ── Ações ───────────────────────────────────────────────────
const paraExcluir = ref<Compromisso | null>(null)

function quitar(compromisso: Compromisso) {
  marcarComoPago(compromisso.id)
  notificar(
    compromisso.tipo === 'a_pagar'
      ? 'Compromisso pago: despesa lançada na data de vencimento.'
      : 'Compromisso recebido: receita lançada na data de vencimento.',
  )
}

function desfazer(compromisso: Compromisso) {
  desmarcarPago(compromisso.id)
  notificar('Quitação desfeita e lançamento removido.', 'info')
}

function repetirMensal(compromisso: Compromisso) {
  const proxima = gerarProximaOcorrencia(compromisso.id)
  if (proxima) notificar('Próxima ocorrência mensal criada.')
}

function confirmarExclusao() {
  const alvo = paraExcluir.value
  if (!alvo) return
  removerCompromisso(alvo.id)
  paraExcluir.value = null
  notificar(`Compromisso "${alvo.descricao}" removido.`)
}

/** Edição rápida do valor (informado no mês, reajustes etc.). */
const emEdicao = ref<string | null>(null)
const edicaoValor = ref<number | null>(null)

function iniciarEdicao(compromisso: Compromisso) {
  emEdicao.value = compromisso.id
  edicaoValor.value = compromisso.valor
}

function salvarEdicao(compromisso: Compromisso) {
  if (edicaoValor.value === null || edicaoValor.value <= 0) {
    notificar('Informe um valor maior que zero.', 'erro')
    return
  }
  atualizarCompromisso(compromisso.id, { valor: edicaoValor.value })
  emEdicao.value = null
  notificar('Valor atualizado.')
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">COMPROMISSOS</p>
      <h2>Contas a pagar e a receber.</h2>
      <p class="subtitle">
        Acompanhe vencimentos e transforme cada quitação em lançamento — sem
        contar nada duas vezes.
      </p>
    </header>

    <section v-if="atrasados > 0 || vencemBreve > 0" class="panel alertas">
      <p v-if="atrasados > 0" class="alerta-linha atrasado">
        <font-awesome-icon icon="triangle-exclamation" aria-hidden="true" />
        {{ atrasados }} compromisso(s) atrasado(s).
      </p>
      <p v-if="vencemBreve > 0" class="alerta-linha breve">
        <font-awesome-icon icon="circle-info" aria-hidden="true" />
        {{ vencemBreve }} compromisso(s) vencem nos próximos 5 dias.
      </p>
    </section>

    <section class="panel">
      <h3>Novo compromisso</h3>
      <p class="panel-description">
        Ao marcar como pago/recebido, o app cria o lançamento na data de
        vencimento com a categoria escolhida.
      </p>

      <form class="formulario" @submit.prevent="salvarCompromisso">
        <ul v-if="erros.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in erros" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="comp-descricao">Descrição</label>
          <input
            id="comp-descricao"
            v-model="descricao"
            type="text"
            maxlength="120"
            placeholder="Ex.: Aluguel, mensalidade da faculdade"
            required
          />
        </div>

        <CampoMoeda id="comp-valor" v-model="valor" rotulo="Valor (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="comp-tipo">Tipo</label>
          <select id="comp-tipo" v-model="tipo">
            <option v-for="(rotulo, chave) in ROTULOS_TIPO_COMPROMISSO" :key="chave" :value="chave">
              {{ rotulo }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="comp-vencimento">Vencimento</label>
          <input id="comp-vencimento" v-model="vencimento" type="date" required />
        </div>

        <div class="campo">
          <label for="comp-categoria">Categoria</label>
          <select id="comp-categoria" v-model="categoriaId" required>
            <optgroup
              v-for="grupo in [...new Set(categoriasDisponiveis.map((item) => item.grupo))]"
              :key="grupo"
              :label="ROTULOS_GRUPOS[grupo]"
            >
              <option
                v-for="categoria in categoriasDisponiveis.filter((item) => item.grupo === grupo)"
                :key="categoria.id"
                :value="categoria.id"
              >
                {{ categoria.icone }} {{ categoria.nome }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="campo campo-largo">
          <label class="campo-marcador">
            <input v-model="recorrenteMensal" type="checkbox" />
            Repete todo mês (você pode gerar a próxima ocorrência ao quitar)
          </label>
        </div>

        <div class="campo campo-largo">
          <label for="comp-observacao">Observação (opcional)</label>
          <input id="comp-observacao" v-model="observacao" type="text" maxlength="120" />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="plus" aria-hidden="true" />
          Cadastrar compromisso
        </button>
      </form>
    </section>

    <section class="panel">
      <div class="panel-topo-lista">
        <h3>Seus compromissos</h3>
        <div class="campo campo-filtro">
          <label for="comp-filtro">Mostrar</label>
          <select id="comp-filtro" v-model="filtro">
            <option value="pendentes">Pendentes</option>
            <option value="atrasados">Atrasados</option>
            <option value="pagos">Pagos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      <p class="resumo-compromissos">
        Pendentes a pagar: <strong>{{ formatarMoeda(totalAPagar) }}</strong> ·
        a receber: <strong>{{ formatarMoeda(totalAReceber) }}</strong>
      </p>

      <p v-if="listaFiltrada.length === 0" class="painel-vazio">
        Nenhum compromisso neste filtro.
      </p>

      <div v-else class="tabela-rolagem">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Compromisso</th>
              <th>Tipo</th>
              <th>Vencimento</th>
              <th class="num">Valor</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="compromisso in listaFiltrada" :key="compromisso.id">
              <td>
                <strong>{{ compromisso.descricao }}</strong>
                <span v-if="compromisso.recorrenteMensal" class="detalhe">mensal</span>
              </td>
              <td>{{ ROTULOS_TIPO_COMPROMISSO[compromisso.tipo] }}</td>
              <td>
                {{ formatarDataBR(compromisso.vencimento) }}
                <span v-if="diasTexto(compromisso)" class="detalhe">{{ diasTexto(compromisso) }}</span>
              </td>
              <td class="num">
                <template v-if="emEdicao === compromisso.id">
                  <CampoMoeda
                    :id="`comp-edicao-${compromisso.id}`"
                    v-model="edicaoValor"
                    rotulo="Novo valor"
                  />
                  <button class="botao-acao" type="button" @click="salvarEdicao(compromisso)">
                    Salvar valor
                  </button>
                </template>
                <strong v-else>{{ formatarMoeda(compromisso.valor) }}</strong>
              </td>
              <td>
                <span class="badge" :class="CLASSES_SITUACAO[situacao(compromisso)]">
                  {{ ROTULOS_SITUACAO[situacao(compromisso)] }}
                </span>
              </td>
              <td>
                <div class="linha-acoes">
                  <button
                    v-if="compromisso.status === 'pendente'"
                    class="botao-acao botao-primario"
                    type="button"
                    @click="quitar(compromisso)"
                  >
                    <font-awesome-icon icon="circle-check" aria-hidden="true" />
                    {{ compromisso.tipo === 'a_pagar' ? 'Pagar' : 'Receber' }}
                  </button>
                  <button
                    v-else
                    class="botao-acao"
                    type="button"
                    @click="desfazer(compromisso)"
                  >
                    Desfazer
                  </button>

                  <button
                    v-if="compromisso.status === 'pago' && compromisso.recorrenteMensal"
                    class="botao-acao"
                    type="button"
                    @click="repetirMensal(compromisso)"
                  >
                    <font-awesome-icon icon="plus" aria-hidden="true" />
                    Próximo mês
                  </button>

                  <button
                    v-if="compromisso.status === 'pendente'"
                    class="botao-acao"
                    type="button"
                    @click="iniciarEdicao(compromisso)"
                  >
                    <font-awesome-icon icon="pencil" aria-hidden="true" />
                  </button>

                  <button
                    class="botao-acao botao-excluir"
                    type="button"
                    @click="paraExcluir = compromisso"
                  >
                    <font-awesome-icon icon="trash" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="demo-note">
      Compromissos ficam apenas em memória até você ativar o salvamento local.
    </p>

    <ModalConfirmacao
      :visivel="paraExcluir !== null"
      titulo="Excluir compromisso"
      :texto="
        paraExcluir
          ? `Excluir '${paraExcluir.descricao}'? Se ele já foi quitado, o lançamento criado também será removido.`
          : ''
      "
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusao"
      @cancelar="paraExcluir = null"
    />
  </div>
</template>

<style scoped>
.alertas {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
}

.alerta-linha {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.alerta-linha.atrasado {
  color: var(--color-danger-dark);
}

.alerta-linha.breve {
  color: var(--color-secondary);
}

.panel-topo-lista {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.campo-filtro {
  min-width: 170px;
}

.resumo-compromissos {
  margin: 8px 0 20px;
  color: var(--color-muted);
  font-size: 12.5px;
}

.detalhe {
  display: block;
  margin-top: 3px;
  color: var(--color-muted);
  font-size: 11.5px;
}

.campo-marcador {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

@media (max-width: 600px) {
  .panel-topo-lista {
    flex-direction: column;
  }
}
</style>
