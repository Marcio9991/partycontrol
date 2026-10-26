const Usuario = require("../models/usuarioModel");

function extrairToken(req) {
  const cabecalho = req.headers.authorization || "";
  return cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : null;
}

function exigirLogin(req, res, next) {
  const token = extrairToken(req);
  const usuario = Usuario.buscarSessao(token);

  if (!usuario) return res.status(401).json({ erro: "Sessão inválida ou expirada. Faça login." });

  req.usuario = usuario;
  req.token = token;
  next();
}

module.exports = { exigirLogin, extrairToken };
