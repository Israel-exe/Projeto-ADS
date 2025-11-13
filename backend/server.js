const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const {OAuth2Client} = require('google-auth-library');
const PORT = 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Sessão (apenas dev).
app.use(session({
  secret: process.env.SESSION_SECRET || 'admin123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const DATA_FILE = path.join(__dirname, 'requests.json');
const ID_FILE = path.join(__dirname, 'id-seq.json');
const USERS_FILE = path.join(__dirname, 'users.json');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '812985690793-4gs90ekjgkransfh4mth8bska6ss6kb8.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helpers para leitura/escrita assíncrona do arquivo JSON
async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao ler requests.json:", err);
    return { requests: [] };
  }
}

async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("❌ FALHA CRÍTICA NA GRAVAÇÃO:", err.message);
    throw err;
  }
}

// --------- Helpers de sequência de ID de solicitação ---------
async function getNextRequestId() {
  // Tenta ler o arquivo id-seq primeiro
  try {
    const raw = await fs.readFile(ID_FILE, 'utf8');
    const obj = JSON.parse(raw);
    const next = (obj.lastRequestId || 0) + 1;
    await fs.writeFile(ID_FILE, JSON.stringify({ lastRequestId: next }, null, 2), 'utf8');
    return String(next);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('Aviso ao ler id-seq.json:', err.message);
    // Ainda sem id-seq: deriva dos IDs numéricos existentes (curtos) e inicializa
    const data = await readData();
    const numericIds = (data.requests || [])
      .map(r => (r && r.id != null ? String(r.id) : ''))
      .filter(id => /^\d{1,6}$/.test(id))
      .map(id => parseInt(id, 10));
    const last = numericIds.length ? Math.max(...numericIds) : 0;
    const next = last + 1;
    await fs.writeFile(ID_FILE, JSON.stringify({ lastRequestId: next }, null, 2), 'utf8');
    return String(next);
  }
}

// Helpers de usuários
async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.usuarios)) return parsed.usuarios;
    return [];
  } catch (err) {
    if (err.code === 'ENOENT') return null; // sinaliza que o arquivo não existe
    console.error('Erro ao ler users.json:', err);
    return [];
  }
}

async function writeUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao gravar users.json:', err);
    throw err;
  }
}

// Garante que existe um usuário admin padrão (apenas em dev). Senha: admin123
async function ensureDefaultUser() {
  const users = await readUsers();
  // Só cria um usuário padrão se o arquivo users.json NÃO existir.
  // Se o arquivo existe (mesmo que vazio), não criamos usuários automaticamente.
  if (users === null) {
    const password = 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    const admin = { id: '1', username: 'admin', email: 'admin@local', name: 'Administrador', passwordHash: hash };
    await writeUsers([admin]);
    console.log('Usuário padrão criado: username=admin password=admin123 (apenas dev)');
  }
}

// Middleware: proteger acesso direto ao arquivo estático do dashboard
// Antes de servir arquivos estáticos, interceptamos /dashboard.html
app.use((req, res, next) => {
  if (req.path === '/dashboard.html') {
    if (req.session && req.session.user) return next();
    // Se não autenticado, redireciona para a página de login
    return res.redirect('/login.html');
  }
  next();
});

// Middleware: proteger acesso direto ao arquivo estático do dashboard
// Intercepta antes de servir arquivos estáticos
app.use((req, res, next) => {
  if (req.path === '/dashboard.html' || req.path.startsWith('/dashboard')) {
    if (req.session && req.session.user) return next();
    return res.redirect('/login.html');
  }
  next();
});

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Middleware para proteger rotas
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ mensagem: 'Não autorizado' });
}

// API: listar serviços (estático)
const SERVICES = [
  { id: 1, name: 'Reparo de placa', description: 'Diagnóstico e troca de componentes em placas' },
  { id: 2, name: 'Limpeza e manutenção', description: 'Limpeza interna e manutenção preventiva' },
  { id: 3, name: 'Substituição de peças', description: 'Troca de peças com garantia' }
];

app.get('/api/services', (req, res) => {
  res.json(SERVICES);
});

// Criar nova solicitação de serviço (lead)
app.post('/api/requests', async (req, res) => {
  try {
    const data = await readData();
    const nextId = await getNextRequestId();
    const request = {
      id: nextId,
      name: req.body.name || 'Cliente sem nome',
      phone: req.body.phone || '',
      email: req.body.email || '',
      address: req.body.address || '',
      brand: req.body.brand || '',
      model: req.body.model || '',
      problem: req.body.problem || '',
      preferredTime: req.body.preferredTime || '',
      createdAt: new Date().toISOString(),
      status: 'new'
    };
    data.requests.push(request);
    await writeData(data);
    console.log(`✅ Nova solicitação criada: ID ${request.id}`);
    res.status(201).json(request);
  } catch (error) {
    console.error("❌ Erro ao criar solicitação:", error);
    res.status(500).json({ mensagem: 'Erro interno ao criar solicitação.' });
  }
});

// Buscar todas as solicitações
app.get('/api/requests', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.requests);
  } catch (error) {
    console.error("Erro ao ler solicitações:", error);
    res.status(500).json({ mensagem: 'Erro interno ao buscar solicitações.' });
  }
});

// Marcar solicitação como concluída (garantia desativada temporariamente)
// app.post('/api/requests/:id/send-warranty', requireAuth, async (req, res) => {
//   try {
//     const data = await readData();
//     const reqItem = data.requests.find(r => r.id === req.params.id);
//     if (!reqItem) {
//       console.log(`⚠️ Tentativa de enviar garantia para solicitação não encontrada: ID ${req.params.id}`);
//       return res.status(404).json({ mensagem: 'Solicitação não encontrada' });
//     }
//     // Lógica de garantia desativada
//     res.status(503).json({ mensagem: 'Funcionalidade de garantia temporariamente desativada.' });
//   } catch (error) {
//     console.error("❌ Erro ao processar garantia:", error);
//     res.status(500).json({ mensagem: 'Erro interno.' });
//   }
// });

// Endpoint simples para concluir solicitação
app.post('/api/requests/:id/complete', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    const reqItem = data.requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ mensagem: 'Solicitação não encontrada' });
    reqItem.status = 'completed';
    reqItem.completedAt = new Date().toISOString();
    await writeData(data);
    console.log(`✅ Solicitação ${reqItem.id} marcada como concluída.`);
    res.json({ ok: true, request: reqItem });
  } catch (err) {
    console.error('Erro ao concluir solicitação:', err);
    res.status(500).json({ mensagem: 'Erro interno ao concluir solicitação.' });
  }
});

// Técnico: editar solicitação (protegida)
app.patch('/api/requests/:id', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    const idx = data.requests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ mensagem: 'Solicitação não encontrada' });

    // Permite atualizar apenas um subconjunto seguro de campos
    const allowed = ['name', 'phone', 'email', 'address', 'brand', 'model', 'problem',];
    const item = data.requests[idx];
    for (const key of Object.keys(req.body || {})) {
      if (allowed.includes(key)) item[key] = req.body[key];
    }
    item.updatedAt = new Date().toISOString();
    data.requests[idx] = item;
    await writeData(data);
    console.log(`✏️ Solicitação ${item.id} atualizada pelo técnico ${req.session.user.username}`);
    res.json({ ok: true, request: item });
  } catch (err) {
    console.error('Erro ao atualizar solicitação:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar solicitação.' });
  }
});

// Técnico: excluir uma solicitação (protegida)
app.delete('/api/requests/:id', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    const idx = data.requests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ mensagem: 'Solicitação não encontrada' });
    const removed = data.requests.splice(idx, 1)[0];
    await writeData(data);
    console.log(`🗑️ Solicitação ${removed.id} removida pelo técnico ${req.session.user.username}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir solicitação:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir solicitação.' });
  }
});

// Autenticação: login local
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ mensagem: 'Usuário e senha são obrigatórios' });

  try {
    const users = await readUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ mensagem: 'Credenciais inválidas' });

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(401).json({ mensagem: 'Credenciais inválidas' });

    req.session.user = { id: user.id, username: user.username, name: user.name, email: user.email };
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ mensagem: 'Erro interno no login' });
  }
});

// Deslogar
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Erro ao destruir sessão:', err);
    res.json({ ok: true });
  });
});

// Login com token ID do Google
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body || {};
  if (!id_token) return res.status(400).json({ mensagem: 'id_token é obrigatório' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || payload.email;

    let users = await readUsers();
    let user = users.find(u => u.email === email);
    if (!user) {
      user = { id: Date.now().toString(), username: email, email, name, passwordHash: '' };
      users.push(user);
      await writeUsers(users);
    }

    req.session.user = { id: user.id, username: user.username, name: user.name, email: user.email };
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error('Erro ao verificar token Google:', err);
    res.status(401).json({ mensagem: 'Token inválido' });
  }
});

// Servir dashboard protegido
app.get('/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html'));
});

// Servir arquivos estáticos do frontend (CSS/JS/assets).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Fallback para index.html em rotas SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// INICIA O SERVIDOR
app.listen(PORT, () => {
  ensureDefaultUser().catch(err => console.error('Erro garantindo usuário padrão:', err));
  console.log(`✅ Servidor pronto para receber requisições em http://localhost:${PORT}`);
});
