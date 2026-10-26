const acoesVisitante = document.getElementById("acoes-visitante");
const acoesLogado = document.getElementById("acoes-logado");
const lobbyCta = document.getElementById("lobby-cta");

if (api.logado()) {
  acoesVisitante.hidden = true;
  acoesLogado.hidden = false;
  document.getElementById("lobby-nome").textContent = api.usuario();
  document.getElementById("btn-sair").addEventListener("click", () => api.sair());
  lobbyCta.textContent = "Abrir meu painel";
  lobbyCta.href = "painel.html";
}
