# Veloz — Locadora de veículos

Site de locação de veículos com cadastro, login, reservas e área do vendedor, integrado a um banco de dados na nuvem. Este repositório também documenta os **6 ambientes de desenvolvimento** visitados no Trabalho 6.

**Site publicado:** https://main.d1z6yy2vi5t54z.amplifyapp.com/

**Equipe:** João Victor e Vinicius Lobo

---

## 1. O projeto

### Funcionalidades
- **Catálogo** de 6 veículos, com busca por modelo, filtro por categoria e ordenação por preço.
- **Reserva** com datas, adicionais, valor estimado e validação de CPF. Funciona para visitante e para cliente logado.
- **Conta do cliente:** cadastro e login com e-mail e senha; a página "Minha conta" mostra as reservas feitas por ele.
- **Área do vendedor** (só para quem tem o perfil de vendedor): cadastro de clientes por **CPF ou RG**, com máscara, validação e bloqueio de duplicados; lista das solicitações de reserva e mudança de status (aguardando, confirmada, cancelada).
- **Segurança por perfil:** cada vendedor vê somente os seus clientes; visitante só consegue criar reservas.

> Os valores e a disponibilidade exibidos são ilustrativos, e o contato do rodapé é demonstrativo.

### Tecnologias
| Camada | Tecnologia |
|---|---|
| Site | HTML, CSS e JavaScript puro (sem framework) |
| Autenticação e banco | Supabase (Auth + Postgres com RLS) |
| Hospedagem | AWS Amplify |
| Fotos dos carros | Wikimedia Commons (CC BY-SA), com foto reserva se alguma não carregar |

### Como rodar localmente
```bash
python -m http.server 3000 --directory site
```
Abra `http://localhost:3000`. Também funciona com o **Live Server** do VS Code (já configurado para a porta 3000).

### Estrutura de pastas
```
site/            Código do site (index.html, style.css, script.js)
01_gestao/       Backlog do Trello (CSV) e guia
02_design/       Tokens de design e wireframes em SVG (Figma)
03_desenvolvimento/  Guia do VS Code
04_banco/        SQL do Supabase, dados de demonstração e diagrama ER
05_testes/       Testes automatizados com Selenium
06_servidor/     Execução local e hospedagem na Amplify
prints/          Capturas de tela usadas como evidência
.vscode/         Configuração do VS Code da equipe
```

---

## 2. Os 6 ambientes de desenvolvimento

| # | Ambiente | Ferramenta | Responsável | Pasta |
|---|---|---|---|---|
| 1 | Gestão de tarefas | Trello | João Victor | `01_gestao/` |
| 2 | Design de interfaces | Figma | Vinicius Lobo | `02_design/` |
| 3 | Desenvolvimento | Visual Studio Code | João Victor e Vinicius Lobo | `03_desenvolvimento/` |
| 4 | Gestão de banco de dados | Supabase | João Victor e Vinicius Lobo | `04_banco/` |
| 5 | Testes | Selenium | Vinicius Lobo | `05_testes/` |
| 6 | Execução e servidores web | Servidor local e AWS Amplify | João Victor e Vinicius Lobo | `06_servidor/` |

Os ambientes 3, 4 e 6 aproveitam o projeto da locadora; os ambientes 1, 2 e 5 foram trabalho novo.

---

### 2.1 Gestão de tarefas — Trello
**Como foi usado:** criamos o quadro "Veloz — Locadora" com três listas (**A fazer**, **Em andamento** e **Concluído**). As tarefas do projeto viraram **20 cartões**, com descrição, checklist e etiquetas por assunto (frontend, banco, auth, testes...). Cada cartão foi atribuído ao membro responsável, e o filtro por membro permitiu ver as tarefas de cada um. O backlog completo está em `01_gestao/backlog_veloz.csv`.


### 2.2 Design de interfaces — Figma
**Como foi usado:** importamos 3 telas em SVG (home, frota e painel do vendedor no celular), criamos estilos de cor e de texto com os valores do site (`02_design/design_tokens.md`) e transformamos o cartão de veículo e os botões em componentes. Também montamos um protótipo clicável do fluxo de reserva. 


### 2.3 Desenvolvimento — Visual Studio Code
**Como foi usado:** o site foi desenvolvido no VS Code, com a pasta `.vscode/` compartilhada (extensões recomendadas, formatação ao salvar, Live Server na porta 3000, depurador no Chrome e tarefas para o servidor e os testes). Detalhes em `03_desenvolvimento/README.md`.


### 2.4 Gestão de banco de dados — Supabase
**Como foi usado:** o Supabase é o banco (Postgres) e o serviço de autenticação do site. Usamos o **Table Editor** para ver e editar os dados, o **SQL Editor** para criar a estrutura e rodar consultas, **Authentication** para os usuários, **Policies** para a segurança e **Logs** para acompanhar as requisições.

**Tabelas:**
| Tabela | Conteúdo |
|---|---|
| `profiles` | Um perfil por usuário, com a `role` (`customer` ou `seller`) |
| `reservations` | Solicitações de reserva |
| `seller_customers` | Clientes cadastrados pelos vendedores (CPF ou RG) |

**Segurança (RLS):** 9 políticas. Visitante só cria reservas; cliente lê só as suas; vendedor lê as reservas, muda o status e gerencia só os seus clientes. Ninguém altera a própria `role` pelo site, e a promoção a vendedor é feita só no SQL Editor. Quadro completo e diagrama ER em `04_banco/er_diagrama.md`. Scripts em `04_banco/` (`supabase_setup.sql`, `seed_demo.sql` e `limpar_demo.sql`).


### 2.5 Testes — Selenium
**Como foi usado:** testes automáticos (Selenium + pytest) abrem o site num navegador e simulam o usuário. São **16 verificações** em `05_testes/test_veloz.py`: catálogo, busca, filtros, ordenação, reserva (CPF inválido, datas), cadastro, login, área do vendedor e menu do celular. Os testes não gravam nada no banco.

```bash
cd 05_testes
pip install -r requirements.txt
pytest
```
Para testar o site publicado: `VELOZ_URL=https://main.d1z6yy2vi5t54z.amplifyapp.com/ pytest`. Para ver o navegador: `HEADLESS=0 pytest`.

**Evidências:**

### 2.6 Execução e servidores web — servidor local e AWS Amplify
**Como foi usado:** o site roda em **três ambientes**. No servidor local, para desenvolver e testar. Na **AWS Amplify**, que hospeda o site na internet. E no **Supabase**, que responde às chamadas de autenticação e banco feitas pelo navegador. Para o link de confirmação de e-mail funcionar, o endereço da Amplify foi cadastrado no Supabase (*Authentication → URL Configuration*). Detalhes em `06_servidor/README.md`.


---

## 3. Dificuldades e como resolvemos

| Problema | Causa | Solução |
|---|---|---|
| Link de confirmação de e-mail abria "Não é possível acessar o site" | O link apontava para `localhost:3000`, que só existe no computador de quem desenvolve | Trocar pelo endereço público do site na configuração de autenticação |
| "Muitas tentativas ou e-mails enviados" ao cadastrar | O envio de e-mails padrão do Supabase tem limite baixo para o projeto inteiro | Desligar a confirmação por e-mail nos testes; para uso real, configurar um serviço de e-mail próprio (SMTP) |
| Erro `column "end_date" does not exist` ao rodar o SQL | Já existia uma tabela `reservations` antiga com colunas diferentes, e `create table if not exists` não a altera | O script passou a detectar a tabela antiga e a recriá-la quando está vazia (e a parar sem apagar se tiver dados) |
| Erro de sintaxe em uma linha de comentário do SQL | Ao copiar o arquivo, o `--` do começo do comentário foi perdido | O SQL foi entregue sem nenhum comentário |
| Risco de o site quebrar se a biblioteca do Supabase não carregasse | A biblioteca vinha de uma CDN sem versão fixa | Fixar a versão e deixar uma segunda fonte como plano B; o site continua abrindo mesmo se ela falhar |

---

## 4. Segurança e limites
- O site usa **somente a chave pública (publishable)** do Supabase. A chave `service_role` nunca foi colocada no código.
- Os preços dos carros ficam no `script.js`, e o navegador envia o valor total para o banco. Para um sistema comercial, o ideal é guardar os veículos numa tabela e calcular o total no servidor.

- Evidências:

- TESTE SELENIUM:

<img width="1917" height="1041" alt="teste-selenium" src="https://github.com/user-attachments/assets/c820ac61-1048-4376-bba0-eb3a6db8ad4b" />

-SERVIDOR LOCAL:

<img width="1917" height="1078" alt="servidor local" src="https://github.com/user-attachments/assets/1ab1d994-04e3-48aa-8516-f917bbdeae0d" />

-SITE EM FUNCIONAMENTO:

<img width="1908" height="1016" alt="site funcionando" src="https://github.com/user-attachments/assets/f37ded78-3013-4b40-a622-f529bf2e6c4e" />

-Cartões do Trello:

<img width="1917" height="1071" alt="trello--cartão" src="https://github.com/user-attachments/assets/4ca0b17e-cba8-4a08-8dbb-32c5e59255ba" />

-membros:

<img width="1896" height="962" alt="membros" src="https://github.com/user-attachments/assets/8bb29348-5958-4ce5-9513-2ec91fb8053b" />

-Quadro no Trello:

<img width="1915" height="1078" alt="trello--quadro" src="https://github.com/user-attachments/assets/6a3bbe33-05b9-4b56-9042-2b32e53287b8" />




