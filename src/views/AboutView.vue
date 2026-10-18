
<script setup lang="ts">
import { ref } from 'vue'

interface Lancamento {
  id: number
  descricao: string
  valor: number
  tipo: string
  categoria: string
  data: string
}

const descricao = ref('')
const valor = ref('')
const tipo = ref('despesa')
const categoria = ref('Alimentação')
const data = ref(new Date().toISOString().slice(0, 10))

const lancamentos = ref<Lancamento[]>([])

function cadastrarLancamento() {
  if (!descricao.value.trim() || !valor.value || Number(valor.value) <= 0) {
    alert('Preencha a descrição e informe um valor maior que zero.')
    return
  }

  lancamentos.value.push({
    id: Date.now(),
    descricao: descricao.value.trim(),
    valor: Number(valor.value),
    tipo: tipo.value,
    categoria: categoria.value,
    data: data.value,
  })

  descricao.value = ''
  valor.value = ''
  tipo.value = 'despesa'
  categoria.value = 'Alimentação'
  data.value = new Date().toISOString().slice(0, 10)
}
</script>

<template>
  <div class="lancamentos">
    <section class="page-heading">
      <div>
        <p class="eyebrow">ORGANIZAÇÃO FINANCEIRA</p>
        <h2>Meus lançamentos</h2>
        <p class="subtitle">Registre suas receitas e despesas.</p>
      </div>
    </section>

    <section class="panel">
      <h3>Novo lançamento</h3>
      <p class="panel-description">
        Preencha os dados da movimentação financeira.
      </p>

      <form class="formulario" @submit.prevent="cadastrarLancamento">
        <div class="campo">
          <label for="descricao">Descrição</label>
          <input
            id="descricao"
            v-model="descricao"
            type="text"
            placeholder="Ex.: Compra no mercado"
            required
          />
        </div>

        <div class="campo">
          <label for="valor">Valor (R$)</label>
          <input
            id="valor"
            v-model="valor"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            required
          />
        </div>

        <div class="campo">
          <label for="tipo">Tipo</label>
          <select id="tipo" v-model="tipo">
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>

        <div class="campo">
          <label for="categoria">Categoria</label>
          <select id="categoria" v-model="categoria">
            <option>Alimentação</option>
            <option>Moradia</option>
            <option>Transporte</option>
            <option>Saúde</option>
            <option>Lazer</option>
            <option>Salário</option>
            <option>Outros</option>
          </select>
        </div>

        <div class="campo">
          <label for="data">Data</label>
          <input id="data" v-model="data" type="date" required />
        </div>

        <button class="botao-salvar" type="submit">
          Cadastrar lançamento
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Lançamentos cadastrados</h3>

      <p v-if="lancamentos.length === 0" class="panel-description">
        Você ainda não cadastrou nenhum lançamento.
      </p>

      <div
        v-for="lancamento in lancamentos"
        :key="lancamento.id"
        class="lancamento-item"
      >
        <div>
          <strong>{{ lancamento.descricao }}</strong>
          <p class="detalhe-lancamento">
            {{ lancamento.categoria }} · {{ lancamento.data }}
          </p>
        </div>

        <strong :class="lancamento.tipo">
          {{ lancamento.tipo === 'receita' ? '+' : '-' }}
          {{
            lancamento.valor.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          }}
        </strong>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lancamentos {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #43815e;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.page-heading h2 {
  margin: 0;
  color: #24332c;
  font-family: 'Manrope', sans-serif;
  font-size: 28px;
  font-weight: 800;
}

.subtitle,
.panel-description {
  color: #7b887f;
  font-size: 14px;
}

.panel {
  padding: 24px;
  border: 1px solid #e7ece8;
  border-radius: 15px;
  background: #fff;
}

.panel h3 {
  margin: 0;
  font-family: 'Manrope', sans-serif;
}

.panel-description {
  margin-bottom: 24px;
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

.campo label {
  color: #536459;
  font-size: 13px;
  font-weight: 600;
}

.campo input,
.campo select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #dfe7e0;
  border-radius: 9px;
  background: #fff;
  color: #24332c;
}

.campo input:focus,
.campo select:focus {
  outline: 2px solid #b7d7c1;
  border-color: #43815e;
}

.botao-salvar {
  align-self: end;
  min-height: 44px;
  padding: 10px 16px;
  border: 0;
  border-radius: 9px;
  background: #246b4a;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.botao-salvar:hover {
  background: #195538;
}

.lancamento-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #edf0ed;
}

.lancamento-item:last-child {
  border-bottom: 0;
}

.detalhe-lancamento {
  margin: 6px 0 0;
  color: #89958c;
  font-size: 12px;
}

.receita {
  color: #39845a;
}

.despesa {
  color: #c46b55;
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
