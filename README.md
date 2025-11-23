# Projeto Full-stack

Sistema de gestão de solicitações de serviço técnico com autenticação local segura e painel administrativo protegido.

## 📋 Índice
- [Características](#características)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Configuração](#instalação-e-configuração)
- [Endpoints da API](#endpoints-da-api)
- [Autenticação](#autenticação)
- [Frontend](#frontend)
- [Notas de Desenvolvimento](#notas-de-desenvolvimento)

## ✨ Características

### Front-end
- **Página inicial** (index.html): Hero section, serviços, FAQ accordion, botão flutuante WhatsApp
- **Formulário de solicitação** (form.html): Validação client-side, campo marca com opção "Outra", registro de timestamp
- **Painel do técnico** (dashboard.html): Listagem de solicitações com edição/exclusão via modal, envio de garantia
- **Login** (login.html): Autenticação local segura (usuário/senha)
- **Design responsivo**: Mobile-first, paleta customizada (azul #1a3a52 + laranja #ff6b35)
- **Componentes reutilizáveis**: `api.js` (helper para chamadas fetch), modal, cards

### Back-end
- **Node.js + Express**: Servidor REST com CORS
- **Autenticação de sessão**: express-session com login local (bcrypt)
- **CRUD completo de solicitações**: GET, POST, PATCH, DELETE protegidos por sessão
- **Proteção de rotas**: Middleware `requireAuth` para painel e endpoints sensíveis
- **Variáveis de ambiente**: dotenv para gestão segura de segredos
- **Armazenamento**: Arquivos JSON (`requests.json`, `users.json`)


## 🛠 Tecnologias

**Front-end:**
- HTML5, CSS3 (Flexbox/Grid), JavaScript (Vanilla)
- Google Fonts (Poppins)
- Bootstrap 5 (componentes)

**Back-end:**
- Node.js v18+
- Express.js
- dotenv (variáveis de ambiente)
- express-session (gerenciamento de sessão)
- bcryptjs (hash de senhas)
- cors (políticas de acesso)

## 📁 Estrutura do Projeto

```
Projeto Full-stack/
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── requests.json      # Armazenamento de solicitações (JSON)
│   └── users.json         # Armazenamento de usuários (JSON)
├── frontend/
│   ├── index.html         # Página inicial
│   ├── form.html          # Formulário de solicitação
│   ├── dashboard.html     # Painel do técnico (protegido)
│   ├── login.html         # Página de login
│   ├── style.css          # Estilos globais
│   ├── script.js          # Scripts da página inicial
│   ├── form.js            # Validação e envio do formulário
│   ├── dashboard.js       # Lógica do painel (CRUD)
│   ├── login.js           # Login local + Google
│   └── api.js             # Helper reutilizável para fetch
├── package.json
└── README.md
```

## 🚀 Instalação e Configuração

### 1. Instalar dependências

```powershell
cd "Projeto Full-stack"
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (ou copie de `.env.example`):

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
PORT=3000
SESSION_SECRET=seu-segredo-gerado-aqui
NODE_ENV=development
```

⚠️ **IMPORTANTE**: 
- Gere um `SESSION_SECRET` seguro com: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```


### 3. Executar o servidor

**Modo produção:**
```powershell
npm start

Abra http://localhost:3000

### 4. Usuário padrão (desenvolvimento)

Se 'backend/users.json' não existir, o servidor cria automaticamente:
- **Usuário:** `admin`
- **Senha:** `admin123`

## 📡 Endpoints da API

### Públicos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/services` | Lista serviços disponíveis (estático) |
| POST | `/api/requests` | Cria nova solicitação (clientes) |

### Protegidos (requerem autenticação)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/requests` | Lista todas solicitações |
| PATCH | `/api/requests/:id` | Atualiza solicitação (técnico) |
| DELETE | `/api/requests/:id` | Exclui solicitação (técnico) |
| POST | `/api/requests/:id/send-warranty` | Marca como concluída e gera link garantia |

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------||
| POST | `/login` | Login local (username + password) |
| POST | `/logout` | Encerra sessão |

## 🔐 Autenticação

### Login Local
- Usuários armazenados em `backend/users.json`
- Senhas hasheadas com bcrypt (salt rounds: 10)
- Sessão armazenada em memória (MemoryStore)
- Cookies com `httpOnly`, `sameSite: strict` e `secure` em produção

### Proteção de Rotas
- `/dashboard.html` redireciona para `/login.html` se não autenticado
- Endpoints sensíveis (`GET /api/requests`, `PATCH`, `DELETE`) retornam 401 sem sessão
- Middleware `requireAuth` valida `req.session.user`

## 🎨 Frontend

### Páginas

**index.html** — Página inicial
- Hero section com CTA
- Cards de serviços (carregados via `/api/services`)
- Marcas atendidas
- FAQ 
- Botão flutuante WhatsApp

**form.html** — Formulário de solicitação
- Validação: nome, telefone (11 dígitos), email (formato), campos obrigatórios
- Select marca com opção "Outra" (input dinâmico)
- Timestamp automático (`createdAt`)

**dashboard.html** — Painel do técnico
- Lista solicitações com timestamp formatado (pt-BR)
- Botões: Editar (modal), Excluir (confirmação), Concluir (enviar garantia)
- Modal de edição com formulário completo

**login.html** — Autenticação
- Formulário local (username + password)
- Validação e feedback visual de erros

### API Helper (`api.js`)

```javascript
// GET
await api.get('/api/requests');

// POST
await api.post('/api/requests', { name: 'Cliente', problem: 'Defeito' });

// PATCH
await api.patch('/api/requests/123', { problem: 'Atualizado' });

// DELETE
await api.del('/api/requests/123');
```

## 📝 Notas de Desenvolvimento

### Armazenamento
- Dados em `backend/requests.json` e `backend/users.json` (JSON)


### Sessão
- `express-session` usa MemoryStore (não persiste em restart)
- **Produção:** usar `connect-redis`, `connect-mongo` ou similar

### Segurança
- ⚠️ `SESSION_SECRET` padrão é fraco (apenas dev)
- ⚠️ Sessão sem HTTPS (configurar `cookie.secure` em produção)
- ⚠️ CORS aberto (`app.use(cors())`) — restringir origins em produção
.

### Melhorias Futuras
- [ ] Migrar para banco de dados (SQLite/PostgreSQL)
- [ ] Collection Postman com exemplos
- [ ] Deploy (Heroku, Vercel, Railway)
- [ ] Rate limiting (express-rate-limit)

## 📄 Licença

MIT

---

**Desenvolvido para gestão de solicitações de serviço técnico com foco em simplicidade e segurança.**
