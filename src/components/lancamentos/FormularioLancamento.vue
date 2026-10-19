<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ROTULOS_GRUPOS,
  listarCategoriasDoTipo,
  listarGruposDoTipo,
  listarSubcategoriasAtivas,
} from '@/stores/categorias'
import { adicionarLancamento, type TipoLancamento } from '@/stores/lancamentos'
import { listarContas } from '@/stores/contas'
import { notificar } from '@/stores/notificacoes'
import { dataHoje } from '@/utils/formatar'
import { validarLancamento } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'

const descricao = ref('')
const valor = ref<number | null>(null)
const tipo = ref<TipoLancamento>('despesa')
const categoriaId = ref('')
const subcategoriaId = ref('')
const data = ref(dataHoje())
const observacao = ref('')
const contaId = ref('')
const erros = ref<string[]>([])

/** Contas ativas para vincular o lançamento (módulo Contas). */
const contasDisponiveis = computed(() => listarContas())

/** Grupos de categoria oferecidos no formulário, conforme o tipo escolhido. */
const gruposDisponiveis = computed(() => listarGruposDoTipo(tipo.value))

const categoriasDisponiveis = computed(() => listarCategoriasDoTipo(tipo.value))

const subcategoriasDisponiveis = computed(() =>
  listarSubcategoriasAtivas(categoriaId.value),
)

// Trocar o tipo seleciona a primeira categoria compatível;
// trocar a categoria limpa a subcategoria escolhida.
watch(tipo, () => {
  categoriaId.value = categoriasDisponiveis.value[0]?.id ?? ''
})

watch(categoriaId, () => {
  subcategoriaId.value = ''
})

// categoria inicial disponível
categoriaId.value = categoriasDisponiveis.value[0]?.id ?? ''

function cadastrarLancamento() {
  const listaErros = validarLancamento({
    descricao: descricao.value,
    valor: valor.value !== null ? String(valor.value) : '',
    categoriaId: categoriaId.value,
    data: data.value,
  })

  if (listaErros.length > 0) {
    erros.value = listaErros
    return
  }

  erros.value = []
  adicionarLancamento({
    descricao: descricao.value.trim(),
    valor: valor.value as number,
    tipo: tipo.value,
    categoriaId: categoriaId.value,
    subcategoriaId: subcategoriaId.value || undefined,
    data: data.value,
    observacao: observacao.value.trim() || undefined,
    contaId: contaId.value || undefined,
  })

  notificar('Lançamento cadastrado.')

  descricao.value = ''
  valor.value = null
  observacao.value = ''
  subcategoriaId.value = ''
  contaId.value = ''
}
</script>

<template>
  <section class="panel">
    <h3>Novo lançamento</h3>
    <p class="panel-description">
      Preencha os dados da movimentação financeira.
    </p>

    <form class="formulario" @submit.prevent="cadastrarLancamento">
      <ul v-if="erros.length > 0" class="formulario-erros" role="alert">
        <li v-for="erro in erros" :key="erro">{{ erro }}</li>
      </ul>

      <div class="campo">
        <label for="descricao">Descrição</label>
        <input
          id="descricao"
          v-model="descricao"
          type="text"
          maxlength="120"
          placeholder="Ex.: Compra no mercado"
          required
        />
      </div>

      <CampoMoeda
        id="valor"
        v-model="valor"
        rotulo="Valor (R$)"
        :obrigatorio="true"
        dica="Aceita 1.234,56 ou 1234.56"
      />

      <div class="campo">
        <label for="tipo">Tipo</label>
        <select id="tipo" v-model="tipo">
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>

      <div class="campo">
        <label for="categoria">Categoria</label>
        <select id="categoria" v-model="categoriaId" required>
          <optgroup
            v-for="grupo in gruposDisponiveis"
            :key="grupo"
            :label="ROTULOS_GRUPOS[grupo]"
          >
            <option
              v-for="categoria in categoriasDisponiveis.filter(
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

      <div v-if="subcategoriasDisponiveis.length > 0" class="campo">
        <label for="subcategoria">Subcategoria (opcional)</label>
        <select id="subcategoria" v-model="subcategoriaId">
          <option value="">Sem subcategoria</option>
          <option
            v-for="sub in subcategoriasDisponiveis"
            :key="sub.id"
            :value="sub.id"
          >
            {{ sub.nome }}
          </option>
        </select>
      </div>

      <div class="campo">
        <label for="data">Data</label>
        <input id="data" v-model="data" type="date" required />
      </div>

      <div v-if="contasDisponiveis.length > 0" class="campo">
        <label for="conta">Conta (opcional)</label>
        <select id="conta" v-model="contaId">
          <option value="">Sem conta vinculada</option>
          <option v-for="conta in contasDisponiveis" :key="conta.id" :value="conta.id">
            {{ conta.nome }}
          </option>
        </select>
      </div>

      <div class="campo campo-largo">
        <label for="observacao">Observação (opcional)</label>
        <input
          id="observacao"
          v-model="observacao"
          type="text"
          maxlength="120"
          placeholder="Ex.: pagamento semanal"
        />
      </div>

      <button class="botao-salvar" type="submit">
        <font-awesome-icon icon="plus" aria-hidden="true" />
        Cadastrar lançamento
      </button>
    </form>
  </section>
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

.panel-description {
  margin-bottom: 24px;
  color: var(--color-muted);
  font-size: 14px;
}

.formulario {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.campo-largo {
  grid-column: 1 / -1;
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

@media (max-width: 600px) {
  .formulario {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }
}
</style>
