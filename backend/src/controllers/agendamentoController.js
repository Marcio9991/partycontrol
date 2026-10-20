const Agendamento = require("../models/agendamentoModel");

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function verificarRegras(dados, ignorarId = null) {
  const erros = Agendamento.validar(dados);
  if (erros.length) return { status: 400, erro: erros.join(" ") };

  if (Agendamento.nomeEmUso(dados.nome_chave, ignorarId)) {
    return { status: 409, erro: "Já existe um agendamento com esse nome. Escolha outro." };
  }

  if (dados.status !== "cancelado" && Agendamento.existeConflito(dados, ignorarId)) {
    return { status: 409, erro: "Já existe um agendamento nesse horário." };
  }

  return null;
}

exports.tipos = (req, res) => {
  res.status(200).json(Agendamento.TIPOS_EVENTO);
};

exports.listar = (req, res) => {
  const { data, status, busca } = req.query;
  res.status(200).json(Agendamento.listar({ data, status, busca }));
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
  const problema = verificarRegras(dados);
  if (problema) return res.status(problema.status).json({ erro: problema.erro });

  res.status(201).json(Agendamento.criar(dados));
};

exports.atualizar = (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  if (!Agendamento.buscarPorId(id)) {
    return res.status(404).json({ erro: "Agendamento não encontrado." });
  }

  const dados = Agendamento.normalizar(req.body);
  const problema = verificarRegras(dados, id);
  if (problema) return res.status(problema.status).json({ erro: problema.erro });

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
