function chaveEmail(email) {
  const texto = String(email ?? "").trim().toLowerCase();
  const posicao = texto.lastIndexOf("@");
  if (posicao < 0) return texto;

  const local = texto.slice(0, posicao);
  const dominio = texto.slice(posicao + 1);

  if (dominio === "gmail.com" || dominio === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }

  return texto;
}

module.exports = { chaveEmail };
