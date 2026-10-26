const formLogin = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const btnEntrar = document.getElementById("btn-entrar");
const mensagemLogin = document.getElementById("mensagem");

const REGEX_GMAIL = /^[^\s@]+@gmail\.com$/i;

if (api.logado()) {
  window.location.replace("painel.html");
}

function mostrarErro(texto) {
  mensagemLogin.textContent = texto;
  mensagemLogin.className = "mensagem erro";
}

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemLogin.textContent = "";
  mensagemLogin.className = "mensagem";

  const email = campoEmail.value.trim();

  if (!email || !campoSenha.value) {
    mostrarErro("Informe e-mail e senha.");
    return;
  }
  if (!REGEX_GMAIL.test(email)) {
    mostrarErro("Use um e-mail do Gmail (exemplo: nome@gmail.com).");
    return;
  }

  btnEntrar.disabled = true;
  try {
    await api.login(email, campoSenha.value);
    window.location.replace("painel.html");
  } catch (erro) {
    mostrarErro(erro.message);
    campoSenha.value = "";
    campoSenha.focus();
  } finally {
    btnEntrar.disabled = false;
  }
});
