const db = require("../config/database");
const { normalizarTexto, combinaBusca } = require("../utils/texto");

const STATUS = ["pendente", "confirmado", "cancelado"];
const TIPOS_EVENTO = [
  "Aniversário",
  "Casamento",
  "Formatura",
  "Chá de bebê",
  "Chá de panela",
  "Confraternização",
  "Batizado",
  "Reunião",
  "Outro",
];
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function formatarTelefone(valor) {
  const d = String(valor ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

function normalizar(dados) {
  const nome = String(dados.nome ?? "").trim().replace(/\s+/g, " ");
  return {
    nome,
    nome_chave: normalizarTexto(nome),
    cliente: String(dados.cliente ?? "").trim(),
    telefone: formatarTelefone(dados.telefone),
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

  if (dados.nome.length < 3 || dados.nome.length > 80) {
    erros.push("Nome do agendamento é obrigatório (3 a 80 caracteres).");
  }
  if (dados.cliente.length < 2 || dados.cliente.length > 100) {
    erros.push("Cliente é obrigatório (2 a 100 caracteres).");
  }
  const digitos = dados.telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 11) {
    erros.push("Telefone inválido (informe DDD e número).");
  }
  if (!TIPOS_EVENTO.includes(dados.tipo_evento)) {
    erros.push("Tipo de evento inválido.");
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

function listar({ data, status, busca } = {}) {
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
  const linhas = db
    .prepare(`SELECT * FROM agendamentos ${where} ORDER BY data_evento, hora_inicio`)
    .all(...parametros);

  if (!busca || !String(busca).trim()) return linhas;

  return linhas.filter((linha) =>
    combinaBusca(busca, [linha.nome, linha.cliente, linha.tipo_evento])
  );
}

function buscarPorId(id) {
  return db.prepare("SELECT * FROM agendamentos WHERE id = ?").get(id);
}

function nomeEmUso(nomeChave, ignorarId = null) {
  const linha = db
    .prepare("SELECT id FROM agendamentos WHERE nome_chave = ? AND id != ? LIMIT 1")
    .get(nomeChave, ignorarId ?? -1);
  return Boolean(linha);
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
        (nome, nome_chave, cliente, telefone, tipo_evento, data_evento, hora_inicio, hora_fim, convidados, valor, status, observacoes)
       VALUES
        (@nome, @nome_chave, @cliente, @telefone, @tipo_evento, @data_evento, @hora_inicio, @hora_fim, @convidados, @valor, @status, @observacoes)`
    )
    .run(dados);
  return buscarPorId(resultado.lastInsertRowid);
}

function atualizar(id, dados) {
  db.prepare(
    `UPDATE agendamentos SET
      nome = @nome,
      nome_chave = @nome_chave,
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
  TIPOS_EVENTO,
  normalizar,
  validar,
  listar,
  buscarPorId,
  nomeEmUso,
  existeConflito,
  criar,
  atualizar,
  excluir,
};
