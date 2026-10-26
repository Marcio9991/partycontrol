const Usuario = require("../models/usuarioModel");

function respostaSessao(usuario) {
  const token = Usuario.criarSessao(usuario.id);
  return { token, nome: usuario.nome || usuario.email, email: usuario.email };
}

exports.registrar = (req, res) => {
  const corpo = req.body || {};
  const dados = {
    nome: String(corpo.nome ?? "").trim().replace(/\s+/g, " "),
    email: Usuario.normalizarEmail(corpo.email),
    senha: String(corpo.senha ?? ""),
  };

  const erros = Usuario.validarCadastro(dados);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  if (Usuario.emailEmUso(dados.email)) {
    return res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
  }

  const usuario = Usuario.criarUsuario(dados);
  res.status(201).json(respostaSessao(usuario));
};

exports.login = (req, res) => {
  const { email, senha } = req.body || {};

  if (!String(email ?? "").trim() || !String(senha ?? "")) {
    return res.status(400).json({ erro: "Informe e-mail e senha." });
  }

  const encontrado = Usuario.verificarCredenciais(email, senha);
  if (!encontrado) return res.status(401).json({ erro: "E-mail ou senha incorretos." });

  res.status(200).json(respostaSessao(encontrado));
};

exports.logout = (req, res) => {
  Usuario.removerSessao(req.token);
  res.status(204).send();
};

exports.sessao = (req, res) => {
  const { nome, email } = req.usuario;
  res.status(200).json({ nome: nome || email, email });
};
