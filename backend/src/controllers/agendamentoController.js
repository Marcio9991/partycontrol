const Agendamento = require("../models/agendamentoModel");

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

exports.listar = (req, res) => {
  const { data, status } = req.query;
  res.status(200).json(Agendamento.listar({ data, status }));
};

exports.buscar = (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const agendamento = Agendamento.buscarPorId(id);
  if (!agendamento) return res.status(404).json({ erro: "Agendamento não encontrado." });

  res.status(200).json(agendamento);
};

exports.criar = (req, res) => {
  const dados = Agendamento.normalizar(req.body);
  const erros = Agendamento.validar(dados);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  if (dados.status !== "cancelado" && Agendamento.existeConflito(dados)) {
    return res.status(409).json({ erro: "Já existe um agendamento nesse horário." });
  }

  res.status(201).json(Agendamento.criar(dados));
};

exports.atualizar = (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  if (!Agendamento.buscarPorId(id)) {
    return res.status(404).json({ erro: "Agendamento não encontrado." });
  }

  const dados = Agendamento.normalizar(req.body);
  const erros = Agendamento.validar(dados);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  if (dados.status !== "cancelado" && Agendamento.existeConflito(dados, id)) {
    return res.status(409).json({ erro: "Já existe um agendamento nesse horário." });
  }

  res.status(200).json(Agendamento.atualizar(id, dados));
};

exports.excluir = (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  if (!Agendamento.excluir(id)) {
    return res.status(404).json({ erro: "Agendamento não encontrado." });
  }

  res.status(204).send();
};
