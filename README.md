# Macramê do Leh + Brilho de Orixá — Plataforma de Gestão (Protótipo Demonstrativo)

Protótipo **demonstrativo** de uma plataforma de gestão de e-commerce para **duas marcas
independentemente administradas** — **Macramê do Leh** e **Brilho de Orixá** —, desenvolvido
pela **Trinary Solutions** para apresentação a cliente.

> **Aviso:** este é um protótipo de apresentação. **Todos os dados são fictícios** e
> **nenhuma integração real está ativa** (marketplaces, pagamentos, frete ou estoque físico).
> Não há backend, banco de dados, API ou chamadas de rede a serviços de negócio.
> Todo o estado vive no `localStorage` do navegador.

Cada marca possui catálogo e estoque próprios e vende nas **mesmas quatro plataformas**
(Nuvemshop, Mercado Livre, Shopee e TikTok Shop), resultando em **8 combinações
marca × plataforma**, todas simuladas localmente.

---

## Acesso à demonstração

| Campo           | Valor            |
| --------------- | ---------------- |
| Identificador   | `Macrame do Leh` |
| Senha           | `123`            |

O identificador ignora maiúsculas/minúsculas e espaços no início/fim. A tela de login é
apenas uma barreira visual para a apresentação — **não é um mecanismo de segurança**.
A sessão é guardada em `localStorage` e o botão **Sair da demonstração** remove
**apenas** a sessão (os dados continuam salvos).

---

## Requisitos

- **Node.js** 18+ (testado com Node 24)
- **npm** 9+

---

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Ambiente de desenvolvimento (http://localhost:5173)
npm run dev

# 3. Verificação de tipos
npm run typecheck

# 4. Testes automatizados (Vitest)
npm run test          # execução única
npm run test:watch    # modo observador

# 5. Build de produção (tsc + vite build) -> pasta dist/
npm run build

# 6. Pré-visualizar o build de produção
npm run preview
```

> **Windows/PowerShell:** a política de execução pode bloquear `npm.ps1`. Se ocorrer,
> use `npm.cmd` e `npx.cmd` (ex.: `npm.cmd run dev`).

---

## Stack

| Camada        | Escolha                                                          |
| ------------- | ---------------------------------------------------------------- |
| Base          | React 19 + TypeScript 5.8 (`strict`, sem `any`)                  |
| Build         | Vite 6                                                            |
| Estilo        | Tailwind CSS v4 (via `@tailwindcss/vite`) + design system próprio |
| Roteamento    | React Router v7 — **HashRouter** (funciona em hospedagem estática) |
| Formulários   | React Hook Form + Zod (validação)                                 |
| Gráficos      | Recharts                                                          |
| Ícones        | Lucide React                                                      |
| Testes        | Vitest (ambiente `node`)                                          |
| Utilitários   | `clsx` + `tailwind-merge` (`cn`)                                  |

**Sem** Next.js, Express, Prisma, Supabase ou qualquer banco de dados. Nenhuma dependência
carrega imagens/fontes externas: a aplicação funciona **offline**.

---

## Arquitetura

O estado da demonstração é centralizado em **um único `useReducer`**
(`src/store/reducer.ts`), que é o **único ponto de mutação** dos dados de negócio.
Nenhum componente altera dados diretamente — todos despacham ações.

```
src/
├─ app/            # App raiz e rotas (HashRouter + guard de autenticação + lazy loading)
├─ components/
│  ├─ layout/      # AppLayout, Sidebar (colapsável), Header (busca, notificações, usuário)
│  ├─ shared/      # PageHeader, StatCard, ProductThumb, DomainBadges,
│  │               # ChannelRevenueList, EvolutionBarList
│  └─ ui/          # Design system próprio: Button, Card, Badge, Form, Modal, Table,
│                  # EmptyState, Pagination, SegmentedControl
├─ data/           # Dados fictícios (produtos, pedidos, canais, financeiro, atividade)
├─ features/       # Um diretório por módulo/página
│  ├─ auth/ dashboard/ products/ inventory/ orders/
│  └─ channels/ finance/ reports/ activity/ settings/
├─ lib/            # Lógica pura e reutilizável
│  ├─ calculations.ts   # regras de negócio e métricas (nível de estoque, transições, KPIs)
│  ├─ storage.ts        # persistência versionada + recuperação de dados corrompidos
│  ├─ demoActions.ts    # simulação de publicação, códigos fictícios, validação
│  ├─ validation.ts     # schemas Zod (produto, lançamento, configurações)
│  ├─ csv.ts / formatters.ts / cn.ts
├─ store/          # reducer + contexts (Demo, Auth, Toast)
├─ types/          # tipos de domínio (fonte única de verdade)
└─ styles/         # tokens de tema (paleta, tipografia)
```

### Contextos

- **DemoContext** — estado completo + `dispatch`, com persistência automática no `localStorage`.
- **AuthContext** — sessão demonstrativa (`validateDemoCredentials`, `login`, `logout`).
- **ToastContext** — notificações não intrusivas (substitui `alert()`).

---

## Módulos

| Módulo                    | O que faz                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Visão geral**           | 6 indicadores, **evolução em barras horizontais** e **faturamento por canal** (ranking), **visão consolidada** (soma das duas marcas + comparativo entre marcas) e **visão individual** (filtrada por uma marca), filtros de **marca + canal em conjunto**, período por preset (Hoje / 7 / 30 dias / mês) ou **calendário personalizado** |
| **Produtos**              | Cadastro/edição/exclusão (CRUD), SKU único, variações, categorias, publicação simulada por canal, busca/filtros/ordenação/paginação |
| **Estoque**               | Níveis normal/baixo/crítico/sem estoque com limiares configuráveis, ajuste de quantidade, distribuição simulada por canal, reserva para loja física (informativa) |
| **Pedidos**               | Central com filtros; detalhe com histórico; transições coerentes (Novo → Pago → Em separação → Enviado → Entregue) e cancelamento |
| **Canais de venda**       | **8 combinações marca × plataforma** (2 marcas × 4 plataformas: Nuvemshop, Mercado Livre, Shopee, TikTok Shop), agrupadas por marca; habilitar/desabilitar, simular erro e sincronizar |
| **Financeiro**            | Lançamentos manuais + receitas derivadas de pedidos pagos; gráficos; CRUD sem duplicar receita |
| **Relatórios**            | Gráficos e **4 exportações CSV** reais (vendas por canal, top produtos, pedidos, financeiro) |
| **Atividade do sistema**  | Trilha de auditoria gerada pelas ações reais da demonstração, com filtro por categoria |
| **Configurações**         | Limiares de estoque (com regra **crítico ≤ alerta**), canais prioritários, alocação, preferências de interface e seção de dados/restauração |

### Regras de negócio simuladas (destaques)

- **Publicação multi-canal determinística:** mesma entrada → mesmo resultado. Canais
  desabilitados falham; é possível forçar falha apenas para a demonstração.
- **Idempotência de estoque:** a baixa ocorre **uma única vez** ao marcar o pedido como
  **Pago** (`stockDeducted`); transições seguintes não repetem a baixa. O cancelamento de
  um pedido pago **devolve** o estoque uma única vez (`stockRestored`).
- **Receita sem duplicidade:** cada pedido pago gera **exatamente um** lançamento de
  entrada (chaveado por `orderId`). Excluir esse lançamento o **cancela** em vez de apagá-lo,
  preservando a integridade contábil da demonstração.
- **Exclusão de produto com pedidos:** a interface bloqueia a exclusão direta e oferece
  **“Inativar em vez de excluir”**, preservando o histórico de pedidos.
- **Configurações afetam os módulos:** alterar os limiares muda imediatamente os níveis de
  estoque exibidos nos demais módulos.
- **Período personalizado no calendário:** além dos presets, a Visão Geral aceita
  **qualquer intervalo** escolhido em um calendário (com navegação por mês **e por ano**).
  O gráfico de evolução **adapta a granularidade** à janela escolhida, para manter
  sempre poucas linhas e leitura imediata: até 14 dias → **diário**; até 45 dias →
  **semanal**; até 12 meses → **mensal**; acima disso → **anual**. Assim “Últimos
  7 dias” mostra 7 barras, “Últimos 30 dias” ~5, um ano 12 e cinco anos 5 — e é
  possível acompanhar o crescimento sem abrir o livro caixa.
- **Evolução em barras horizontais:** cada período vira uma linha no formato de
  gráfico de pesquisa (rótulo · barra proporcional · valor em R$), em ordem
  cronológica, com o período mais recente em destaque. Substituiu o gráfico de
  área, que precisava ser esticado verticalmente para casar com o card vizinho.
- **Gráficos em largura total, um sob o outro:** as duas listas têm quantidades de
  linhas diferentes (a evolução varia de 5 a 13, os canais são sempre 8), então lado
  a lado a mais curta deixaria um vazio grande embaixo — em tela larga (≥1280px) eram
  ~450px de buraco. Empilhados, cada card ocupa a linha inteira e o problema não
  existe em nenhuma largura de tela.

---

## Modelo multimarca e multicanal

O protótipo representa **duas marcas independentes** operando no mesmo ambiente:

| Marca             | Catálogo próprio | Estoques próprios | Canais de venda                                  |
| ----------------- | ---------------- | ----------------- | ------------------------------------------------ |
| **Macramê do Leh**    | Sim              | Sim               | Nuvemshop, Mercado Livre, Shopee, TikTok Shop     |
| **Brilho de Orixá**   | Sim              | Sim               | Nuvemshop, Mercado Livre, Shopee, TikTok Shop     |

Regras estruturais:

- **Cada marca é uma combinação própria:** a plataforma Nuvemshop é usada **por ambas as
  marcas**, mas representada como duas contas separadas — *“Macramê do Leh — Nuvemshop”* e
  *“Brilho de Orixá — Nuvemshop”* — resultando em **8 combinações marca × plataforma**.
- **Nada se mistura automaticamente:** produtos, estoques, pedidos e totais de uma marca
  **nunca** aparecem sob a outra. Um produto só anuncia nos canais da própria marca.
- **Cada registro carrega a marca:** produto, pedido e lançamento financeiro identificam a
  marca dona. Lançamentos podem ser de uma marca específica ou **consolidados** (sem marca).
- **Filtros de marca e canal trabalham em conjunto:** selecionar um canal **nunca** limpa a
  marca selecionada. A visão geral oferece visão **consolidada** (soma das duas marcas, com
  comparativo) e visão **individual** (filtrada por uma marca).
- **Código de marca:** `BrandId = 'macrame' | 'brilho'`. Identificadores genéricos do tipo
  “Loja 1”/“Loja 2” **não são usados** em nenhum título, filtro, seletor, formulário ou
  gráfico — sempre o nome oficial da marca.

---

## Dados e persistência

- Chave versionada: `macrame-demo:state:v2` (dados) e `macrame-demo:session:v1` (sessão).
- **Migração de dados:** uma versão anterior (`macrame-demo:state:v1`, sem marcas e com
  5 canais) é detectada, migrada com segurança e preservada em
  `macrame-demo:state:v1-backup`. Nada local é apagado silenciosamente.
- Carregamento tolerante a falhas: dados **corrompidos ou incompatíveis** são recuperados
  automaticamente para o estado inicial (com aviso), sem quebrar a aplicação.
- **“Restaurar demonstração”** (cabeçalho) devolve os dados fictícios originais e **mantém a sessão**.
- Conjunto inicial: **18 produtos** (10 Macramê + 8 Brilho), **32 pedidos** (16 por marca),
  **8 canais** (4 por marca), **41 lançamentos financeiros** (16 manuais + receitas derivadas
  de pedidos) e trilha de atividade inicial.

Nada é enviado para fora do navegador.

---

## Exportação CSV

Os relatórios geram CSV real com **BOM UTF-8** (acentos corretos no Excel) e separador
**`;`** (padrão pt-BR). O download é feito localmente via `Blob`, sem servidor.

---

## Acessibilidade e responsividade

- Layout responsivo; a barra lateral vira *drawer* em telas pequenas.
- Navegação por teclado e rótulos ARIA em controles interativos; modais fecham com `Esc`.
- Paleta suave (off-white/areia, texto marrom escuro, acento terracota), ícones Lucide,
  sem emojis e sem padrões genéricos de “template de IA”.

---

## Limitações (proposital)

- Não há integração real com Nuvemshop, Mercado Livre, Shopee ou TikTok Shop.
- Não há pagamentos, fretes, notas fiscais, e-commerce público ou conta de usuário real.
- A autenticação é uma barreira visual, **sem** valor de segurança.
- O login não é multiusuário nem possui recuperação de senha.
- Dados residem apenas no navegador (limpar o `localStorage` zera a demonstração).

---

## Deploy estático

O build gera arquivos estáticos em `dist/`, prontos para qualquer hospedagem de sites
(Netlify, Vercel, GitHub Pages, S3, IIS, nginx). O uso de **HashRouter** (`#/rota`) garante
que as rotas funcionem sem configuração de *rewrite* no servidor.

```bash
npm run build      # gera dist/
npm run preview    # testa o build localmente
```

---

## Testes

Os testes cobrem as **regras puras** da demonstração (não a interface):

| Arquivo                       | Cobre                                                            |
| ----------------------------- | ---------------------------------------------------------------- |
| `lib/calculations.test.ts`    | níveis de estoque, transições de pedido, KPIs, resumo financeiro, escopo de marca, **período personalizado** (limites exatos, normalização, datas inválidas e agrupamento adaptativo) e **evolução em barras** (granularidade por janela, zeros preservados, cancelados ignorados) |
| `store/reducer.test.ts`       | idempotência de baixa/reposição de estoque, receita única por pedido, cancelamento de lançamento |
| `lib/storage.test.ts`         | carga/salva/reset, sessão, recuperação de dados corrompidos      |
| `lib/demoActions.test.ts`     | determinismo da publicação, validação de configurações           |
| `store/auth.test.ts`          | regras de credenciais demonstrativas                             |

São **74 testes** em 5 arquivos (`npm run test`).

```bash
npm run test
```

---

© Trinary Solutions — protótipo demonstrativo. Dados fictícios; nenhuma integração real está ativa.
