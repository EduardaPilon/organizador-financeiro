# Modelo de dados do Organizador Financeiro

Documento de referência do projeto. Escrito para servir tanto à leitura
humana quanto de base para um eventual banco relacional no futuro.

---

## 1. Decisão de arquitetura: **sem backend**

O projeto **não possui servidor, API ou banco remoto** — e isso é uma decisão
consciente, não uma limitação técnica.

### Por quê

| Motivo | Explicação |
| --- | --- |
| Privacidade por padrão | Dados financeiros nunca saem do computador. Não há requisição de rede com valores, descrições ou saldos. |
| Sem autenticação bancária | O app não pede senha, CPF, número de conta ou token. Não há Open Finance, scraping nem conexão a banco. |
| Superfície de risco zero no servidor | Sem servidor, não existe vazamento por invasão de API, backup mal configurado ou log de terceiros. |
| Funciona offline | Tudo é processado no navegador (cálculos, gráficos, leitura de planilhas). |
| Escopo didático coerente | O objetivo é organizar finanças pessoais localmente, não operar como instituição. |

### Onde os dados vivem

1. **Memória (padrão)** — refs do Vue. Ao fechar ou recarregar a página, tudo
   é perdido. O banner de privacidade avisa isso de forma explícita.
2. **IndexedDB local (opcional, com consentimento)** — via [Dexie](https://dexie.org/),
   banco `organizador-financeiro`, tabela `estados`. Só é aberto **depois** de
   a pessoa clicar em *"Ativar salvamento local"*. A flag de consentimento
   (`consentimento-salvamento-local`) fica em `localStorage` — é apenas uma
   **preferência**, nunca dado financeiro.
3. **Arquivo `.json` (opcional)** — cópia de segurança gerada e lida
   totalmente no computador (`src/utils/backup.ts`). Também é possível exportar
   Excel (`.xlsx`) e CSV.

Nada disso é sincronizado com a nuvem. Se o usuário apagar os dados do
navegador, a cópia local desaparece — por isso a cópia `.json` existe.

### Se um backend for necessário no futuro

Um modelo relacional pronto para isso está descrito na seção 3. A troca de
IndexedDB por API HTTP exigiria apenas uma nova implementação da camada
`src/stores/persistencia.ts` (registro `{ chave, coletar, aplicar, limpar }`),
sem alterar as telas. O requisito de privacidade permaneceria: só faria sentido
com criptografia ponta a ponta, consentimento explícito e um servidor sob
controle do próprio usuário.

---

## 2. Entidades e regras de negócio

Todas as datas trafegam como **string ISO `AAAA-MM-DD`** (fuso local). Todos os
valores são **números** (float arredondado a 2 casas com `arredondar2`), nunca
strings formatadas.

### 2.1 Núcleo do fluxo de caixa

**Categoria** (`categorias`) — catálogo editável pelo usuário.

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | string (PK) | gerado |
| `nome` | string | |
| `cor` | string | hex |
| `icone` | string | emoji escolhido pelo usuário (conteúdo, não ícone de interface) |
| `grupo` | enum | `receita`, `despesa_essencial`, `despesa_pessoal`, `despesa_financeira`, `investimento` |
| `subcategorias` | Subcategoria[] | embutidas |
| `ativa` | boolean | |

**Lançamento** (`lancamentos`) — receita ou despesa realizada.

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | number (PK) | sequencial |
| `descricao` | string | |
| `valor` | number | sempre positivo; o sinal vem de `tipo` |
| `tipo` | enum | `receita` \| `despesa` |
| `categoriaId` | string (FK) | → Categoria |
| `subcategoriaId` | string? (FK) | → Subcategoria da categoria |
| `data` | string ISO | |
| `observacao` | string? | |
| `contaId` | string? (FK) | → Conta |
| `cartaoId` | string? (FK) | → Cartão (compra no crédito) |
| `parcelaNumero` / `parcelaTotal` | number? | preenchidos em compras parceladas |

### 2.2 Contas e cartões

**Conta** (`contas`) — onde o dinheiro está.

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `nome` | string |
| `tipo` | enum (`corrente`, `poupanca`, `digital`, `dinheiro`) |
| `saldoInicial` | number |
| `ativa` | boolean |

**Transferência** (`transferencias`) — movimento entre contas próprias.

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `contaOrigemId` / `contaDestinoId` | string (FK → Conta) |
| `valor` | number |
| `data` | string ISO |

> **Regra:** transferência **não** é receita nem despesa.
> Saldo da conta = `saldoInicial + receitas da conta − despesas da conta
> + transferências recebidas − transferências enviadas`.

**Cartão** (`cartoes`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `nome` | string |
| `bandeira` | string? |
| `limite` | number |
| `diaFechamento` / `diaVencimento` | number (1–31) |
| `ativo` | boolean |

**CompraCartao** (`compras`) — compra, possivelmente parcelada.

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `cartaoId` | string (FK → Cartão) |
| `descricao`, `categoriaId` | string |
| `valorTotal` | number |
| `parcelas` | number |
| `dataCompra` | string ISO |
| `lancamentosIds` | number[] (FK → Lançamento) |

**PagamentoFatura** (`pagamentosFatura`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `cartaoId` | string (FK) |
| `mes` | string `AAAA-MM` |
| `valor` | number |
| `data` | string ISO |
| `contaId` | string? (FK) |

> **Regras dos cartões:**
> 1. A **compra** gera **uma despesa por parcela** (um lançamento por mês),
>    dividindo o total e ajustando o arredondamento na última parcela.
> 2. O **pagamento da fatura** é **quitação de compromisso**: **não** gera
>    despesa (a despesa já foi contabilizada na compra).
> 3. Fatura do mês = soma das parcelas lançadas naquele mês.
> 4. Limite comprometido = soma das parcelas com vencimento a partir de hoje.

### 2.3 Compromissos

**Compromisso** (`compromissos`) — conta a pagar/receber, com ou sem recorrência.

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `descricao` | string |
| `valor` | number |
| `tipo` | enum (`a_pagar`, `a_receber`) |
| `vencimento` | string ISO |
| `categoriaId` | string (FK) |
| `status` | enum (`pendente`, `pago`) |
| `recorrenteMensal` | boolean |
| `lancamentoId` | number? (FK → Lançamento) |

> **Regra:** o compromisso não afeta o caixa. Ao marcar como pago/recebido,
> cria-se **um** lançamento na data de vencimento (despesa para `a_pagar`,
> receita para `a_receber`). Desfazer a quitação remove esse lançamento.
> Situação derivada: `pago`, `atrasado`, `vence_breve` (≤ 5 dias), `pendente`.

### 2.4 Investimentos

**Investimento** (`investimentos`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `nome` | string |
| `tipo` | enum (`renda_fixa`, `renda_variavel`, `fundo`, `cripto`, `poupanca`, `outro`) |
| `dataInicial` | string ISO |
| `valorAtual` | number — **informado manualmente** |
| `atualizadoEm` | string ISO |
| `ativo` | boolean |

**MovimentacaoInvestimento** (`movimentacoes`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `investimentoId` | string (FK) |
| `tipo` | enum (`aporte`, `resgate`, `rendimento`) |
| `valor` | number |
| `data` | string ISO |

> **Regras:** aporte **não** é despesa e resgate **não** é receita — são
> transferências entre "conta" e "patrimônio investido". Rendimento exibido =
> `valorAtual − (aportes + rendimentos informados − resgates)`; é **estimativa
> do que o usuário informou**, não cotação de mercado. O app nunca busca
> cotações.

### 2.5 Patrimônio

**Bem** (`bens`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `nome` | string |
| `tipo` | enum (`imovel`, `veiculo`, `equipamento`, `outro`) |
| `valorEstimado` | number — estimativa do usuário |
| `dataAquisicao` | string? |

**Divida** (`dividas`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `nome` | string |
| `tipo` | enum (`financiamento`, `emprestimo`, `cartao`, `outro`) |
| `valorOriginal` / `saldoDevedor` / `valorParcela` | number |
| `parcelasTotal` / `parcelasPagas` | number |

> **Regras:** valores de bens são estimativas (sem depreciação automática).
> Pagar parcela reduz o passivo e **não** cria despesa (evita contagem dupla;
> lance a parcela em Lançamentos ou use Compromissos se quiser vê-la no mês).
>
> Patrimônio líquido = saldo das contas + investimentos (valor atual informado)
> + bens − saldo devedor das dívidas.

### 2.6 Planejamento

**Orcamento** (`orcamentos`) — um limite por categoria/mês.

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `categoriaId` | string (FK) |
| `mes` | string `AAAA-MM` |
| `limite` | number |

> **Regra:** gasto = soma das despesas da categoria no mês. Percentual =
> `gasto / limite`. Situação: `ok`, `atencao` (≥ 80%), `estourado` (≥ 100%).

**Meta** (`metas`).

| Campo | Tipo |
| --- | --- |
| `id` | string (PK) |
| `nome` | string |
| `valorAlvo` / `valorAtual` | number |
| `prazo` | string? |

> **Regra:** `valorAtual` é informado manualmente — o app não "reserva"
> dinheiro nem transfere valores automaticamente.

---

## 3. Modelo relacional equivalente (para um futuro backend)

Se um dia esses dados forem para um banco relacional (PostgreSQL, por
exemplo), este é o desenho equivalente:

```sql
-- Núcleo
CREATE TABLE usuario (
  id            UUID PRIMARY KEY,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categoria (
  id         UUID PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  cor        CHAR(7) NOT NULL,
  icone      TEXT NOT NULL,
  grupo      TEXT NOT NULL CHECK (grupo IN
               ('receita','despesa_essencial','despesa_pessoal','despesa_financeira','investimento')),
  ativa      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (usuario_id, nome)
);

CREATE TABLE subcategoria (
  id           UUID PRIMARY KEY,
  categoria_id UUID NOT NULL REFERENCES categoria(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  ativa        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE conta (
  id            UUID PRIMARY KEY,
  usuario_id    UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('corrente','poupanca','digital','dinheiro')),
  saldo_inicial NUMERIC(14,2) NOT NULL DEFAULT 0,
  ativa         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE cartao (
  id             UUID PRIMARY KEY,
  usuario_id     UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  bandeira       TEXT,
  limite         NUMERIC(14,2) NOT NULL,
  dia_fechamento SMALLINT NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento SMALLINT NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  ativo          BOOLEAN NOT NULL DEFAULT true
);

-- Lançamentos (única fonte de receitas e despesas realizadas)
CREATE TABLE lancamento (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  descricao       TEXT NOT NULL,
  valor           NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  tipo            TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  categoria_id    UUID NOT NULL REFERENCES categoria(id),
  subcategoria_id UUID REFERENCES subcategoria(id),
  conta_id        UUID REFERENCES conta(id) ON DELETE SET NULL,
  cartao_id       UUID REFERENCES cartao(id) ON DELETE SET NULL,
  parcela_numero  SMALLINT,
  parcela_total   SMALLINT,
  data            DATE NOT NULL,
  observacao      TEXT
);
CREATE INDEX idx_lancamento_usuario_data ON lancamento (usuario_id, data);

CREATE TABLE transferencia (
  id               UUID PRIMARY KEY,
  usuario_id       UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  conta_origem_id  UUID NOT NULL REFERENCES conta(id) ON DELETE CASCADE,
  conta_destino_id UUID NOT NULL REFERENCES conta(id) ON DELETE CASCADE,
  valor            NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  data             DATE NOT NULL,
  CHECK (conta_origem_id <> conta_destino_id)
);

CREATE TABLE compra_cartao (
  id           UUID PRIMARY KEY,
  cartao_id    UUID NOT NULL REFERENCES cartao(id) ON DELETE CASCADE,
  descricao    TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES categoria(id),
  valor_total  NUMERIC(14,2) NOT NULL CHECK (valor_total > 0),
  parcelas     SMALLINT NOT NULL CHECK (parcelas BETWEEN 1 AND 72),
  data_compra  DATE NOT NULL
);

CREATE TABLE lancamento_compra (         -- 1 linha por parcela gerada
  lancamento_id BIGINT PRIMARY KEY REFERENCES lancamento(id) ON DELETE CASCADE,
  compra_id     UUID NOT NULL REFERENCES compra_cartao(id) ON DELETE CASCADE
);

CREATE TABLE pagamento_fatura (
  id         UUID PRIMARY KEY,
  cartao_id  UUID NOT NULL REFERENCES cartao(id) ON DELETE CASCADE,
  mes        CHAR(7) NOT NULL,                 -- AAAA-MM
  valor      NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  data       DATE NOT NULL,
  conta_id   UUID REFERENCES conta(id) ON DELETE SET NULL
);

CREATE TABLE compromisso (
  id                UUID PRIMARY KEY,
  usuario_id        UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  descricao         TEXT NOT NULL,
  valor             NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  tipo              TEXT NOT NULL CHECK (tipo IN ('a_pagar','a_receber')),
  vencimento        DATE NOT NULL,
  categoria_id      UUID NOT NULL REFERENCES categoria(id),
  status            TEXT NOT NULL CHECK (status IN ('pendente','pago')),
  recorrente_mensal BOOLEAN NOT NULL DEFAULT false,
  lancamento_id     BIGINT REFERENCES lancamento(id) ON DELETE SET NULL
);

CREATE TABLE investimento (
  id           UUID PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN
                 ('renda_fixa','renda_variavel','fundo','cripto','poupanca','outro')),
  data_inicial DATE NOT NULL,
  valor_atual  NUMERIC(14,2) NOT NULL CHECK (valor_atual >= 0),
  atualizado_em DATE NOT NULL,
  ativo        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE movimentacao_investimento (
  id              UUID PRIMARY KEY,
  investimento_id UUID NOT NULL REFERENCES investimento(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('aporte','resgate','rendimento')),
  valor           NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  data            DATE NOT NULL
);

CREATE TABLE bem (
  id             UUID PRIMARY KEY,
  usuario_id     UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('imovel','veiculo','equipamento','outro')),
  valor_estimado NUMERIC(14,2) NOT NULL CHECK (valor_estimado > 0),
  data_aquisicao DATE
);

CREATE TABLE divida (
  id              UUID PRIMARY KEY,
  usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('financiamento','emprestimo','cartao','outro')),
  valor_original  NUMERIC(14,2) NOT NULL,
  saldo_devedor   NUMERIC(14,2) NOT NULL CHECK (saldo_devedor >= 0),
  parcelas_total  SMALLINT NOT NULL,
  parcelas_pagas  SMALLINT NOT NULL DEFAULT 0,
  valor_parcela   NUMERIC(14,2) NOT NULL
);

CREATE TABLE orcamento (
  id           UUID PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categoria(id) ON DELETE CASCADE,
  mes          CHAR(7) NOT NULL,               -- AAAA-MM
  limite       NUMERIC(14,2) NOT NULL CHECK (limite > 0),
  UNIQUE (usuario_id, categoria_id, mes)       -- um limite por categoria/mês
);

CREATE TABLE meta (
  id           UUID PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  valor_alvo   NUMERIC(14,2) NOT NULL CHECK (valor_alvo > 0),
  valor_atual  NUMERIC(14,2) NOT NULL DEFAULT 0,
  prazo        DATE
);
```

### Invariantes que um backend precisaria garantir

1. `transferencia` **nunca** vira `lancamento` — são tabelas separadas.
2. Uma `compra_cartao` gera exatamente `parcelas` lançamentos de despesa
   (verificável por contagem em `lancamento_compra`).
3. `pagamento_fatura` **não** gera lançamento — só marca quitação.
4. `movimentacao_investimento` **não** gera lançamento.
5. `divida`: `parcelas_pagas ≤ parcelas_total` e `saldo_devedor ≥ 0`.
6. `orcamento` é único por `(usuario, categoria, mes)` — substituir o limite
   atualiza a linha, e não cria outra.
7. Todo `lancamento.valor > 0`: o sinal é dado por `tipo`.

---

## 4. Fluxo de dados na aplicação

```
                  ┌─────────────────────────────────────────┐
   digitação ───► │ Stores (refs do Vue — MEMÓRIA)           │
                  │ lancamentos · contas · cartoes ·         │
                  │ compromissos · investimentos · ...       │
                  └───────────────┬─────────────────────────┘
                                  │ registrarEstado({ chave, coletar, aplicar, limpar })
                                  ▼
                  ┌─────────────────────────────────────────┐
                  │ stores/persistencia.ts                  │
                  │  • consentimento? (localStorage)        │
                  │  • não → nada é gravado                 │
                  │  • sim → IndexedDB (Dexie), com debounce │
                  └───────────────┬─────────────────────────┘
                                  │ coletarTudo()
                                  ▼
                  ┌─────────────────────────────────────────┐
                  │ utils/backup.ts                         │
                  │  backup-financeiro-AAAA-MM-DD.json      │
                  │  (exportar/restaurar manualmente)       │
                  └─────────────────────────────────────────┘
```

Leituras de arquivos (Excel/CSV) também são locais: `SheetJS` transforma o
arquivo em linhas em memória, o usuário confere a prévia e só então os
lançamentos entram nos stores.
