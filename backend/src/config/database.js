const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "..", "..", "database.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    nome_chave TEXT NOT NULL,
    cliente TEXT NOT NULL,
    telefone TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    data_evento TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    convidados INTEGER NOT NULL DEFAULT 0,
    valor REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente',
    observacoes TEXT DEFAULT '',
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    senha_sal TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    expira_em INTEGER NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  );
`);

const colunasUsuarios = db.prepare("PRAGMA table_info(usuarios)").all().map((c) => c.name);

if (colunasUsuarios.includes("usuario") && !colunasUsuarios.includes("email")) {
  db.exec("ALTER TABLE usuarios RENAME COLUMN usuario TO email");
}
if (!colunasUsuarios.includes("nome")) {
  db.exec("ALTER TABLE usuarios ADD COLUMN nome TEXT NOT NULL DEFAULT ''");
}

const colunas = db.prepare("PRAGMA table_info(agendamentos)").all().map((c) => c.name);

if (!colunas.includes("nome")) {
  db.exec(`
    ALTER TABLE agendamentos ADD COLUMN nome TEXT NOT NULL DEFAULT '';
    ALTER TABLE agendamentos ADD COLUMN nome_chave TEXT NOT NULL DEFAULT '';
    UPDATE agendamentos SET nome = 'Agendamento ' || id, nome_chave = 'agendamento ' || id;
  `);
}

db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamentos_nome_chave ON agendamentos (nome_chave)");

module.exports = db;
