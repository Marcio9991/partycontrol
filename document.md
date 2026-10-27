# PartyControl: documentação técnica dos arquivos

Projeto prático de CRUD · Documento de apoio para a equipe

## 1. Visão geral

O PartyControl é um sistema de controle de agendamento de salão de festa. O backend usa Node.js, Express e SQLite. O frontend é feito em HTML, CSS e JavaScript puro e é servido pelo próprio Express, então tudo roda com um único comando.

A arquitetura segue o padrão em camadas: **rota → controller → model → banco de dados**. A comunicação entre navegador e servidor é feita por HTTP com JSON. A autenticação usa um token de sessão, guardado no banco e enviado pelo navegador no cabeçalho `Authorization: Bearer <token>`.

Para rodar o projeto, entre na pasta `backend`, execute `npm install` e depois `npm start`, e abra `http://localhost:3000`.

## 2. Estrutura de pastas

```
PartyControl/
├── .gitignore
├── README.md
├── backend/
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── config/database.js
│       ├── controllers/agendamentoController.js, authController.js
│       ├── middlewares/autenticacao.js
│       ├── models/agendamentoModel.js, usuarioModel.js
│       ├── routes/agendamentoRoutes.js, authRoutes.js
│       └── utils/email.js, texto.js
└── frontend/
    ├── index.html, login.html, cadastro.html, painel.html
    ├── css/styles.css
    └── js/api.js, app.js, lobby.js, login.js, cadastro.js
```

## 3. Arquivos da raiz

**`.gitignore`** tem três linhas: `node_modules/`, `backend/database.sqlite*` e `.env`. O asterisco existe porque o SQLite em modo WAL cria, junto do banco, os arquivos `-wal` e `-shm`, e nenhum deles deve ir para o repositório.

**`README.md`** documenta estrutura, telas, regras, endpoints, como rodar e próximos passos.

## 4. Backend

### 4.1 `backend/package.json`

Declara três dependências: `express` (servidor HTTP), `cors` (cabeçalhos de CORS) e `better-sqlite3` (driver síncrono do SQLite). Os scripts são `start` (`node server.js`) e `dev` (`node --watch server.js`, que reinicia o servidor ao salvar e exige Node 18.11 ou superior).

### 4.2 `backend/server.js`

É o ponto de entrada. Importa o app, lê a porta de `process.env.PORT` (padrão 3000) e chama `listen`. Manter isso separado de `src/app.js` permite importar o app em testes automatizados, como com `supertest`, sem abrir uma porta.

### 4.3 `backend/src/app.js`

Monta a aplicação Express. A **ordem** dos middlewares importa:

1. `cors()` libera qualquer origem e responde automaticamente ao preflight `OPTIONS`.
2. `express.json()` converte o corpo da requisição em `req.body`. Se o JSON vier malformado, gera um erro com `type` igual a `entity.parse.failed`.
3. Um middleware próprio registra no console data, método e URL de cada requisição.
4. `/api/auth` é público. `/api/agendamentos` passa por `exigirLogin` antes do router.
5. `express.static` serve a pasta `frontend`. Vem depois da API, mas não há colisão porque as rotas da API começam com `/api`.
6. Um tratador de `/api` devolve 404 em JSON para rotas inexistentes.
7. O último middleware tem quatro parâmetros, que é como o Express reconhece um tratador de erros. Converte o erro de JSON inválido em 400 e qualquer outro em 500, registrando-o no console.

### 4.4 `backend/src/config/database.js`

Abre o arquivo `database.sqlite` na pasta `backend/` e ativa `journal_mode = WAL`, modo em que leituras não bloqueiam a escrita. Como o Node guarda os módulos em cache, o arquivo executa uma única vez e todos os models compartilham a mesma conexão.

Cria três tabelas:

| Tabela | Colunas principais | Observações |
| --- | --- | --- |
| `agendamentos` | id, nome, nome\_chave, cliente, telefone, tipo\_evento, data\_evento, hora\_inicio, hora\_fim, convidados, valor, status, observacoes, criado\_em | Datas em texto ISO (`AAAA-MM-DD`) e horas em `HH:MM`, o que permite comparar com `<` e `>` direto no SQL, pois a ordem alfabética coincide com a cronológica. `valor` é `REAL`. `nome_chave` guarda o nome normalizado e sustenta a unicidade. |
| `usuarios` | id, nome, email, email\_chave, senha\_hash, senha\_sal, criado\_em | `email_chave` é a forma canônica do Gmail. A senha nunca é guardada em texto puro. |
| `sessoes` | token, usuario\_id, expira\_em | Chave estrangeira para `usuarios` com `ON DELETE CASCADE`. `expira_em` é um timestamp em milissegundos. |

Depois das tabelas vêm as **migrações**, que rodam a cada inicialização e são idempotentes. Elas consultam `PRAGMA table_info` para saber quais colunas existem e só aplicam o que falta: renomear `usuario` para `email`, adicionar `nome` e `email_chave`, preencher a chave dos registros antigos em JavaScript e criar os índices únicos `idx_usuarios_email_chave` e `idx_agendamentos_nome_chave`. A criação do índice de e-mail fica num `try/catch`: se um banco antigo tiver duplicados, o servidor avisa no console em vez de falhar.

### 4.5 `backend/src/utils/email.js`

Exporta `chaveEmail`, que gera a identidade canônica de um e-mail. Coloca tudo em minúsculas e separa o trecho antes do último `@` do domínio. Se o domínio for `gmail.com` ou `googlemail.com`, descarta o que vem depois do sinal de `+` e remove os pontos. Assim, `Ana.Souza+festa@gmail.com` vira `anasouza@gmail.com`, que é como o Gmail realmente entrega. Para outros domínios, só converte para minúsculas.

### 4.6 `backend/src/utils/texto.js`

Sustenta a pesquisa tolerante a erros. Exporta três funções:

- **`normalizarTexto`**: usa `normalize` com a forma NFD para separar letras e acentos, remove a faixa Unicode de marcas combinantes (U+0300 a U+036F), converte para minúsculas e colapsa espaços repetidos.
- **`distancia`**: calcula a distância de Damerau-Levenshtein, na variante com substituição, inserção, remoção e troca de letras vizinhas, cada operação custando 1. Guarda apenas três linhas da matriz, então a memória é proporcional ao tamanho da segunda palavra.
- **`combinaBusca`**: quebra a pesquisa em termos e exige que **todos** casem com alguma palavra do texto (nome, cliente e tipo de evento juntos). Um termo casa com uma palavra se estiver contido nela, se a distância até ela for pequena, ou se a distância até o **prefixo** dela, com o mesmo tamanho do termo, for pequena. A tolerância depende do tamanho do termo: 0 erros até 3 letras, 1 erro até 6 letras e 2 erros acima disso. Termos curtos não toleram erro porque, por exemplo, ana casaria com palavras demais.

### 4.7 `backend/src/models/agendamentoModel.js`

Concentra as regras de negócio e todo o SQL de agendamentos.

- **`formatarTelefone`** repete no servidor a máscara do frontend. O backend é a fonte da verdade: mesmo uma requisição feita por `curl` sai padronizada.
- **`normalizar`** converte os campos para os tipos corretos (`Number` para convidados e valor, `trim` nos textos) e gera o `nome_chave`.
- **`validar`** devolve uma lista de erros em vez de parar no primeiro, então o usuário vê todos de uma vez. Compara `hora_fim <= hora_inicio` como texto, o que funciona porque o formato é fixo. O tipo de evento é conferido contra a lista `TIPOS_EVENTO`.
- **`listar`** aplica no SQL os filtros de data e status, com parâmetros posicionais (`?`), o que evita SQL injection. Ordena por data e hora e só depois aplica a busca tolerante em JavaScript, porque o SQLite não faz esse tipo de aproximação.
- **`existeConflito`** usa a condição clássica de sobreposição de intervalos: há conflito se o início do existente é menor que o fim do novo **e** o fim do existente é maior que o início do novo. Ignora agendamentos cancelados e, na edição, o próprio registro (com `id != ?` e `-1` como valor de apoio quando é criação). Eventos que terminam exatamente quando outro começa não conflitam.
- **`nomeEmUso`** compara `nome_chave`, então maiúsculas, minúsculas e acentos não diferenciam nomes.
- **`criar`** e **`atualizar`** usam parâmetros nomeados (`@campo`). `atualizar` substitui o registro inteiro, coerente com o verbo `PUT`.
- **`excluir`** retorna verdadeiro quando `changes` é maior que zero.

Como o `better-sqlite3` é síncrono e o Node executa uma requisição por vez em um único processo, verificar o conflito e inserir logo em seguida é seguro contra condições de corrida dentro de um servidor. Com vários processos, seria necessário usar uma transação ou uma restrição no próprio banco.

### 4.8 `backend/src/models/usuarioModel.js`

Cuida de contas e sessões.

- **`gerarHash`** usa `crypto.scryptSync(senha, sal, 64)`, uma função deliberadamente lenta e custosa em memória, o que encarece ataques de força bruta. O sal tem 16 bytes aleatórios por usuário.
- **`verificarCredenciais`** busca o usuário por `email_chave`, recalcula o hash e compara com `crypto.timingSafeEqual`, que leva o mesmo tempo independentemente de onde os bytes divergem. Isso evita ataques de temporização.
- **`validarCadastro`** exige nome de 2 a 80 caracteres, e-mail do domínio `gmail.com` (após converter para minúsculas) e senha de 6 a 100 caracteres.
- **`criarSessao`** gera 32 bytes aleatórios (256 bits) em hexadecimal, apaga as sessões vencidas e grava a nova com validade de 7 dias.
- **`buscarSessao`** faz um `JOIN` com `usuarios` e só retorna o usuário se `expira_em` ainda estiver no futuro.

### 4.9 `backend/src/controllers/agendamentoController.js`

Traduz o resultado das regras em respostas HTTP.

- `idValido` aceita apenas inteiros positivos.
- `verificarRegras` aplica as regras em ordem, e a ordem define o status devolvido: validação (400), nome repetido (409) e conflito de horário (409). Agendamentos cancelados continuam reservando o nome.
- `listar`, `buscar`, `criar`, `atualizar` e `excluir` formam o CRUD, com 201 na criação e 204 sem corpo na exclusão.
- `tipos` devolve a lista de tipos de evento.

### 4.10 `backend/src/controllers/authController.js`

- **`registrar`** normaliza os dados, valida, confere se o e-mail já existe (409), cria o usuário e já devolve uma sessão, então a pessoa entra logada ao concluir o cadastro.
- **`login`** responde a e-mail inexistente e a senha errada com a **mesma** mensagem, para não revelar quais contas existem.
- **`logout`** apaga a sessão atual.
- **`sessao`** devolve nome e e-mail do usuário autenticado.

### 4.11 `backend/src/middlewares/autenticacao.js`

Extrai o token do cabeçalho `Authorization: Bearer ...`, consulta a sessão e, se for válida, anexa `req.usuario` e `req.token` à requisição e chama `next()`. Se não for válida, responde 401 e interrompe a cadeia.

### 4.12 `backend/src/routes/agendamentoRoutes.js` e `authRoutes.js`

Só mapeiam verbos e caminhos para as funções dos controllers. Em `agendamentoRoutes.js`, a rota `/tipos` é declarada **antes** de `/:id`; do contrário, o Express trataria a palavra tipos como um ID e responderia 400. Em `authRoutes.js`, `registrar` e `login` são abertos, e `logout` e `sessao` ficam atrás do middleware de autenticação.

## 5. Frontend

### 5.1 `frontend/js/api.js`

É a única camada que usa `fetch`. Principais pontos:

- `API_BASE` fica vazio quando a página vem da porta 3000 e vale `http://localhost:3000` nos outros casos (por exemplo, com o Live Server).
- `requisitar` monta o cabeçalho com o token, trata falha de rede com uma mensagem clara, redireciona para o login em caso de 401 (exceto nas chamadas de login e cadastro, que não levam token), trata a resposta 204 sem corpo e anexa o `status` HTTP ao erro. A tela de cadastro usa esse status para reconhecer o 409.
- O objeto `api` expõe os métodos de alto nível: `login`, `registrar`, `sair`, `listar`, `buscar`, `criar`, `atualizar` e `excluir`.
- O token e o nome do usuário ficam no `localStorage`.

### 5.2 `frontend/js/app.js`

Controla o painel de agendamentos. Começa com um guarda de rota que envia ao login quem não está autenticado. Decisões de projeto importantes:

- `formatarData` separa a string por hífen em vez de usar `new Date`, para evitar o deslocamento de fuso horário que faria a data 2026-12-05 aparecer como dia 4.
- As células da tabela são criadas com `createElement` e `textContent`, nunca com `innerHTML` aplicado a dados do usuário, o que bloqueia XSS armazenado.
- Os botões Editar e Excluir recebem `aria-label` com o nome do agendamento, por acessibilidade.
- O formulário tem um campo `hidden` com o ID: se estiver preenchido, o envio chama `atualizar`; se não, chama `criar`.
- A pesquisa usa *debounce* de 250 ms: cada tecla reinicia um temporizador, e a requisição só sai quando a pessoa para de digitar.
- A máscara do telefone reformata o campo a cada evento `input`, no padrão `(00) 0 0000-0000`.

### 5.3 `frontend/js/login.js`

Valida no cliente se os campos estão preenchidos e se o e-mail é do Gmail, desabilita o botão durante a requisição e o reabilita no bloco `finally`. O redirecionamento usa `location.replace`, que não deixa a página de login no histórico do botão Voltar.

### 5.4 `frontend/js/cadastro.js`

Valida nome, Gmail, tamanho da senha e confirmação. Quando o servidor responde 409, monta a mensagem com `textContent` e adiciona o link para o login com `createElement`, marca o campo de e-mail com `aria-invalid` e a classe `invalido` e dá foco a ele. A marcação some quando a pessoa volta a digitar.

### 5.5 `frontend/js/lobby.js`

Só alterna a visibilidade, pelo atributo `hidden`, entre os botões de visitante e os de usuário logado na página inicial.

### 5.6 Páginas HTML

| Arquivo | Função |
| --- | --- |
| `index.html` | Página inicial: barra superior com a marca e os botões Entrar e Cadastrar, e um cartão com a descrição resumida do sistema e a escolha entre entrar ou se cadastrar. |
| `login.html` | Formulário de e-mail e senha, com links para o cadastro e para o início. |
| `cadastro.html` | Formulário de nome, e-mail, senha e confirmação de senha. |
| `painel.html` | Painel do CRUD: cabeçalho com o usuário e o botão Sair, formulário em grade, filtros e tabela. A tabela tem `caption` oculto visualmente e cabeçalhos com `scope`. |

Todos os campos têm `label`, os formulários usam `autocomplete` adequado e as mensagens de erro ficam em regiões `role=alert` ou `aria-live`, para leitores de tela.

### 5.7 `frontend/css/styles.css`

Define as cores como variáveis CSS (`--roxo`, `--erro` e outras). Usa `grid` com `auto-fit` e `minmax` para o formulário se reorganizar sozinho em telas estreitas. Traz ainda o estado de foco com `:focus-visible`, os selos coloridos de status, a tabela com rolagem horizontal, os estilos das telas de login e início e uma regra para o atributo `hidden` funcionar também em elementos com `display: flex`.

## 6. Fluxos principais

### 6.1 Cadastrar um agendamento

1. O usuário preenche o formulário do painel e clica em Cadastrar.
2. O evento `submit` em `app.js` lê os campos e chama `api.criar`.
3. O `api.js` envia `POST /api/agendamentos` com o token.
4. No servidor, `cors` e `express.json` processam a requisição e `exigirLogin` valida a sessão.
5. A rota chama `controller.criar`, que pede ao model a normalização, a validação, a checagem de nome e a de conflito de horário.
6. Se tudo passar, o model executa o `INSERT` e o controller responde 201 com o registro criado.
7. No navegador, o painel mostra a mensagem de sucesso, limpa o formulário e recarrega a tabela.

### 6.2 Criar conta e entrar

1. Na página inicial, a pessoa escolhe Cadastrar e preenche nome, Gmail e senha.
2. O `cadastro.js` valida os dados e chama `api.registrar`, que envia `POST /api/auth/registrar`.
3. O servidor valida, confere a chave canônica do e-mail, grava o usuário com a senha em hash e cria uma sessão.
4. O navegador guarda o token no `localStorage` e redireciona para o painel.
5. Nas próximas visitas, a pessoa usa Entrar, que chama `POST /api/auth/login` e segue o mesmo caminho.

## 7. Endpoints

| Método | Rota | Acesso | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/registrar` | público | 201 + token | 400, 409 |
| POST | `/api/auth/login` | público | 200 + token | 400, 401 |
| POST | `/api/auth/logout` | com token | 204 | 401 |
| GET | `/api/auth/sessao` | com token | 200 | 401 |
| GET | `/api/agendamentos` | com token | 200 + lista | 401 |
| GET | `/api/agendamentos/tipos` | com token | 200 | 401 |
| GET | `/api/agendamentos/:id` | com token | 200 | 400, 401, 404 |
| POST | `/api/agendamentos` | com token | 201 | 400, 401, 409 |
| PUT | `/api/agendamentos/:id` | com token | 200 | 400, 401, 404, 409 |
| DELETE | `/api/agendamentos/:id` | com token | 204 | 400, 401, 404 |

A listagem aceita os filtros `busca`, `data` e `status`. Todos os erros seguem o formato `{ erro: mensagem }`.

## 8. Regras de negócio

| Regra | Detalhe |
| --- | --- |
| Nome do agendamento | Obrigatório, único, de 3 a 80 caracteres. Maiúsculas e acentos não diferenciam nomes. |
| Telefone | 10 ou 11 dígitos, formatado como `(00) 0 0000-0000`. |
| Tipo de evento | Aniversário, Casamento, Formatura, Chá de bebê, Chá de panela, Confraternização, Batizado, Reunião ou Outro. |
| Horário | A hora de término deve ser maior que a de início. |
| Conflito | Dois agendamentos não cancelados não podem se sobrepor na mesma data. |
| Pesquisa | Procura no nome, cliente e tipo de evento, ignorando maiúsculas, acentos e pequenos erros de digitação. |
| Cadastro | Gmail obrigatório e sem repetição, considerando pontos e etiquetas com `+`. Senha de 6 a 100 caracteres. |
| Sessão | Dura 7 dias ou até o usuário clicar em Sair. |

## 9. Limitações atuais e melhorias sugeridas

- O token fica no `localStorage`, acessível a qualquer script da página. Um cookie `httpOnly` seria mais seguro.
- Os tokens ficam em texto puro na tabela `sessoes`. O ideal é guardar apenas o hash deles.
- Não há limite de tentativas de login, e o CORS está aberto a qualquer origem. Isso serve para estudo, mas não para produção.
- O cadastro informa quando um e-mail já existe, o que melhora a usabilidade, mas permite descobrir quais e-mails têm conta.
- O sistema confere o formato e o domínio do e-mail, mas não confirma que a pessoa é dona da conta Gmail. Isso exigiria login com Google (OAuth) ou envio de código por e-mail.
- Os agendamentos não pertencem a um usuário: todos os usuários logados veem e editam os mesmos dados.
- O endpoint de tipos de evento existe, mas as opções do campo de seleção do painel estão fixas no HTML. Alterar a lista exige mexer nos dois lugares.
- Próximos passos possíveis: testes automatizados com `node:test` e `supertest`, variáveis de ambiente com `.env`, paginação da listagem e visualização dos agendamentos em calendário.
