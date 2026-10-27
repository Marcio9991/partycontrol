const acoesVisitante = document.getElementById("acoes-visitante");
const acoesLogado = document.getElementById("acoes-logado");
const escolhaVisitante = document.getElementById("escolha-visitante");
const escolhaLogado = document.getElementById("escolha-logado");

if (api.logado()) {
  acoesVisitante.hidden = true;
  acoesLogado.hidden = false;
  escolhaVisitante.hidden = true;
  escolhaLogado.hidden = false;
  document.getElementById("lobby-nome").textContent = api.usuario();
  document.getElementById("btn-sair").addEventListener("click", () => api.sair());
}
