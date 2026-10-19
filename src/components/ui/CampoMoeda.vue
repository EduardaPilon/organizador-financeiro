<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatarParaEdicao, paraNumero } from '@/utils/moeda'

/**
 * Campo monetário no padrão brasileiro (aceita "1.234,56" e "1234.56").
 * Emite sempre o número (ou null quando vazio) — a exibição é formatada
 * ao sair do campo, sem travar a digitação do usuário.
 */
const props = withDefaults(
  defineProps<{
    id: string
    rotulo: string
    modelValue: number | null
    obrigatorio?: boolean
    dica?: string
  }>(),
  { obrigatorio: false, dica: '' },
)

const emit = defineEmits<{ 'update:modelValue': [valor: number | null] }>()

const texto = ref(
  props.modelValue !== null ? formatarParaEdicao(props.modelValue) : '',
)

// Mudança externa do valor (limpeza de formulário, edição de registro...).
watch(
  () => props.modelValue,
  (valor) => {
    if (valor === null) {
      if (paraNumero(texto.value) !== null) texto.value = ''
      return
    }
    if (paraNumero(texto.value) !== valor) texto.value = formatarParaEdicao(valor)
  },
)

function aoDigitar() {
  emit('update:modelValue', paraNumero(texto.value))
}

function aoSairDoCampo() {
  const valor = paraNumero(texto.value)
  if (valor === null) return
  texto.value = formatarParaEdicao(valor)
  emit('update:modelValue', valor)
}
</script>

<template>
  <div class="campo">
    <label :for="id">{{ rotulo }}</label>
    <input
      :id="id"
      v-model="texto"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      placeholder="0,00"
      :required="obrigatorio"
      @input="aoDigitar"
      @blur="aoSairDoCampo"
    />
    <span v-if="dica" class="campo-dica">{{ dica }}</span>
  </div>
</template>
