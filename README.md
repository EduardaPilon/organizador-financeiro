# organizador-financeiro

Organizador financeiro pessoal feito em **Vue 3 + Vite + TypeScript**, rodando
inteiramente no seu computador.

Reúne dashboard, lançamentos, categorias, contas, cartões, compromissos,
investimentos, patrimônio, orçamentos/metas e análise de planilhas (Excel/CSV) —
com gráficos, exportação e uma camada opcional de salvamento local.

## ⚠️ Privacidade (leia antes de usar)

- **Nada é enviado para a internet.** Não existe servidor, API, login, Open
  Finance ou conexão com bancos. Os cálculos, os gráficos e a leitura das
  planilhas acontecem dentro do navegador.
- Por padrão, os dados ficam **apenas em memória**: ao fechar ou atualizar a
  página, tudo é perdido. O banner no topo do app avisa em qual modo você está.
- Existe um **salvamento local opcional** (IndexedDB do próprio navegador),
  ativado somente por um clique em *“Ativar salvamento local”*. Sem esse
  consentimento, o banco local **não é aberto nem criado**.
- A cópia de segurança (`.json`) é gerada e lida **no seu computador**, sem
  envolver rede. Guarde-a em local seguro: apagar os dados do navegador apaga
  a cópia local.
- O botão *“Esquecer dados locais”* apaga a cópia salva no navegador e revoga
  o consentimento. Os dados em memória da sessão continuam lá até a página
  ser atualizada ou a sessão encerrada.
- **Não digite senhas, CPF, números de conta ou dados de cartão.** O app não
  se conecta a bancos nem controla cartões de verdade: os valores são
  informados por você.
- Valores de investimentos, bens e metas são **informados manualmente** — o app
  nunca busca cotações e não promete rendimento.

## Requisitos

- [Node.js](https://nodejs.org) `^22.18.0 || >=24.12.0` (já inclui o npm)
- Opcional: WSL, se você trabalha no Windows

## Como rodar

```sh
npm install   # uma vez, para instalar as dependências
npm run dev   # sobe o servidor de desenvolvimento
```

Abra **http://localhost:5173** no navegador.

### Projeto no WSL, acesso pelo Windows

O servidor escuta em **todas as interfaces** (`0.0.0.0`, configurado em
`vite.config.ts`) e o WSL2 encaminha `localhost` automaticamente — basta
abrir **http://localhost:5173** no navegador do Windows.

Se não abrir, use o IP do WSL (veja com `hostname -I` no terminal):

```sh
hostname -I          # ex.: 172.19.76.176 → http://172.19.76.176:5173
```

> **Importante:** no WSL, `node` e `npm` precisam ser os do **Linux**.
> Se `which node` apontar para `/mnt/c/...` (Node do Windows), os scripts
> falham com erros estranhos (`Cannot read file 'C:/Windows/tsconfig.json'`,
> `Permission denied`). Instale o Node no WSL:
>
> ```sh
> curl -fsSL -o /tmp/node.tar.xz \
>   https://nodejs.org/dist/v24.22.0/node-v24.22.0-linux-x64.tar.xz
> tar -xJf /tmp/node.tar.xz -C ~/.local --strip-components=1
> hash -r && node -v    # deve imprimir v24.22.0
> ```
>
> Depois rode `npm install` novamente para instalar os pacotes nativos da
> plataforma Linux (bindings do rolldown/lightningcss).

## Scripts

| Comando                 | O que faz                                      |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Servidor de desenvolvimento com hot-reload     |
| `npm run build`         | Type-check + build de produção em `dist/`      |
| `npm run preview`       | Serve o build de produção localmente           |
| `npm run type-check`    | Só verifica tipos (`vue-tsc`)                  |
| `npm run test:unit`     | Roda os testes unitários uma vez (Vitest)      |
| `npm run test:unit:watch` | Testes em modo observador                    |
| `npm run format`        | Formata o código com Prettier                  |

## Telas

| Rota              | O que faz                                                              |
| ----------------- | ---------------------------------------------------------------------- |
| `/`               | Dashboard: resumo do mês, gastos por categoria, evolução mensal e panorama (investimentos, patrimônio líquido, próximos vencimentos) |
| `/lancamentos`    | Receitas e despesas: criar, editar, filtrar, exportar (Excel/CSV)       |
| `/categorias`     | Categorias e subcategorias próprias                                     |
| `/contas`         | Contas (corrente, poupança, digital, dinheiro), saldos e transferências |
| `/cartoes`        | Cartões, compras parceladas, faturas e pagamentos                       |
| `/compromissos`   | Contas a pagar/receber, com recorrência mensal                           |
| `/investimentos`  | Posições, aportes, resgates e rendimento **estimado**                    |
| `/patrimônio`     | Bens, dívidas e patrimônio líquido                                       |
| `/orcamentos`     | Limite por categoria/mês e metas de acúmulo                              |
| `/analise`        | Importação de planilha, mapeamento de colunas, gráficos e comparação entre meses |

## Como cada módulo entra na conta (regras)

Estas regras existem para **nunca contar o mesmo dinheiro duas vezes**:

- **Transferência entre contas** não é receita nem despesa; só muda o saldo das
  contas envolvidas.
- **Compra no cartão** é despesa: cada parcela vira um lançamento no mês
  correspondente (a última absorve a diferença de centavos).
- **Pagamento de fatura** é quitação, não despesa — a compra já foi lançada.
- **Compromisso** (a pagar/receber) só cria lançamento no momento em que é
  marcado como pago/recebido, na data de vencimento; desfazer remove o
  lançamento.
- **Aporte e resgate de investimento** não são despesa/receita: movimentam
  patrimônio. O rendimento exibido é `valor atual informado − aportes líquidos`.
- **Pagar parcela de dívida** reduz o passivo e **não** gera lançamento (se
  quiser a parcela no fluxo do mês, lance em Lançamentos ou use Compromissos).
- **Bens** têm valor **estimado** por você; o app não calcula depreciação.
- **Orçamento** compara o limite com as despesas reais da categoria no mês:
  ≥ 80% pede atenção, ≥ 100% está estourado.

Tudo isso está detalhado em [`docs/modelo-dados.md`](docs/modelo-dados.md),
junto com o desenho relacional equivalente (para um eventual backend) e a
justificativa de **por que o projeto não tem servidor**.

## Persistência e cópia de segurança

```
memória (padrão) ──consentimento──► IndexedDB local (Dexie)
       │                                    │
       └──────► cópia .json (manual) ◄──────┘
```

- O **registro** de cada store fica em `src/stores/persistencia.ts`
  (`registrarEstado({ chave, coletar, aplicar, limpar })`); gravação com
  *debounce*, validação defensiva na leitura.
- A **cópia .json** é montada em `src/utils/backup.ts` e restaurada com
  validação — chaves desconhecidas são ignoradas.
- A flag de consentimento em `localStorage` é apenas uma **preferência**
  (“sim/não”), nunca dado financeiro.

## Importação de planilhas

`src/utils/importarPlanilha.ts` lê `.xlsx`, `.xls` e `.csv` (até 5 MB) com o
SheetJS, **sem sair do navegador**:

- detecta as colunas prováveis (data, descrição, valor, tipo, categoria) e
  permite corrigir o mapeamento;
- mostra uma **prévia** com o resultado e a lista de erros linha a linha;
- sem coluna de tipo, valores negativos viram despesa (convenção de extrato);
- datas aceitas: ISO, `dd/mm/aaaa` e `mm/dd/aaaa` (quando o brasileiro seria
  impossível).

## Design system e acessibilidade

- Paleta oficial (5 cores): verde `#246B4A`, coral `#C33C54`, azul `#254E70`,
  cinza `#E0E1DD` e teal `#17C3B2`. Cada cor tem um papel:
  verde = receitas/ações positivas · coral = despesas/alertas ·
  azul = estrutura, informações e estado de “atenção” ·
  cinza = superfícies, bordas e neutros · teal = destaques e investimentos.
- As cores vivem em **dois lugares sincronizados**: `src/styles/tokens.css`
  (variáveis CSS) e `src/styles/paleta.ts` (para onde o CSS não chega: Chart.js,
  `:style` inline e o catálogo de categorias). Nenhum hexadecimal solto fora
  desses arquivos — há um teste de auditoria por `grep` na revisão.
- Tons derivados (mistura com branco/preto) ampliam a paleta sem sair dela —
  é o que dá variedade às cores de categoria.
- Regra de contraste: cinza e teal **não** viram cor de texto sobre fundo claro
  (1,3:1 e 2,2:1); o teal entra como preenchimento e usa `--color-accent-dark`
  quando precisa virar texto.
- Tipografia via Google Fonts; ícones **Font Awesome Free Solid** (importados
  individualmente, tree-shaken). Emojis aparecem apenas como conteúdo das
  categorias escolhidas por você.
- Meta **WCAG 2.2 AA**: foco visível, contraste verificado, `aria-*` nos
  diálogos, área de toque confortável e layout responsivo de 320 px a 1440 px.
- `prefers-reduced-motion` respeitado (animações de gaveta/modal).

## Estrutura

```
src/
├── assets/                   # CSS global reutilizado pelas telas
├── components/
│   ├── graficos/             # wrapper do Chart.js (barras, linha, pizza)
│   ├── lancamentos/          # formulário, lista e resumo
│   └── ui/                   # CampoMoeda, ModalConfirmacao, ToastAvisos
├── router/                   # rotas da aplicação
├── stores/                   # estado reativo + persistência local
├── styles/                   # tokens de cor/tipografia + paleta em TS
├── utils/                    # moeda, datas, validação, resumos, planilha, backup
└── views/                    # uma view por rota
docs/
└── modelo-dados.md           # modelo de dados e decisão de arquitetura
```

## Testes

Testes unitários com **Vitest + @vue/test-utils + happy-dom**, cobrindo
utilitários (moeda, datas, validação, resumos, leitura de planilha, backup),
stores (lançamentos, contas, cartões, compromissos, investimentos, patrimônio,
orçamentos) e o componente de confirmação.

```sh
npm run test:unit
```

A validação visual das telas é feita no navegador — este ambiente de
desenvolvimento não tem Chromium, então não há testes de navegador.

## Solução de problemas

- **`sh: 1: vue-tsc: Permission denied`** — os links de `node_modules/.bin`
  foram criados por outra plataforma: rode `npm rebuild`.
- **`Port 5173 is already in use`** — outro processo ocupa a porta (o
  `strictPort` evita troca silenciosa); encerre o processo anterior ou
  mude `server.port` em `vite.config.ts`.
- **`npm run dev` falha apontando para `C:\Windows\...`** — o npm em uso é o
  do Windows; instale o Node no Linux conforme a seção acima.
- **O banner diz “somente em memória”** — é o modo padrão; ative o salvamento
  local se quiser que os dados sobrevivam a um recarregamento.

## IDE

[VS Code](https://code.visualstudio.com/) +
[Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
(desative a extensão Vetur).
