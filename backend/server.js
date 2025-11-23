require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Validar SESSION_SECRET
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('❌ ERRO: SESSION_SECRET não definido ou muito curto.');
  console.error('Configure um SESSION_SECRET com no mínimo 32 caracteres no arquivo .env');
  console.error('Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();
const corsOptions = {
  origin:  function (origin, callback) {
    // Permitir requests sem origin (ex: Postman, curl)
    if (!origin) return callback(null, true);

const allowedOrigins = ['http://localhost:3000', 'http://192.168.0.8:3000',]
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Requisição CORS bloqueada de origem não permitida: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  maxAge: 86400
};
app.use(cors(corsOptions));
app.use(express.json());

// HTTPS Redirect - Força HTTPS em produção
app.use((req, res, next) => {
  // Só ativa em produção
  if (process.env.NODE_ENV !== 'production') return next();
  
  // Verifica se a requisição já está em HTTPS
  // req.secure: Express detecta HTTPS
  // req.headers['x-forwarded-proto']: Header de proxy reverso (Render, Heroku, etc)
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  if (!isHttps) {
    // Constrói URL HTTPS e redireciona
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    console.log(`🔒 Redirecionando HTTP → HTTPS: ${req.url}`);
    return res.redirect(301, httpsUrl); // 301 = Permanent redirect
  }
  
  next();
});

// Sessão com segurança melhorada
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

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
    const requestData = {
      name: req.body.name || 'Cliente sem nome',
      phone: req.body.phone || '',
      email: req.body.email || '',
      address: req.body.address || '',
      brand: req.body.brand || '',
      model: req.body.model || '',
      problem: req.body.problem || '',
      preferred_time: req.body.preferredTime || ''
    };
    const id = await db.createRequest(requestData);
    const request = await db.getRequestById(id);
    console.log(`✅ Nova solicitação criada: ID ${id}`);
    res.status(201).json(request);
  } catch (error) {
    console.error("❌ Erro ao criar solicitação:", error);
    res.status(500).json({ mensagem: 'Erro interno ao criar solicitação.' });
  }
});

// Buscar todas as solicitações
app.get('/api/requests', requireAuth, async (req, res) => {
  try {
    const requests = await db.getAllRequests();
    res.json(requests);
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
    const success = await db.completeRequest(parseInt(req.params.id));
    if (!success) return res.status(404).json({ mensagem: 'Solicitação não encontrada' });
    const request = await db.getRequestById(parseInt(req.params.id));
    console.log(`✅ Solicitação ${request.id} marcada como concluída.`);
    res.json({ ok: true, request });
  } catch (err) {
    console.error('Erro ao concluir solicitação:', err);
    res.status(500).json({ mensagem: 'Erro interno ao concluir solicitação.' });
  }
});

// Técnico: editar solicitação (protegida)
app.patch('/api/requests/:id', requireAuth, async (req, res) => {
  try {
    const success = await db.updateRequest(parseInt(req.params.id), req.body);
    if (!success) return res.status(404).json({ mensagem: 'Solicitação não encontrada' });
    const request = await db.getRequestById(parseInt(req.params.id));
    console.log(`✏️ Solicitação ${request.id} atualizada pelo técnico ${req.session.user.username}`);
    res.json({ ok: true, request });
  } catch (err) {
    console.error('Erro ao atualizar solicitação:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar solicitação.' });
  }
});

// Técnico: excluir uma solicitação (protegida)
app.delete('/api/requests/:id', requireAuth, async (req, res) => {
  try {
    const success = await db.deleteRequest(parseInt(req.params.id));
    if (!success) return res.status(404).json({ mensagem: 'Solicitação não encontrada' });
    console.log(`🗑️ Solicitação ${req.params.id} removida pelo técnico ${req.session.user.username}`);
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
    const user = await db.findUserByUsername(username);
    if (!user) return res.status(401).json({ mensagem: 'Credenciais inválidas' });

    const ok = bcrypt.compareSync(password, user.password_hash);
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
async function startServer() {
  try {
    // Inicializar banco de dados
    await db.initDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Servidor pronto para receber requisições em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

// Export para Vercel
module.exports = app;
