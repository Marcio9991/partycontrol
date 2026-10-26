const formCadastro = document.getElementById("form-cadastro");
const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const campoConfirmar = document.getElementById("confirmar");
const btnCadastrar = document.getElementById("btn-cadastrar");
const mensagemCadastro = document.getElementById("mensagem");

const REGEX_GMAIL = /^[^\s@]+@gmail\.com$/i;

if (api.logado()) {
  window.location.replace("painel.html");
}

function mostrarErro(texto) {
  mensagemCadastro.textContent = texto;
  mensagemCadastro.className = "mensagem erro";
}

formCadastro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemCadastro.textContent = "";
  mensagemCadastro.className = "mensagem";

  const nome = campoNome.value.trim();
  const email = campoEmail.value.trim();

  if (nome.length < 2) {
    mostrarErro("Informe seu nome.");
    return;
  }
  if (!REGEX_GMAIL.test(email)) {
    mostrarErro("Use um e-mail do Gmail (exemplo: nome@gmail.com).");
    return;
  }
  if (campoSenha.value.length < 6) {
    mostrarErro("A senha deve ter no mínimo 6 caracteres.");
    return;
  }
  if (campoSenha.value !== campoConfirmar.value) {
    mostrarErro("As senhas não conferem.");
    return;
  }

  btnCadastrar.disabled = true;
  try {
    await api.registrar(nome, email, campoSenha.value);
    window.location.replace("painel.html");
  } catch (erro) {
    mostrarErro(erro.message);
  } finally {
    btnCadastrar.disabled = false;
  }
});
