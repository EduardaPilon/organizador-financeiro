<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ROTULOS_TIPOS_CONTA,
  adicionarConta,
  adicionarTransferencia,
  alternarAtivaConta,
  calcularSaldoConta,
  contas,
  listarContas,
  obterConta,
  removerConta,
  removerTransferencia,
  transferencias,
  type Conta,
  type TipoConta,
} from '@/stores/contas'
import { usarLancamentos } from '@/stores/lancamentos'
import { notificar } from '@/stores/notificacoes'
import { dataHoje, formatarMoeda } from '@/utils/formatar'
import { formatarDataBR } from '@/utils/datas'
import { somarEmCentavos } from '@/utils/moeda'
import { validarTextoObrigatorio } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'

const { lancamentos } = usarLancamentos()

// ── Nova conta ──────────────────────────────────────────────
const nome = ref('')
const tipo = ref<TipoConta>('corrente')
const saldoInicial = ref<number | null>(0)
const observacao = ref('')
const erros = ref<string[]>([])

function salvarConta() {
  const listaErros = [
    ...validarTextoObrigatorio(nome.value, 'O nome da conta'),
    ...(saldoInicial.value === null
      ? ['Informe o saldo inicial (use 0 se não souber).']
      : []),
  ]

  if (listaErros.length > 0) {
    erros.value = listaErros
    return
  }

  erros.value = []
  adicionarConta({
    nome: nome.value,
    tipo: tipo.value,
    saldoInicial: saldoInicial.value as number,
    observacao: observacao.value.trim() || undefined,
  })

  notificar('Conta criada.')
  nome.value = ''
  saldoInicial.value = 0
  observacao.value = ''
}

// ── Saldos ──────────────────────────────────────────────────
const contasVisiveis = computed(() => listarContas({ incluirInativas: true }))

function saldo(contaId: string): number {
  return calcularSaldoConta(contaId, lancamentos.value, transferencias.value)
}

const saldoTotal = computed(() =>
  somarEmCentavos(contasVisiveis.value.map((conta) => saldo(conta.id))),
)

// ── Transferências ──────────────────────────────────────────
const origemId = ref('')
const destinoId = ref('')
const valorTransferencia = ref<number | null>(null)
const dataTransferencia = ref(dataHoje())
const errosTransferencia = ref<string[]>([])

function salvarTransferencia() {
  const listaErros: string[] = []

  if (!origemId.value || !destinoId.value) {
    listaErros.push('Escolha a conta de origem e a de destino.')
  } else if (origemId.value === destinoId.value) {
    listaErros.push('A conta de origem e a de destino precisam ser diferentes.')
  }
  if (valorTransferencia.value === null || valorTransferencia.value <= 0) {
    listaErros.push('Informe um valor maior que zero.')
  }

  if (listaErros.length > 0) {
    errosTransferencia.value = listaErros
    return
  }

  errosTransferencia.value = []
  const transferencia = adicionarTransferencia({
    contaOrigemId: origemId.value,
    contaDestinoId: destinoId.value,
    valor: valorTransferencia.value as number,
    data: dataTransferencia.value,
  })

  if (!transferencia) {
    notificar('Não foi possível registrar a transferência.', 'erro')
    return
  }

  notificar('Transferência registrada (não entra como receita/despesa).')
  valorTransferencia.value = null
}

const contasAtivas = computed(() => listarContas())

const transferenciasOrdenadas = computed(() =>
  [...transferencias.value].sort((a, b) => b.data.localeCompare(a.data)),
)

function nomeConta(id: string): string {
  return obterConta(id)?.nome ?? 'Conta removida'
}

// ── Exclusão de conta ───────────────────────────────────────
const contaParaExcluir = ref<Conta | null>(null)

function pedirExclusao(conta: Conta) {
  contaParaExcluir.value = conta
}

function confirmarExclusao() {
  const alvo = contaParaExcluir.value
  if (!alvo) return
  removerConta(alvo.id)
  contaParaExcluir.value = null
  notificar(`Conta "${alvo.nome}" removida.`)
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">CONTAS</p>
      <h2>Onde o seu dinheiro está.</h2>
      <p class="subtitle">
        Cadastre contas, acompanhe saldos e registre transferências entre elas.
      </p>
    </header>

    <section class="panel">
      <h3>Nova conta</h3>
      <p class="panel-description">
        O saldo inicial é o valor que existia ANTES dos lançamentos registrados
        no app.
      </p>

      <form class="formulario" @submit.prevent="salvarConta">
        <ul v-if="erros.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in erros" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="conta-nome">Nome</label>
          <input
            id="conta-nome"
            v-model="nome"
            type="text"
            maxlength="60"
            placeholder="Ex.: Nubank, Carteira"
            required
          />
        </div>

        <div class="campo">
          <label for="conta-tipo">Tipo</label>
          <select id="conta-tipo" v-model="tipo">
            <option v-for="(rotulo, chave) in ROTULOS_TIPOS_CONTA" :key="chave" :value="chave">
              {{ rotulo }}
            </option>
          </select>
        </div>

        <CampoMoeda
          id="conta-saldo"
          v-model="saldoInicial"
          rotulo="Saldo inicial (R$)"
          dica="Use 0 se preferir começar do zero"
        />

        <div class="campo campo-largo">
          <label for="conta-observacao">Observação (opcional)</label>
          <input
            id="conta-observacao"
            v-model="observacao"
            type="text"
            maxlength="120"
          />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="plus" aria-hidden="true" />
          Cadastrar conta
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Suas contas</h3>
      <p class="panel-description">
        Saldo atual = saldo inicial + receitas − despesas da conta
        + transferências recebidas − enviadas.
      </p>

      <p v-if="contasVisiveis.length === 0" class="painel-vazio">
        Nenhuma conta cadastrada ainda.
      </p>

      <div v-else class="tabela-rolagem">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Conta</th>
              <th>Tipo</th>
              <th>Status</th>
              <th class="num">Saldo inicial</th>
              <th class="num">Saldo atual</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="conta in contasVisiveis" :key="conta.id">
              <td>
                <strong>{{ conta.nome }}</strong>
                <span v-if="conta.observacao" class="detalhe">{{ conta.observacao }}</span>
              </td>
              <td>{{ ROTULOS_TIPOS_CONTA[conta.tipo] }}</td>
              <td>
                <span class="badge" :class="conta.ativa ? 'badge-positivo' : 'badge-neutro'">
                  {{ conta.ativa ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td class="num">{{ formatarMoeda(conta.saldoInicial) }}</td>
              <td class="num">
                <strong>{{ formatarMoeda(saldo(conta.id)) }}</strong>
              </td>
              <td>
                <div class="linha-acoes">
                  <button class="botao-acao" type="button" @click="alternarAtivaConta(conta.id)">
                    {{ conta.ativa ? 'Desativar' : 'Ativar' }}
                  </button>
                  <button class="botao-acao botao-excluir" type="button" @click="pedirExclusao(conta)">
                    <font-awesome-icon icon="trash" aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="contasVisiveis.length > 0" class="saldo-total">
        Saldo somado das contas: <strong>{{ formatarMoeda(saldoTotal) }}</strong>
      </p>
    </section>

    <section class="panel">
      <h3>Transferências entre contas</h3>
      <p class="panel-description">
        Transferência não é receita nem despesa — apenas move o dinheiro.
      </p>

      <form v-if="contasAtivas.length >= 2" class="formulario" @submit.prevent="salvarTransferencia">
        <ul v-if="errosTransferencia.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosTransferencia" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="transf-origem">Conta de origem</label>
          <select id="transf-origem" v-model="origemId" required>
            <option value="">Selecione…</option>
            <option v-for="conta in contasAtivas" :key="conta.id" :value="conta.id">
              {{ conta.nome }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="transf-destino">Conta de destino</label>
          <select id="transf-destino" v-model="destinoId" required>
            <option value="">Selecione…</option>
            <option v-for="conta in contasAtivas" :key="conta.id" :value="conta.id">
              {{ conta.nome }}
            </option>
          </select>
        </div>

        <CampoMoeda id="transf-valor" v-model="valorTransferencia" rotulo="Valor (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="transf-data">Data</label>
          <input id="transf-data" v-model="dataTransferencia" type="date" required />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="arrows-left-right" aria-hidden="true" />
          Registrar transferência
        </button>
      </form>

      <p v-else class="painel-vazio">
        Cadastre pelo menos duas contas ativas para registrar transferências.
      </p>

      <div v-if="transferenciasOrdenadas.length > 0" class="tabela-rolagem lista-transferencias">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Data</th>
              <th>Origem</th>
              <th>Destino</th>
              <th class="num">Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transferencia in transferenciasOrdenadas" :key="transferencia.id">
              <td>{{ formatarDataBR(transferencia.data) }}</td>
              <td>{{ nomeConta(transferencia.contaOrigemId) }}</td>
              <td>{{ nomeConta(transferencia.contaDestinoId) }}</td>
              <td class="num">{{ formatarMoeda(transferencia.valor) }}</td>
              <td>
                <button
                  class="botao-acao botao-excluir"
                  type="button"
                  @click="removerTransferencia(transferencia.id)"
                >
                  <font-awesome-icon icon="trash" aria-hidden="true" />
                  Excluir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="demo-note">
      Saldos calculados localmente a partir das suas contas e lançamentos.
    </p>

    <ModalConfirmacao
      :visivel="contaParaExcluir !== null"
      titulo="Excluir conta"
      :texto="
        contaParaExcluir
          ? `Excluir a conta '${contaParaExcluir.nome}'? Os lançamentos continuam existindo, mas ficarão sem conta vinculada.`
          : ''
      "
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusao"
      @cancelar="contaParaExcluir = null"
    />
  </div>
</template>

<style scoped>
.detalhe {
  display: block;
  margin-top: 3px;
  color: var(--color-muted);
  font-size: 11.5px;
}

.saldo-total {
  margin: 16px 0 0;
  color: var(--color-muted);
  font-size: 13px;
  text-align: right;
}

.saldo-total strong {
  color: var(--color-text);
  font-size: 15px;
}

.lista-transferencias {
  margin-top: 20px;
}
</style>
