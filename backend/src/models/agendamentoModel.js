const db = require("../config/database");

const STATUS = ["pendente", "confirmado", "cancelado"];
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizar(dados) {
  return {
    cliente: String(dados.cliente ?? "").trim(),
    telefone: String(dados.telefone ?? "").trim(),
    tipo_evento: String(dados.tipo_evento ?? "").trim(),
    data_evento: String(dados.data_evento ?? "").trim(),
    hora_inicio: String(dados.hora_inicio ?? "").trim(),
    hora_fim: String(dados.hora_fim ?? "").trim(),
    convidados: Number(dados.convidados ?? 0),
    valor: Number(dados.valor ?? 0),
    status: String(dados.status ?? "pendente").trim(),
    observacoes: String(dados.observacoes ?? "").trim(),
  };
}

function validar(dados) {
  const erros = [];

  if (dados.cliente.length < 2 || dados.cliente.length > 100) {
    erros.push("Cliente é obrigatório (2 a 100 caracteres).");
  }
  if (dados.telefone.replace(/\D/g, "").length < 10) {
    erros.push("Telefone inválido (informe DDD e número).");
  }
  if (dados.tipo_evento.length < 2 || dados.tipo_evento.length > 60) {
    erros.push("Tipo de evento é obrigatório (2 a 60 caracteres).");
  }
  if (!REGEX_DATA.test(dados.data_evento) || isNaN(Date.parse(dados.data_evento))) {
    erros.push("Data do evento inválida (use AAAA-MM-DD).");
  }
  if (!REGEX_HORA.test(dados.hora_inicio)) {
    erros.push("Hora de início inválida (use HH:MM).");
  }
  if (!REGEX_HORA.test(dados.hora_fim)) {
    erros.push("Hora de término inválida (use HH:MM).");
  }
  if (
    REGEX_HORA.test(dados.hora_inicio) &&
    REGEX_HORA.test(dados.hora_fim) &&
    dados.hora_fim <= dados.hora_inicio
  ) {
    erros.push("A hora de término deve ser maior que a hora de início.");
  }
  if (!Number.isInteger(dados.convidados) || dados.convidados < 0) {
    erros.push("Convidados deve ser um inteiro maior ou igual a zero.");
  }
  if (Number.isNaN(dados.valor) || dados.valor < 0) {
    erros.push("Valor deve ser um número maior ou igual a zero.");
  }
  if (!STATUS.includes(dados.status)) {
    erros.push(`Status deve ser: ${STATUS.join(", ")}.`);
  }
  if (dados.observacoes.length > 500) {
    erros.push("Observações aceitam até 500 caracteres.");
  }

  return erros;
}

function listar({ data, status } = {}) {
  const filtros = [];
  const parametros = [];

  if (data) {
    filtros.push("data_evento = ?");
    parametros.push(data);
  }
  if (status) {
    filtros.push("status = ?");
    parametros.push(status);
  }

  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM agendamentos ${where} ORDER BY data_evento, hora_inicio`)
    .all(...parametros);
}

function buscarPorId(id) {
  return db.prepare("SELECT * FROM agendamentos WHERE id = ?").get(id);
}

function existeConflito({ data_evento, hora_inicio, hora_fim }, ignorarId = null) {
  const linha = db
    .prepare(
      `SELECT id FROM agendamentos
       WHERE data_evento = ?
         AND status != 'cancelado'
         AND hora_inicio < ?
         AND hora_fim > ?
         AND id != ?
       LIMIT 1`
    )
    .get(data_evento, hora_fim, hora_inicio, ignorarId ?? -1);
  return Boolean(linha);
}

function criar(dados) {
  const resultado = db
    .prepare(
      `INSERT INTO agendamentos
        (cliente, telefone, tipo_evento, data_evento, hora_inicio, hora_fim, convidados, valor, status, observacoes)
       VALUES
        (@cliente, @telefone, @tipo_evento, @data_evento, @hora_inicio, @hora_fim, @convidados, @valor, @status, @observacoes)`
    )
    .run(dados);
  return buscarPorId(resultado.lastInsertRowid);
}

function atualizar(id, dados) {
  db.prepare(
    `UPDATE agendamentos SET
      cliente = @cliente,
      telefone = @telefone,
      tipo_evento = @tipo_evento,
      data_evento = @data_evento,
      hora_inicio = @hora_inicio,
      hora_fim = @hora_fim,
      convidados = @convidados,
      valor = @valor,
      status = @status,
      observacoes = @observacoes
     WHERE id = @id`
  ).run({ ...dados, id });
  return buscarPorId(id);
}

function excluir(id) {
  return db.prepare("DELETE FROM agendamentos WHERE id = ?").run(id).changes > 0;
}

module.exports = {
  STATUS,
  normalizar,
  validar,
  listar,
  buscarPorId,
  existeConflito,
  criar,
  atualizar,
  excluir,
};
