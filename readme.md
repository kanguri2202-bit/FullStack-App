# Veloz — Locadora de veículos

Projeto acadêmico com frontend HTML/CSS/JavaScript, backend Node.js + Express, API REST, SQLite, autenticação JWT e testes automatizados.

## Requisitos
- Node.js 20 ou superior
- npm

## Executar localmente (localhost é apenas para desenvolvimento)
1. Abra um terminal nesta pasta.
2. Execute `npm install`.
3. Copie `.env.example` para `.env` e defina um `JWT_SECRET` longo e aleatório.
4. Execute `npm start`.
5. Acesse `http://localhost:3000`.

O banco SQLite é criado automaticamente em `data/veloz.sqlite`.

## Testes formais dos serviços
Execute `npm test`. Os testes verificam health check, cadastro/login, proteção de rota, cadastro e exclusão de cliente, criação e validação de reservas.

## Principais rotas REST
| Método | Rota | Acesso | Função |
|---|---|---|---|
| GET | `/api/health` | Público | Verifica serviço |
| GET | `/api/vehicles` | Público | Lista veículos |
| POST | `/api/sellers/register` | Público | Cadastra vendedor |
| POST | `/api/sellers/login` | Público | Autentica vendedor |
| GET | `/api/sellers/me` | JWT | Consulta sessão |
| GET | `/api/customers` | JWT | Lista clientes do vendedor autenticado |
| POST | `/api/customers` | JWT | Cadastra cliente |
| DELETE | `/api/customers/:id` | JWT | Exclui cliente próprio |
| POST | `/api/reservations` | Público | Registra solicitação de reserva |
| GET | `/api/reservations` | JWT | Lista reservas (painel interno) |

## Publicação
O AWS Amplify Hosting publica o frontend estático, mas não executa este servidor Node.js/SQLite. Para a aplicação completa funcionar em produção, hospede o projeto Node.js em uma instância Amazon EC2 (ou outro serviço compatível), configure `PORT` e `JWT_SECRET`, mantenha o SQLite em armazenamento persistente e sirva frontend e API pelo mesmo domínio. Não use o segredo de desenvolvimento em produção.

## Observações
- `localhost` só é acessível na própria máquina. A entrega deve usar uma URL pública da AWS.
- Para produção com vários servidores/instâncias, prefira RDS em vez de SQLite local.
- O cadastro de cliente e os dados pessoais devem ser usados apenas em ambiente acadêmico/demonstração com dados fictícios até implementar política de privacidade, controle operacional e medidas LGPD.
