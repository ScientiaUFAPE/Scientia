# Sobre o Scientia

Documento de referência sobre o que o sistema é, para quem ele serve e como ele se
apresenta. Serve de base para a criação da identidade visual (logo, favicon, marca do
cabeçalho).

## O que é

O Scientia é um hub de produção científica do curso de Bacharelado em Ciência da
Computação (BCC) da UFAPE. Ele centraliza, organiza e dá visibilidade ao que o curso
produz: publicações, projetos de pesquisa, grupos de pesquisa e as vagas de iniciação
científica que nascem desses projetos.

O nome vem do latim *scientia*: conhecimento, saber. A ideia da marca é a de um acervo
vivo do curso, não a de um repositório parado.

Contexto: projeto acadêmico das disciplinas de Engenharia de Software e Banco de Dados,
período 2026.1, sob orientação da Professora Thaís Burity. Equipe de três pessoas
(Lucas Feitoza, Carlos Gabyrel Espianhara, Laura Vitória Mendes), com Heitor Calado
integrando o grupo na disciplina de Banco de Dados.

## Para quem serve

| Público | O que faz no sistema |
|---|---|
| Alunos do BCC | Exploram o acervo, encontram grupos e projetos, se candidatam a vagas de pesquisa |
| Pesquisadores e docentes | Cadastram publicações e projetos, lideram grupos, abrem vagas e avaliam candidaturas |
| Visitantes | Consultam publicações e projetos do curso sem precisar de conta |
| Administração | Gerencia contas e acompanha os relatórios de produção |

## O que o sistema faz

- **Publicações**: cadastro e consulta da produção bibliográfica, com autoria ordenada
  e vínculo ao projeto de origem.
- **Projetos de pesquisa**: projetos ligados a grupos e editais, com suas publicações.
- **Grupos de pesquisa**: membros, liderança e indicadores de produção por grupo.
- **Vagas e candidaturas**: vagas de iniciação científica abertas pelos projetos; o
  aluno se candidata e acompanha o resultado. A vaga fecha sozinha quando as
  aprovações preenchem todas as posições.
- **Relatórios**: visão consolidada de projetos, produção bibliográfica e grupos.
- **Contas e papéis**: acesso por login, com papel de usuário comum e de administrador.

## Como ele se apresenta hoje

- Título da aba e assinatura da marca: **Scientia | Hub de Produção Científica do BCC**.
- O cabeçalho já usa um selo quadrado com a letra **S**, seguido do nome e da linha de
  apoio. É esse selo que a logo vai substituir.
- Interface em português, densa em listagens e tabelas, com aparência sóbria de
  ferramenta acadêmica.

### Paleta em uso

Definida em `frontend/src/estilos/global.css`:

| Papel | Cor |
|---|---|
| Primária (azul) | `#1f4b8e` |
| Primária escura | `#163a70` |
| Azul profundo do gradiente | `#0d264b` |
| Destaque (verde-azulado) | `#0f9d8f` |
| Fundo | `#f3f5fa` |
| Superfície | `#ffffff` |
| Texto | `#1b2331` |
| Texto suave | `#5d6779` |

O azul carrega a identidade; o verde-azulado aparece em destaques e estados positivos.

## Briefing para a logo

**Tom**: acadêmico, sério e limpo, sem ficar solene ou datado. É um sistema usado no
dia a dia por alunos, não um brasão institucional.

**Onde vai aparecer**:
- Selo no cabeçalho, em espaço pequeno e quadrado, ao lado do nome.
- Favicon de 32×32 e menores, ainda legível.
- Tela de login, sobre fundo de gradiente azul escuro.
- Slides e documentos da apresentação da disciplina.

**Requisitos práticos**:
- Precisa funcionar em versão reduzida (símbolo isolado) e completa (símbolo + nome).
- Legível em monocromático e sobre fundo claro e escuro.
- Boa em traço simples, sem depender de degradê ou sombra para ser reconhecida.

**Caminhos de símbolo que combinam com o produto**:
- A letra **S** trabalhada, já que é o selo atual e a troca fica natural.
- Referências a acervo e circulação de conhecimento: páginas empilhadas, nós conectados
  de uma rede de autores, o ponto de encontro de vários caminhos (a ideia de *hub*).
- Referências discretas à computação, ligadas ao BCC, sem transformar a marca em ícone
  genérico de tecnologia.

**O que evitar**:
- Chapéu de formatura, coruja, tocha e livro aberto clássico: leitura genérica de
  "educação", sem dizer nada sobre pesquisa.
- Engrenagem, circuito e cérebro com placas: ruído de tecnologia genérica.
- Símbolo com muito detalhe fino, que some no favicon.
- Depender de mais de duas cores para ser reconhecido.
