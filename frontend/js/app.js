const form = document.getElementById("form-agendamento");
const tabelaCorpo = document.getElementById("tabela-corpo");
const mensagem = document.getElementById("mensagem");
const vazio = document.getElementById("vazio");
const btnSalvar = document.getElementById("btn-salvar");
const btnCancelar = document.getElementById("btn-cancelar");
const tituloForm = document.getElementById("titulo-form");
const filtroBusca = document.getElementById("filtro-busca");
const filtroData = document.getElementById("filtro-data");
const filtroStatus = document.getElementById("filtro-status");
const btnLimparFiltros = document.getElementById("btn-limpar-filtros");

const campoTelefone = document.getElementById("telefone");

const CAMPOS = [
  "nome",
  "cliente",
  "telefone",
  "tipo_evento",
  "data_evento",
  "hora_inicio",
  "hora_fim",
  "convidados",
  "valor",
  "status",
  "observacoes",
];

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
  clearTimeout(mostrarMensagem.timer);
  mostrarMensagem.timer = setTimeout(() => {
    mensagem.textContent = "";
    mensagem.className = "mensagem";
  }, 5000);
}

function formatarTelefone(valor) {
  const d = String(valor ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function lerFormulario() {
  const dados = {};
  CAMPOS.forEach((campo) => {
    dados[campo] = document.getElementById(campo).value;
  });
  return dados;
}

function limparFormulario() {
  form.reset();
  document.getElementById("id").value = "";
  tituloForm.textContent = "Novo agendamento";
  btnSalvar.textContent = "Cadastrar agendamento";
  btnCancelar.hidden = true;
}

function criarCelula(texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  return td;
}

function criarBotao(texto, rotulo, classe, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = texto;
  botao.className = `btn btn-pequeno ${classe}`;
  botao.setAttribute("aria-label", rotulo);
  botao.addEventListener("click", aoClicar);
  return botao;
}

function desenharTabela(agendamentos) {
  tabelaCorpo.innerHTML = "";
  vazio.hidden = agendamentos.length > 0;

  agendamentos.forEach((item) => {
    const tr = document.createElement("tr");

    tr.appendChild(criarCelula(item.nome));
    tr.appendChild(criarCelula(formatarData(item.data_evento)));
    tr.appendChild(criarCelula(`${item.hora_inicio} às ${item.hora_fim}`));
    tr.appendChild(criarCelula(item.cliente));
    tr.appendChild(criarCelula(item.telefone));
    tr.appendChild(criarCelula(item.tipo_evento));
    tr.appendChild(criarCelula(item.convidados));
    tr.appendChild(criarCelula(formatarValor(item.valor)));

    const tdStatus = document.createElement("td");
    const selo = document.createElement("span");
    selo.className = `selo selo-${item.status}`;
    selo.textContent = item.status;
    tdStatus.appendChild(selo);
    tr.appendChild(tdStatus);

    const tdAcoes = document.createElement("td");
    tdAcoes.appendChild(
      criarBotao("Editar", `Editar agendamento ${item.nome}`, "btn-secundario", () => iniciarEdicao(item.id))
    );
    tdAcoes.appendChild(document.createTextNode(" "));
    tdAcoes.appendChild(
      criarBotao("Excluir", `Excluir agendamento ${item.nome}`, "btn-perigo", () => excluirAgendamento(item))
    );
    tr.appendChild(tdAcoes);

    tabelaCorpo.appendChild(tr);
  });
}

async function carregar() {
  try {
    const agendamentos = await api.listar({
      busca: filtroBusca.value.trim(),
      data: filtroData.value,
      status: filtroStatus.value,
    });
    desenharTabela(agendamentos);
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}

async function iniciarEdicao(id) {
  try {
    const item = await api.buscar(id);
    CAMPOS.forEach((campo) => {
      document.getElementById(campo).value = item[campo] ?? "";
    });
    document.getElementById("id").value = item.id;
    tituloForm.textContent = "Editar agendamento";
    btnSalvar.textContent = "Salvar alterações";
    btnCancelar.hidden = false;
    form.scrollIntoView({ behavior: "smooth" });
    document.getElementById("cliente").focus();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}

async function excluirAgendamento(item) {
  if (!confirm(`Excluir o agendamento "${item.nome}"?`)) return;
  try {
    await api.excluir(item.id);
    mostrarMensagem("Agendamento excluído.", "sucesso");
    if (document.getElementById("id").value === String(item.id)) limparFormulario();
    carregar();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const id = document.getElementById("id").value;
  const dados = lerFormulario();

  try {
    if (id) {
      await api.atualizar(id, dados);
      mostrarMensagem("Agendamento atualizado.", "sucesso");
    } else {
      await api.criar(dados);
      mostrarMensagem("Agendamento cadastrado.", "sucesso");
    }
    limparFormulario();
    carregar();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
});

campoTelefone.addEventListener("input", () => {
  campoTelefone.value = formatarTelefone(campoTelefone.value);
});

let temporizadorBusca;
filtroBusca.addEventListener("input", () => {
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(carregar, 250);
});

btnCancelar.addEventListener("click", limparFormulario);
filtroData.addEventListener("change", carregar);
filtroStatus.addEventListener("change", carregar);
btnLimparFiltros.addEventListener("click", () => {
  filtroBusca.value = "";
  filtroData.value = "";
  filtroStatus.value = "";
  carregar();
});

carregar();
