const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.db');
const db = new Database(DB_PATH);

// Habilitar chaves estrangeiras e otimizações
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ==================== SCHEMA ====================

function initDatabase() {
  // Tabela de usuários
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabela de solicitações
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT,
      problem TEXT NOT NULL,
      preferred_time TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      completed_at TEXT
    )
  `);

  console.log('✅ Banco de dados inicializado');

  // Criar usuário admin padrão se não existir
  createDefaultUser();
}

// ==================== USERS ====================

function createDefaultUser() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get();
  
  if (result.count === 0) {
    const password = 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    
    const insert = db.prepare(
      'INSERT INTO users (username, email, name, password_hash) VALUES (?, ?, ?, ?)'
    );
    
    insert.run('admin', 'admin@local', 'Administrador', hash);
    console.log('✅ Usuário padrão criado: username=admin password=admin123');
  }
}

function findUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

function findUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

function createUser(username, email, name, passwordHash) {
  const stmt = db.prepare(
    'INSERT INTO users (username, email, name, password_hash) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(username, email, name, passwordHash);
  return result.lastInsertRowid;
}

function getAllUsers() {
  const stmt = db.prepare('SELECT id, username, email, name, created_at FROM users');
  return stmt.all();
}

// ==================== REQUESTS ====================

// Converter snake_case para camelCase para compatibilidade com frontend
function convertRequestToCamelCase(req) {
  if (!req) return null;
  return {
    id: req.id,
    name: req.name,
    phone: req.phone,
    email: req.email,
    address: req.address,
    brand: req.brand,
    model: req.model,
    problem: req.problem,
    preferredTime: req.preferred_time,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    completedAt: req.completed_at
  };
}

function getAllRequests() {
  const stmt = db.prepare('SELECT * FROM requests ORDER BY created_at DESC');
  const rows = stmt.all();
  return rows.map(convertRequestToCamelCase);
}

function getRequestById(id) {
  const stmt = db.prepare('SELECT * FROM requests WHERE id = ?');
  const row = stmt.get(id);
  return convertRequestToCamelCase(row);
}

function createRequest(data) {
  const stmt = db.prepare(`
    INSERT INTO requests 
    (name, phone, email, address, brand, model, problem, preferred_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    data.name,
    data.phone,
    data.email || null,
    data.address,
    data.brand,
    data.model || null,
    data.problem,
    data.preferred_time || null,
    data.status || 'new'
  );
  
  return result.lastInsertRowid;
}

function updateRequest(id, data) {
  // Mapeamento de campos recebidos para colunas do banco
  const fieldMap = {
    name: 'name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    brand: 'brand',
    model: 'model',
    problem: 'problem',
    preferredTime: 'preferred_time'
  };

  const sets = [];
  const params = [];

  for (const [key, value] of Object.entries(data || {})) {
    const column = fieldMap[key];
    if (column) {
      sets.push(`${column} = ?`);
      params.push(value);
    }
  }

  if (sets.length === 0) return false; // nada para atualizar

  // Usa CURRENT_TIMESTAMP para evitar problemas de aspas em datetime('now')
  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `UPDATE requests SET ${sets.join(', ')} WHERE id = ?`;
  console.log('DEBUG updateRequest SQL =>', sql, 'PARAMS =>', params);
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes > 0;
}

function deleteRequest(id) {
  const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function completeRequest(id) {
  const stmt = db.prepare(`
    UPDATE requests 
    SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `);
  const result = stmt.run(id);
  return result.changes > 0;
}

// ==================== EXPORTS ====================

module.exports = {
  db,
  initDatabase,
  // Users
  findUserByUsername,
  findUserByEmail,
  createUser,
  getAllUsers,
  // Requests
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  completeRequest
};
