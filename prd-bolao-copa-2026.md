# Product Requirement Document (PRD) - Bolão da Copa 2026

## 1. Visão Geral
O **Bolão da Copa 2026** é uma plataforma web voltada para a criação e gestão de competições casuais de palpites (bolões) para a Copa do Mundo FIFA 2026. O foco é proporcionar uma experiência gamificada e social entre amigos, colegas de trabalho e pequenas comunidades.

## 2. Público-Alvo
*   Competidores casuais: Grupos de amigos e familiares.
*   Comunidades locais: Pequenas empresas ou clubes sociais que desejam organizar suas próprias ligas.

## 3. Proposta de Valor & Diferenciais
*   **Simulador Integrado:** Funcionalidade de simular toda a Copa e exportar esses resultados como palpites diretos para as ligas.
*   **Ranking em Tempo Real:** Atualização dinâmica de pontuações e posições conforme os jogos ocorrem.
*   **Gestão de Ligas Flexível:** Criação de ligas privadas e públicas com diferentes níveis de planos.

## 4. Requisitos Funcionais

### 4.1. Gestão de Ligas (Core)
*   **Criação de Ligas:** O usuário pode criar ligas, definir imagens, descrições e regras de pontuação.
*   **Planos de Ligas:** Monetização baseada na capacidade da liga:
    *   FREE, VIP_BASIC, VIP, VIP_MASTER, VIP_UNLIMITED.
*   **Convites e Solicitações:** Sistema para convidar amigos por e-mail ou aprovar solicitações de entrada em ligas privadas.

### 4.2. Simulador e Palpites
*   **Simulação Completa:** Interface visual para prever resultados de todas as fases (Grupos até a Final).
*   **Exportação de Palpites:** Botão "Exportar" que injeta as previsões do simulador na base de dados das ligas do usuário.
*   **Palpites Individuais:** Edição manual de palpites jogo a jogo.

### 4.3. Ranking e Resultados
*   **Tabela da Copa:** Visualização atualizada da classificação real do torneio.
*   **Ranking de Ligas:** Dashboard mostrando a pontuação de todos os participantes da liga, calculada com base em critérios como:
    *   Placar exato, saldo de gols, vencedor e empate.

### 4.4. Usuários e Perfis
*   **Autenticação:** Cadastro e Login via Supabase.
*   **Perfil Pro:** Diferenciação de usuários com planos especiais (PRO) e datas de expiração.
*   **Personalização:** Upload de avatar e configurações de notificações.

### 4.5. Administração
*   **Painel Administrativo:** Gestão centralizada de jogos, times e moderação de ligas por administradores do sistema.

## 5. Requisitos Não-Funcionais
*   **Performance:** Cálculos de ranking e atualizações devem ser otimizados para tempo real.
*   **Escalabilidade:** Suporte a múltiplos usuários simultâneos durante os picos de jogos.
*   **Responsividade:** Interface otimizada para dispositivos móveis (foco mobile-first).
*   **Segurança:** Proteção de rotas administrativas e integridade dos dados de pagamento via integração futura (Mercado Pago).

## 6. Stack Tecnológica
*   **Frontend:** React 19 + Vite + TypeScript.
*   **Estilização:** CSS Moderno / Lucide Icons.
*   **Backend & DB:** Supabase (Auth, PostgreSQL DB, Storage).
*   **Infra:** Cloudflare Pages (implied by wrangler.json/deploy docs).

## 7. Critérios de Sucesso
*   Capacidade de exportar palpites do simulador sem erros.
*   Ranking atualizado em menos de 5 segundos após a inserção do resultado de um jogo.
*   Fluxo de criação de ligas VIP funcionando com validação de limites de participantes.
