const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

// ==================== SCHEMA ====================

async function initDatabase() {
  try {
    // Tabela de usuários
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela de solicitações
    await sql`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT,
        problem TEXT NOT NULL,
        preferred_time TEXT,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `;

    console.log('✅ Banco de dados inicializado');

    // Criar usuário admin padrão se não existir
    await createDefaultUser();
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    throw error;
  }
}

// ==================== USERS ====================

async function createDefaultUser() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    
    if (result.rows[0].count === '0') {
      const password = 'admin123';
      const hash = bcrypt.hashSync(password, 10);
      
      await sql`
        INSERT INTO users (username, email, name, password_hash) 
        VALUES (${'admin'}, ${'admin@local'}, ${'Administrador'}, ${hash})
      `;
      
      console.log('✅ Usuário padrão criado: username=admin password=admin123');
    }
  } catch (error) {
    console.error('⚠️ Erro ao criar usuário padrão:', error);
  }
}

async function findUserByUsername(username) {
  const result = await sql`SELECT * FROM users WHERE username = ${username}`;
  return result.rows[0] || null;
}

async function findUserByEmail(email) {
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result.rows[0] || null;
}

async function createUser(username, email, name, passwordHash) {
  const result = await sql`
    INSERT INTO users (username, email, name, password_hash) 
    VALUES (${username}, ${email}, ${name}, ${passwordHash})
    RETURNING id
  `;
  return result.rows[0].id;
}

async function getAllUsers() {
  const result = await sql`
    SELECT id, username, email, name, created_at FROM users
  `;
  return result.rows;
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

async function getAllRequests() {
  const result = await sql`
    SELECT * FROM requests ORDER BY created_at DESC
  `;
  return result.rows.map(convertRequestToCamelCase);
}

async function getRequestById(id) {
  const result = await sql`
    SELECT * FROM requests WHERE id = ${id}
  `;
  return convertRequestToCamelCase(result.rows[0]);
}

async function createRequest(data) {
  const result = await sql`
    INSERT INTO requests 
    (name, phone, email, address, brand, model, problem, preferred_time, status)
    VALUES (
      ${data.name},
      ${data.phone},
      ${data.email || null},
      ${data.address},
      ${data.brand},
      ${data.model || null},
      ${data.problem},
      ${data.preferred_time || null},
      ${data.status || 'new'}
    )
    RETURNING id
  `;
  
  return result.rows[0].id;
}

async function updateRequest(id, data) {
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

  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data || {})) {
    const column = fieldMap[key];
    if (column) {
      updates.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) return false;

  // Adiciona updated_at
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `UPDATE requests SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
  
  const result = await sql.query(query, values);
  return result.rowCount > 0;
}

async function deleteRequest(id) {
  const result = await sql`
    DELETE FROM requests WHERE id = ${id}
  `;
  return result.rowCount > 0;
}

async function completeRequest(id) {
  const result = await sql`
    UPDATE requests 
    SET status = 'completed', 
        completed_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
  return result.rowCount > 0;
}

// ==================== EXPORTS ====================

module.exports = {
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
