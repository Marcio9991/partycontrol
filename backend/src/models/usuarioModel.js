const crypto = require("crypto");
const db = require("../config/database");
const { chaveEmail } = require("../utils/email");

const DURACAO_SESSAO_MS = 7 * 24 * 60 * 60 * 1000;
const REGEX_GMAIL = /^[a-z0-9._%+-]+@gmail\.com$/;

function normalizarEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function gerarHash(senha, sal) {
  return crypto.scryptSync(senha, sal, 64).toString("hex");
}

function validarCadastro({ nome, email, senha }) {
  const erros = [];

  if (nome.length < 2 || nome.length > 80) {
    erros.push("Nome é obrigatório (2 a 80 caracteres).");
  }
  if (!REGEX_GMAIL.test(email)) {
    erros.push("Informe um e-mail do Gmail válido (exemplo: nome@gmail.com).");
  }
  if (senha.length < 6 || senha.length > 100) {
    erros.push("A senha deve ter de 6 a 100 caracteres.");
  }

  return erros;
}

function emailEmUso(email) {
  return Boolean(db.prepare("SELECT id FROM usuarios WHERE email_chave = ?").get(chaveEmail(email)));
}

function criarUsuario({ nome, email, senha }) {
  const sal = crypto.randomBytes(16).toString("hex");
  const resultado = db
    .prepare("INSERT INTO usuarios (nome, email, email_chave, senha_hash, senha_sal) VALUES (?, ?, ?, ?, ?)")
    .run(nome, email, chaveEmail(email), gerarHash(senha, sal), sal);
  return { id: Number(resultado.lastInsertRowid), nome, email };
}

function verificarCredenciais(email, senha) {
  const linha = db
    .prepare("SELECT * FROM usuarios WHERE email_chave = ?")
    .get(chaveEmail(email));
  if (!linha) return null;

  const calculado = Buffer.from(gerarHash(String(senha ?? ""), linha.senha_sal), "hex");
  const esperado = Buffer.from(linha.senha_hash, "hex");
  if (calculado.length !== esperado.length || !crypto.timingSafeEqual(calculado, esperado)) {
    return null;
  }

  return { id: linha.id, nome: linha.nome, email: linha.email };
}

function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessoes WHERE expira_em < ?").run(Date.now());
  db.prepare("INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)").run(
    token,
    usuarioId,
    Date.now() + DURACAO_SESSAO_MS
  );
  return token;
}

function buscarSessao(token) {
  if (!token) return null;
  return (
    db
      .prepare(
        `SELECT u.id, u.nome, u.email FROM sessoes s
         JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token = ? AND s.expira_em > ?`
      )
      .get(token, Date.now()) || null
  );
}

function removerSessao(token) {
  db.prepare("DELETE FROM sessoes WHERE token = ?").run(token);
}

module.exports = {
  normalizarEmail,
  validarCadastro,
  emailEmUso,
  criarUsuario,
  verificarCredenciais,
  criarSessao,
  buscarSessao,
  removerSessao,
};
