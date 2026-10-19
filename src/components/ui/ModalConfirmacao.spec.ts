import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ModalConfirmacao from './ModalConfirmacao.vue'

/**
 * O modal usa <Teleport to="body">, então o conteúdo é buscado no documento.
 */
function noCorpo(seletor: string): HTMLElement | null {
  return document.body.querySelector(seletor)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ModalConfirmacao', () => {
  it('não renderiza nada quando está fechado', () => {
    mount(ModalConfirmacao, {
      props: { visivel: false, titulo: 'Excluir', texto: 'Tem certeza?' },
    })

    expect(noCorpo('.modal-caixa')).toBeNull()
  })

  it('mostra título e texto quando aberto, com papel de diálogo', async () => {
    mount(ModalConfirmacao, {
      props: { visivel: true, titulo: 'Excluir cartão', texto: 'As compras saem junto.' },
    })
    await nextTick()

    const caixa = noCorpo('.modal-caixa')
    expect(caixa).not.toBeNull()
    expect(caixa?.getAttribute('role')).toBe('dialog')
    expect(caixa?.getAttribute('aria-modal')).toBe('true')
    expect(noCorpo('.modal-titulo')?.textContent).toBe('Excluir cartão')
    expect(noCorpo('.modal-texto')?.textContent).toBe('As compras saem junto.')
  })

  it('usa os rótulos informados nos botões', async () => {
    mount(ModalConfirmacao, {
      props: {
        visivel: true,
        titulo: 'T',
        texto: 'X',
        rotuloConfirmar: 'Remover',
        rotuloCancelar: 'Voltar',
      },
    })
    await nextTick()

    expect(noCorpo('.botao-confirmar')?.textContent?.trim()).toBe('Remover')
    expect(noCorpo('.botao-secundario')?.textContent?.trim()).toBe('Voltar')
  })

  it('emite "confirmar" ao clicar no botão principal', async () => {
    const wrapper = mount(ModalConfirmacao, {
      props: { visivel: true, titulo: 'T', texto: 'X' },
    })
    await nextTick()

    noCorpo('.botao-confirmar')?.click()
    await nextTick()

    expect(wrapper.emitted('confirmar')).toHaveLength(1)
  })

  it('emite "cancelar" ao clicar no botão secundário', async () => {
    const wrapper = mount(ModalConfirmacao, {
      props: { visivel: true, titulo: 'T', texto: 'X' },
    })
    await nextTick()

    noCorpo('.botao-secundario')?.click()
    await nextTick()

    expect(wrapper.emitted('cancelar')).toHaveLength(1)
  })

  it('emite "cancelar" ao clicar fora da caixa', async () => {
    const wrapper = mount(ModalConfirmacao, {
      props: { visivel: true, titulo: 'T', texto: 'X' },
    })
    await nextTick()

    noCorpo('.modal-overlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('cancelar')).toHaveLength(1)
  })

  it('emite "cancelar" ao pressionar Esc', async () => {
    const wrapper = mount(ModalConfirmacao, {
      props: { visivel: true, titulo: 'T', texto: 'X' },
    })
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('cancelar')).toHaveLength(1)
  })

  it('deixa de ouvir Esc depois de montar e desmontar', async () => {
    const wrapper = mount(ModalConfirmacao, {
      props: { visivel: true, titulo: 'T', texto: 'X' },
    })
    await nextTick()

    wrapper.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('cancelar')).toBeUndefined()
  })
})
