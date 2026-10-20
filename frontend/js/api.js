const API_URL = "/api/agendamentos";

async function requisitar(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });

  if (resposta.status === 204) return null;

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(corpo.erro || "Erro ao comunicar com o servidor.");
  }

  return corpo;
}

const api = {
  listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.data) params.set("data", filtros.data);
    if (filtros.status) params.set("status", filtros.status);
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
