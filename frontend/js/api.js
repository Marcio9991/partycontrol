// O Express entrega frontend e API na mesma origem, independentemente da porta
// escolhida (PORT), domínio ou proxy. Para servir o frontend separadamente,
// configure window.PARTYCONTROL_API_BASE antes deste arquivo ser carregado.
const API_BASE = window.PARTYCONTROL_API_BASE || "";
const API_URL = `${API_BASE}/api/agendamentos`;
const AUTH_URL = `${API_BASE}/api/auth`;
const CHAVE_TOKEN = "partycontrol_token";
const CHAVE_USUARIO = "partycontrol_usuario";

function guardarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, usuario);
}

function limparSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}

async function requisitar(url, opcoes = {}, comToken = true) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (comToken && token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, headers });
  } catch (erro) {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando (npm start na pasta backend).");
  }

  if (resposta.status === 401 && comToken) {
    limparSessao();
    window.location.replace("login.html");
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (resposta.status === 204) return null;

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(corpo.erro || "Erro ao comunicar com o servidor.");
    erro.status = resposta.status;
    throw erro;
  }

  return corpo;
}

const api = {
  logado() {
    return Boolean(localStorage.getItem(CHAVE_TOKEN));
  },
  usuario() {
    return localStorage.getItem(CHAVE_USUARIO) || "";
  },
  async login(email, senha) {
    const resposta = await requisitar(
      `${AUTH_URL}/login`,
      { method: "POST", body: JSON.stringify({ email, senha }) },
      false
    );
    guardarSessao(resposta.token, resposta.nome);
    return resposta;
  },
  async registrar(nome, email, senha) {
    const resposta = await requisitar(
      `${AUTH_URL}/registrar`,
      { method: "POST", body: JSON.stringify({ nome, email, senha }) },
      false
    );
    guardarSessao(resposta.token, resposta.nome);
    return resposta;
  },
  async sair() {
    try {
      await requisitar(`${AUTH_URL}/logout`, { method: "POST" });
    } catch (erro) {
    }
    limparSessao();
    window.location.replace("index.html");
  },
  listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.data) params.set("data", filtros.data);
    if (filtros.status) params.set("status", filtros.status);
    if (filtros.busca) params.set("busca", filtros.busca);
    const query = params.toString();
    return requisitar(query ? `${API_URL}?${query}` : API_URL);
  },
  buscar(id) {
    return requisitar(`${API_URL}/${id}`);
  },
  criar(dados) {
    return requisitar(API_URL, { method: "POST", body: JSON.stringify(dados) });
  },
  atualizar(id, dados) {
    return requisitar(`${API_URL}/${id}`, { method: "PUT", body: JSON.stringify(dados) });
  },
  excluir(id) {
    return requisitar(`${API_URL}/${id}`, { method: "DELETE" });
  },
};
