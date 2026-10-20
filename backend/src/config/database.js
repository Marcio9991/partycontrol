const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "..", "..", "database.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

module.exports = db;
