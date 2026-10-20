function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function distancia(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        atual[j] = Math.min(atual[j], anterior[j - 2] + 1);
      }
    }
    anterior = atual;
  }

  return anterior[b.length];
}

function tolerancia(tamanho) {
  if (tamanho <= 3) return 0;
  if (tamanho <= 6) return 1;
  return 2;
}

function palavraCombina(termo, palavra) {
  if (palavra.includes(termo)) return true;
  const limite = tolerancia(termo.length);
  if (limite === 0) return false;
  if (distancia(termo, palavra) <= limite) return true;
  return distancia(termo, palavra.slice(0, termo.length)) <= limite;
}

function combinaBusca(busca, textos) {
  const termos = normalizarTexto(busca).split(" ").filter(Boolean);
  if (!termos.length) return true;

  const palavras = normalizarTexto(textos.join(" ")).split(" ").filter(Boolean);

  return termos.every((termo) => palavras.some((palavra) => palavraCombina(termo, palavra)));
}

module.exports = { normalizarTexto, combinaBusca };
