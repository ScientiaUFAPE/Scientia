import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { setTimeout as aguardar } from 'node:timers/promises';
import request from 'supertest';

import { criarApp } from '../app.js';
import { ADMIN_INICIAL } from '../config/ambiente.js';
import { consultar, encerrarBanco, pool } from '../config/bd.js';
import { gerarToken } from '../services/tokenService.js';
import { garantirAdminInicial } from '../services/usuarioService.js';
import { popularCenarioAcervoTeste, prepararBancoTeste, reiniciarBancoTeste } from './setupBancoTeste.js';

const app = criarApp();
const SENHA_HASH_TESTE = '$2b$10$1sOjgIPs9/ewWhYWL9EJvu0xDWtQtbWqKKc1YMh0pn9h1x87NlEya';

const cadastrar = (dados) => request(app).post('/api/auth/cadastro').send(dados);

const dadosAluno = (sobrescritos = {}) => ({
  tipo: 'aluno',
  nome: 'Ana Souza',
  email: 'ana@ufape.edu.br',
  senha: 'senha123',
  matricula: '2026010101',
  idCurso: 1,
  ...sobrescritos,
});

const dadosPesquisador = (sobrescritos = {}) => ({
  tipo: 'pesquisador',
  nome: 'Carlos Lima',
  email: 'carlos@ufape.edu.br',
  senha: 'senha123',
  numeroLattes: '1234567890123456',
  vinculo: 'docente',
  ...sobrescritos,
});

async function tokenAdmin() {
  const resposta = await request(app)
    .post('/api/auth/login')
    .send({ email: ADMIN_INICIAL.email, senha: ADMIN_INICIAL.senha });

  assert.strictEqual(resposta.status, 200);
  return resposta.body.token;
}

function validarUsuario(usuario, tipo, email) {
  assert.strictEqual(typeof usuario.id, 'number');
  assert.strictEqual(usuario.email, email);
  assert.strictEqual(usuario.tipo, tipo);
  assert.match(usuario.criadoEm, /^\d{4}-\d{2}-\d{2}T/);
  assert.strictEqual(usuario.senhaHash, undefined);
}

async function reiniciarCenarioTeste() {
  await reiniciarBancoTeste();
  await garantirAdminInicial();
}

async function reiniciarCenarioAcervoTeste() {
  await reiniciarBancoTeste();
  await popularCenarioAcervoTeste();
}

async function tokenAlunoTeste() {
  const resposta = await cadastrar(
    dadosAluno({
      email: 'aluno.acervo@ufape.edu.br',
      matricula: '2026999901',
    }),
  );

  assert.strictEqual(resposta.status, 201);
  return resposta.body.token;
}

async function tokenPesquisadorTeste(sobrescritos = {}) {
  const resposta = await cadastrar(
    dadosPesquisador({
      nome: 'Pesquisadora Cadastro',
      email: 'pesquisadora.cadastro@ufape.edu.br',
      numeroLattes: '5555555555555555',
      ...sobrescritos,
    }),
  );

  assert.strictEqual(resposta.status, 201);
  return resposta.body.token;
}

async function tokenPesquisadorSemPerfil() {
  const { rows } = await consultar(
    `
      INSERT INTO conta (email, senha_hash, tipo)
      VALUES ($1, $2, $3)
      RETURNING id_conta, email, tipo
    `,
    ['pesquisador.sem.perfil@ufape.edu.br', SENHA_HASH_TESTE, 'pesquisador'],
  );

  return gerarToken({
    id: rows[0].id_conta,
    email: rows[0].email,
    tipo: rows[0].tipo,
    nome: null,
  });
}

const publicacaoArtigoFixture = {
  id: 1,
  titulo: 'Análise de desempenho de algoritmos de aprendizado',
  tipo: 'artigo',
  ano: 2024,
  doi: '10.1000/exemplo.1',
  veiculo: 'Revista Brasileira de Computação',
  projeto: { id: 3, titulo: 'Inteligência artificial aplicada ao Agreste' },
  autores: [
    { id: 91, nome: 'Zuleica Souza', ordem: 1 },
    { id: 104, nome: 'Bruno Lima', ordem: 2 },
  ],
  areas: [{ id: 1, nome: 'Ciência da Computação' }],
};

const projetoComputacaoFixture = {
  id: 3,
  titulo: 'Inteligência artificial aplicada ao Agreste',
  status: 'em_andamento',
  dataInicio: '2024-03-01',
  dataFim: null,
  grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
  areas: [{ id: 1, nome: 'Ciência da Computação' }],
  totalPublicacoes: 2,
};

const grupoComputacaoFixture = {
  id: 2,
  nome: 'Grupo de Pesquisa em Computação Aplicada',
  linkDgp: 'http://dgp.cnpq.br/exemplo',
  anoCriacao: 2015,
  totalProjetos: 1,
  totalMembros: 2,
};

const pesquisadorZuleicaFixture = {
  id: 91,
  nome: 'Zuleica Souza',
  vinculo: 'docente',
  numeroLattes: '1234567890123456',
  totalPublicacoes: 2,
};

describe('API', () => {
  before(async () => {
    await prepararBancoTeste();
  });

  after(async () => {
    await encerrarBanco();
  });

describe('Autenticação e contas', () => {
  beforeEach(reiniciarCenarioTeste);

  it('cadastra aluno com conta e perfil', async () => {
    const resposta = await cadastrar(dadosAluno());

    assert.strictEqual(resposta.status, 201);
    assert.ok(resposta.body.token);
    validarUsuario(resposta.body.usuario, 'aluno', 'ana@ufape.edu.br');
    assert.strictEqual(resposta.body.usuario.nome, 'Ana Souza');
  });

  it('cadastra pesquisador manual com conta e perfil', async () => {
    const resposta = await cadastrar(dadosPesquisador());

    assert.strictEqual(resposta.status, 201);
    assert.ok(resposta.body.token);
    validarUsuario(resposta.body.usuario, 'pesquisador', 'carlos@ufape.edu.br');
    assert.strictEqual(resposta.body.usuario.nome, 'Carlos Lima');
  });

  it('vincula número Lattes órfão sem sobrescrever dados existentes', async () => {
    await consultar(
      `
        INSERT INTO pesquisador (nome, numero_lattes, email, vinculo, origem)
        VALUES ($1, $2, $3, $4, $5)
      `,
      ['Nome Importado', '9999999999999999', 'importado@ufape.edu.br', 'docente', 'lattes'],
    );

    const resposta = await cadastrar(
      dadosPesquisador({
        nome: 'Nome Enviado',
        email: 'novo@ufape.edu.br',
        numeroLattes: '9999999999999999',
        vinculo: 'externo',
      }),
    );

    assert.strictEqual(resposta.status, 201);
    assert.strictEqual(resposta.body.usuario.nome, 'Nome Importado');

    const perfil = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${resposta.body.token}`);

    assert.strictEqual(perfil.status, 200);
    assert.strictEqual(perfil.body.usuario.perfil.vinculo, 'docente');
    assert.strictEqual(perfil.body.usuario.perfil.origem, 'lattes');
  });

  it('recusa vínculo com pesquisador que já possui conta sem alterar o vínculo existente', async () => {
    const contaExistente = await consultar(
      `
        INSERT INTO conta (email, senha_hash, tipo)
        VALUES ($1, $2, $3)
        RETURNING id_conta
      `,
      ['pesquisador.existente@ufape.edu.br', SENHA_HASH_TESTE, 'pesquisador'],
    );
    const idContaOriginal = contaExistente.rows[0].id_conta;

    await consultar(
      `
        INSERT INTO pesquisador (id_conta, nome, numero_lattes, email, vinculo, origem)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        idContaOriginal,
        'Pesquisador Vinculado',
        '8888888888888888',
        'pesquisador.existente@ufape.edu.br',
        'docente',
        'lattes',
      ],
    );

    await consultar(
      `
        INSERT INTO pesquisador (nome, numero_lattes, email, vinculo, origem)
        VALUES ($1, $2, $3, $4, $5)
      `,
      ['Pesquisador Órfão', '7777777777777777', 'orfao@ufape.edu.br', 'docente', 'lattes'],
    );

    const resposta = await cadastrar(
      dadosPesquisador({
        nome: 'Tentativa Indevida',
        email: 'tentativa@ufape.edu.br',
        numeroLattes: '8888888888888888',
      }),
    );

    assert.strictEqual(resposta.status, 409);
    assert.strictEqual(resposta.body.mensagem, 'Esse número Lattes já pertence a outra conta.');

    const pesquisador = await consultar(
      `
        SELECT id_conta
        FROM pesquisador
        WHERE numero_lattes = $1
      `,
      ['8888888888888888'],
    );

    assert.strictEqual(pesquisador.rows[0].id_conta, idContaOriginal);
  });

  it('permite apenas um cadastro concorrente para o mesmo pesquisador órfão sem deixar conta órfã', async () => {
    const numeroLattes = '6666666666666666';
    await consultar(
      `
        INSERT INTO pesquisador (nome, numero_lattes, email, vinculo, origem)
        VALUES ($1, $2, $3, $4, $5)
      `,
      ['Pesquisador Órfão', numeroLattes, 'orfao.concorrente@ufape.edu.br', 'docente', 'lattes'],
    );

    const cliente = await pool.connect();
    let respostas;

    try {
      await cliente.query('BEGIN');
      await cliente.query('SELECT id_pesquisador FROM pesquisador WHERE numero_lattes = $1 FOR UPDATE', [
        numeroLattes,
      ]);

      const respostasPendentes = Promise.all(
        Array.from({ length: 5 }, (_, indice) =>
          cadastrar(
            dadosPesquisador({
              nome: `Concorrente ${indice}`,
              email: `concorrente${indice}@ufape.edu.br`,
              numeroLattes,
            }),
          ),
        ),
      );

      await aguardar(200);
      await cliente.query('COMMIT');

      respostas = await respostasPendentes;
    } catch (erro) {
      await cliente.query('ROLLBACK').catch(() => {});
      throw erro;
    } finally {
      cliente.release();
    }

    const status = respostas.map((resposta) => resposta.status);

    assert.strictEqual(status.filter((codigo) => codigo === 201).length, 1);
    assert.strictEqual(status.filter((codigo) => codigo === 409).length, 4);

    const contasOrfas = await consultar(`
      SELECT c.id_conta
      FROM conta c
      LEFT JOIN pesquisador p ON p.id_conta = c.id_conta
      WHERE c.tipo = 'pesquisador' AND p.id_pesquisador IS NULL
    `);

    assert.strictEqual(contasOrfas.rows.length, 0);
  });

  it('retorna 409 para email já cadastrado', async () => {
    await cadastrar(dadosAluno());

    const resposta = await cadastrar(dadosPesquisador({ email: 'ANA@UFAPE.EDU.BR' }));

    assert.strictEqual(resposta.status, 409);
    assert.strictEqual(resposta.body.mensagem, 'Já existe uma conta com esse email.');
  });

  it('retorna 409 para matrícula já usada', async () => {
    await cadastrar(dadosAluno());

    const resposta = await cadastrar(
      dadosAluno({
        nome: 'Bia Souza',
        email: 'bia@ufape.edu.br',
      }),
    );

    assert.strictEqual(resposta.status, 409);
    assert.strictEqual(resposta.body.mensagem, 'Já existe um aluno com essa matrícula.');
  });

  it('retorna 409 para Lattes já vinculado a outra conta', async () => {
    await cadastrar(dadosPesquisador());

    const resposta = await cadastrar(
      dadosPesquisador({
        nome: 'Outra Pessoa',
        email: 'outra@ufape.edu.br',
      }),
    );

    assert.strictEqual(resposta.status, 409);
    assert.strictEqual(resposta.body.mensagem, 'Esse número Lattes já pertence a outra conta.');
  });

  it('retorna 400 para tipo inválido', async () => {
    const resposta = await cadastrar(dadosAluno({ tipo: 'admin' }));

    assert.strictEqual(resposta.status, 400);
    assert.match(resposta.body.mensagem, /tipo/i);
  });

  it('retorna 400 para curso inexistente', async () => {
    const resposta = await cadastrar(dadosAluno({ idCurso: 999 }));

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Curso não encontrado.');
  });

  it('retorna 400 para vínculo inválido', async () => {
    const resposta = await cadastrar(dadosPesquisador({ vinculo: 'visitante' }));

    assert.strictEqual(resposta.status, 400);
    assert.match(resposta.body.mensagem, /vínculo/i);
  });

  it('faz login com credenciais corretas e normaliza email', async () => {
    await cadastrar(dadosAluno());

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: ' ANA@UFAPE.EDU.BR ', senha: 'senha123' });

    assert.strictEqual(resposta.status, 200);
    assert.ok(resposta.body.token);
    validarUsuario(resposta.body.usuario, 'aluno', 'ana@ufape.edu.br');
  });

  it('retorna 401 com mensagem única para credenciais incorretas', async () => {
    await cadastrar(dadosAluno());

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ufape.edu.br', senha: 'errada123' });

    assert.strictEqual(resposta.status, 401);
    assert.strictEqual(resposta.body.mensagem, 'Email ou senha incorretos.');
  });

  it('retorna mensagem em português para JSON malformado', async () => {
    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Content-Type', 'application/json')
      .send('{"titulo":');

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Corpo da requisição não é um JSON válido.');
  });

  it('retorna perfil de aluno com curso', async () => {
    const cadastro = await cadastrar(dadosAluno());

    const resposta = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${cadastro.body.token}`);

    assert.strictEqual(resposta.status, 200);
    validarUsuario(resposta.body.usuario, 'aluno', 'ana@ufape.edu.br');
    assert.deepStrictEqual(resposta.body.usuario.perfil, {
      matricula: '2026010101',
      curso: { id: 1, nome: 'Bacharelado em Ciência da Computação' },
    });
  });

  it('retorna perfil de pesquisador com Lattes, vínculo e origem', async () => {
    const cadastro = await cadastrar(dadosPesquisador());

    const resposta = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${cadastro.body.token}`);

    assert.strictEqual(resposta.status, 200);
    validarUsuario(resposta.body.usuario, 'pesquisador', 'carlos@ufape.edu.br');
    assert.deepStrictEqual(resposta.body.usuario.perfil, {
      numeroLattes: '1234567890123456',
      vinculo: 'docente',
      origem: 'manual',
    });
  });

  it('retorna perfil de admin sem linha de perfil', async () => {
    const token = await tokenAdmin();

    const resposta = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resposta.status, 200);
    validarUsuario(resposta.body.usuario, 'admin', ADMIN_INICIAL.email);
    assert.strictEqual(resposta.body.usuario.nome, ADMIN_INICIAL.nome);
    assert.strictEqual(resposta.body.usuario.perfil, null);
  });

  it('encerra sessão e recusa reuso do token revogado', async () => {
    const cadastro = await cadastrar(dadosAluno());
    const autorizacao = ['Authorization', `Bearer ${cadastro.body.token}`];

    const logout = await request(app).post('/api/auth/logout').set(...autorizacao);
    assert.strictEqual(logout.status, 200);
    assert.deepStrictEqual(logout.body, { mensagem: 'Sessão encerrada.' });

    const perfil = await request(app).get('/api/auth/perfil').set(...autorizacao);
    assert.strictEqual(perfil.status, 401);
  });
});

describe('Usuários e cursos', () => {
  beforeEach(reiniciarCenarioTeste);

  it('/api/usuarios lista usuários como admin', async () => {
    await cadastrar(dadosAluno());
    await cadastrar(dadosPesquisador());
    const token = await tokenAdmin();

    const resposta = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(
      resposta.body.usuarios.map((usuario) => usuario.tipo),
      ['admin', 'aluno', 'pesquisador'],
    );
    assert.ok(resposta.body.usuarios.every((usuario) => usuario.senhaHash === undefined));
  });

  it('/api/usuarios retorna 403 para aluno', async () => {
    const cadastro = await cadastrar(dadosAluno());

    const resposta = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${cadastro.body.token}`);

    assert.strictEqual(resposta.status, 403);
  });

  it('/api/cursos é público e ordenado por nome', async () => {
    const resposta = await request(app).get('/api/cursos');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body.cursos, [
      { id: 3, nome: 'Bacharelado em Agronomia' },
      { id: 1, nome: 'Bacharelado em Ciência da Computação' },
      { id: 2, nome: 'Licenciatura em Computação' },
    ]);
  });
});

describe('Acervo público', () => {
  beforeEach(reiniciarCenarioAcervoTeste);

  it('/api/publicacoes lista publicações com paginação e autores ordenados', async () => {
    const resposta = await request(app).get('/api/publicacoes?tipo=artigo');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, {
      publicacoes: [publicacaoArtigoFixture],
      paginacao: { pagina: 1, porPagina: 20, total: 1 },
    });
  });

  it('/api/publicacoes/:id retorna detalhe público', async () => {
    const resposta = await request(app).get('/api/publicacoes/1');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, { publicacao: publicacaoArtigoFixture });
  });

  it('/api/publicacoes aplica busca, ano e paginação', async () => {
    const busca = await request(app).get('/api/publicacoes?busca=Carla');
    const ano = await request(app).get('/api/publicacoes?ano=2025');
    const area = await request(app).get('/api/publicacoes?idArea=1');
    const pesquisador = await request(app).get('/api/publicacoes?idPesquisador=104');
    const pesquisadorEArea = await request(app).get('/api/publicacoes?idPesquisador=104&idArea=1');
    const areaSemPublicacao = await request(app).get('/api/publicacoes?idArea=999');
    const pagina = await request(app).get('/api/publicacoes?pagina=2&porPagina=2');

    assert.strictEqual(busca.status, 200);
    assert.deepStrictEqual(
      busca.body.publicacoes.map((publicacao) => publicacao.id),
      [2, 3],
    );
    assert.deepStrictEqual(busca.body.paginacao, { pagina: 1, porPagina: 20, total: 2 });
    assert.strictEqual(ano.status, 200);
    assert.deepStrictEqual(
      ano.body.publicacoes.map((publicacao) => publicacao.id),
      [2],
    );
    assert.strictEqual(area.status, 200);
    assert.deepStrictEqual(
      area.body.publicacoes.map((publicacao) => publicacao.id),
      [1, 3],
    );
    assert.strictEqual(pesquisador.status, 200);
    assert.deepStrictEqual(
      pesquisador.body.publicacoes.map((publicacao) => publicacao.id),
      [2, 1],
    );
    assert.strictEqual(pesquisadorEArea.status, 200);
    assert.deepStrictEqual(
      pesquisadorEArea.body.publicacoes.map((publicacao) => publicacao.id),
      [1],
    );
    assert.strictEqual(areaSemPublicacao.status, 200);
    assert.deepStrictEqual(areaSemPublicacao.body.publicacoes, []);
    assert.deepStrictEqual(areaSemPublicacao.body.paginacao, { pagina: 1, porPagina: 20, total: 0 });
    assert.deepStrictEqual(ano.body.publicacoes[0].autores, [
      { id: 104, nome: 'Bruno Lima', ordem: 1 },
      { id: 117, nome: 'Carla Rocha', ordem: 2 },
      { id: 91, nome: 'Zuleica Souza', ordem: 3 },
    ]);
    assert.strictEqual(pagina.status, 200);
    assert.deepStrictEqual(
      pagina.body.publicacoes.map((publicacao) => publicacao.id),
      [3],
    );
    assert.deepStrictEqual(pagina.body.paginacao, { pagina: 2, porPagina: 2, total: 3 });
  });

  it('/api/publicacoes por área mantém ordenação por ano e id sem duplicar publicações', async () => {
    await consultar(
      `
        INSERT INTO publicacao (id_publicacao, id_projeto, tipo, ano, doi, veiculo, titulo)
        VALUES
          (10, 3, 'artigo', 2025, '10.1000/ordem-area-10', 'Revista de Testes', 'Publicação área 10'),
          (11, 3, 'artigo', 2025, '10.1000/ordem-area-11', 'Revista de Testes', 'Publicação área 11')
      `,
    );
    await consultar(
      `
        INSERT INTO autoria (id_pesquisador, id_publicacao, ordem)
        VALUES (91, 10, 1), (104, 11, 1)
      `,
    );
    await consultar(
      `
        INSERT INTO area_publicacao (id_publicacao, id_area)
        VALUES (10, 1), (10, 2), (11, 1)
      `,
    );

    const resposta = await request(app).get('/api/publicacoes?idArea=1&porPagina=100');

    assert.strictEqual(resposta.status, 200);
    const ids = resposta.body.publicacoes.map((publicacao) => publicacao.id);
    assert.deepStrictEqual(ids, [11, 10, 1, 3]);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it('/api/publicacoes valida filtros e inexistência', async () => {
    const tipo = await request(app).get('/api/publicacoes?tipo=tcc');
    const ano = await request(app).get('/api/publicacoes?ano=abc');
    const idArea = await request(app).get('/api/publicacoes?idArea=abc');
    const porPagina = await request(app).get('/api/publicacoes?porPagina=101');
    const inexistente = await request(app).get('/api/publicacoes/999');

    assert.strictEqual(tipo.status, 400);
    assert.strictEqual(tipo.body.mensagem, 'O tipo deve ser artigo, capítulo ou resumo.');
    assert.strictEqual(ano.status, 400);
    assert.strictEqual(ano.body.mensagem, 'O ano deve ser um número inteiro.');
    assert.strictEqual(idArea.status, 400);
    assert.strictEqual(idArea.body.mensagem, 'O id da área deve ser um número inteiro.');
    assert.strictEqual(porPagina.status, 400);
    assert.strictEqual(porPagina.body.mensagem, 'A quantidade por página deve ser um número inteiro entre 1 e 100.');
    assert.strictEqual(inexistente.status, 404);
    assert.strictEqual(inexistente.body.mensagem, 'Publicação não encontrada.');
  });

  it('/api/projetos lista projetos com filtros', async () => {
    const status = await request(app).get('/api/projetos?status=em_andamento');
    const idGrupo = await request(app).get('/api/projetos?idGrupo=2');

    assert.strictEqual(status.status, 200);
    assert.deepStrictEqual(status.body, {
      projetos: [projetoComputacaoFixture],
      paginacao: { pagina: 1, porPagina: 20, total: 1 },
    });
    assert.strictEqual(idGrupo.status, 200);
    assert.deepStrictEqual(idGrupo.body.projetos, [projetoComputacaoFixture]);
  });

  it('/api/projetos/:id retorna detalhe com edital, equipe, áreas e publicações', async () => {
    const resposta = await request(app).get('/api/projetos/3');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, {
      projeto: {
        id: 3,
        titulo: 'Inteligência artificial aplicada ao Agreste',
        resumo: 'Estuda a aplicação de aprendizado de máquina no contexto regional.',
        status: 'em_andamento',
        dataInicio: '2024-03-01',
        dataFim: null,
        origem: 'manual',
        grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
        edital: { id: 7, nome: 'Edital Universal nº 03/2022', ano: 2022 },
        areas: [{ id: 1, nome: 'Ciência da Computação' }],
        equipe: [
          { id: 91, nome: 'Zuleica Souza', papel: 'coordenador', dataEntrada: '2024-03-01' },
          { id: 104, nome: 'Bruno Lima', papel: 'participante', dataEntrada: '2024-03-10' },
        ],
        publicacoes: [
          { id: 2, titulo: 'Redes neurais para previsão climática no Agreste', tipo: 'resumo', ano: 2025 },
          { id: 1, titulo: 'Análise de desempenho de algoritmos de aprendizado', tipo: 'artigo', ano: 2024 },
        ],
      },
    });
  });

  it('/api/projetos valida status e inexistência', async () => {
    const status = await request(app).get('/api/projetos?status=ativo');
    const inexistente = await request(app).get('/api/projetos/999');

    assert.strictEqual(status.status, 400);
    assert.strictEqual(status.body.mensagem, 'O status deve ser planejado, em_andamento, concluido ou cancelado.');
    assert.strictEqual(inexistente.status, 404);
    assert.strictEqual(inexistente.body.mensagem, 'Projeto não encontrado.');
  });

  it('/api/grupos lista grupos em ordem alfabética crescente', async () => {
    const resposta = await request(app).get('/api/grupos');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(
      resposta.body.grupos.map((grupo) => grupo.nome),
      ['Grupo de Pesquisa em Agroecologia Digital', 'Grupo de Pesquisa em Computação Aplicada'],
    );
    assert.deepStrictEqual(resposta.body.paginacao, { pagina: 1, porPagina: 20, total: 2 });
  });

  it('/api/grupos lista grupos e retorna detalhe', async () => {
    const lista = await request(app).get('/api/grupos?busca=Computação');
    const detalhe = await request(app).get('/api/grupos/2');

    assert.strictEqual(lista.status, 200);
    assert.deepStrictEqual(lista.body, {
      grupos: [grupoComputacaoFixture],
      paginacao: { pagina: 1, porPagina: 20, total: 1 },
    });
    assert.strictEqual(detalhe.status, 200);
    assert.deepStrictEqual(detalhe.body, {
      grupo: {
        id: 2,
        nome: 'Grupo de Pesquisa em Computação Aplicada',
        linkDgp: 'http://dgp.cnpq.br/exemplo',
        anoCriacao: 2015,
        membros: [
          { id: 91, nome: 'Zuleica Souza', papel: 'lider' },
          { id: 104, nome: 'Bruno Lima', papel: 'membro' },
        ],
        projetos: [{ id: 3, titulo: 'Inteligência artificial aplicada ao Agreste', status: 'em_andamento' }],
      },
    });
  });

  it('/api/pesquisadores lista sem vazar email', async () => {
    const resposta = await request(app).get('/api/pesquisadores?busca=Zuleica');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, {
      pesquisadores: [pesquisadorZuleicaFixture],
      paginacao: { pagina: 1, porPagina: 20, total: 1 },
    });
    assert.strictEqual(Object.hasOwn(resposta.body.pesquisadores[0], 'email'), false);
  });

  it('/api/pesquisadores lista pesquisadores em ordem alfabética crescente', async () => {
    const resposta = await request(app).get('/api/pesquisadores');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(
      resposta.body.pesquisadores.map((pesquisador) => pesquisador.nome),
      ['Bruno Lima', 'Carla Rocha', 'Zuleica Souza'],
    );
    assert.deepStrictEqual(resposta.body.paginacao, { pagina: 1, porPagina: 20, total: 3 });
  });

  it('/api/pesquisadores/:id retorna perfil público sem dados internos', async () => {
    const resposta = await request(app).get('/api/pesquisadores/91');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, {
      id: 91,
      nome: 'Zuleica Souza',
      vinculo: 'docente',
      numeroLattes: '1234567890123456',
    });
    assert.strictEqual(Object.hasOwn(resposta.body, 'email'), false);
    assert.strictEqual(Object.hasOwn(resposta.body, 'idConta'), false);
  });

  it('/api/pesquisadores/:id retorna 404 para inexistente', async () => {
    const resposta = await request(app).get('/api/pesquisadores/9999');

    assert.strictEqual(resposta.status, 404);
    assert.strictEqual(resposta.body.mensagem, 'Pesquisador não encontrado.');
  });

  it('/api/pesquisadores/:id valida o identificador', async () => {
    const resposta = await request(app).get('/api/pesquisadores/abc');

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'O id deve ser um número inteiro maior que zero.');
  });

  it('/api/areas lista áreas ordenadas por nome', async () => {
    const resposta = await request(app).get('/api/areas');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, {
      areas: [
        { id: 2, nome: 'Agronomia' },
        { id: 1, nome: 'Ciência da Computação' },
      ],
    });
  });

  it('/api/editais lista editais publicamente por ano e nome', async () => {
    await consultar(
      `
        INSERT INTO edital (id_edital, nome_edital, ano)
        VALUES
          ($1, $2, $3),
          ($4, $5, $6),
          ($7, $8, $9)
      `,
      [
        8,
        'Chamada Interna 01/2024',
        2024,
        9,
        'Apoio a Projetos 02/2024',
        2024,
        10,
        'Edital de Extensão 01/2021',
        2021,
      ],
    );

    const resposta = await request(app).get('/api/editais');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, {
      editais: [
        { id: 9, nome: 'Apoio a Projetos 02/2024', ano: 2024, totalProjetos: 0, grupos: [] },
        { id: 8, nome: 'Chamada Interna 01/2024', ano: 2024, totalProjetos: 0, grupos: [] },
        {
          id: 7,
          nome: 'Edital Universal nº 03/2022',
          ano: 2022,
          totalProjetos: 1,
          grupos: [{ id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' }],
        },
        { id: 10, nome: 'Edital de Extensão 01/2021', ano: 2021, totalProjetos: 0, grupos: [] },
      ],
    });
  });

  it('/api/editais inclui os projetos vinculados ao informar comProjetos=1', async () => {
    await consultar('INSERT INTO edital (id_edital, nome_edital, ano) VALUES ($1, $2, $3)', [
      8,
      'Chamada Interna 01/2024',
      2024,
    ]);

    const resposta = await request(app).get('/api/editais?comProjetos=1');

    assert.strictEqual(resposta.status, 200);
    const edital7 = resposta.body.editais.find((edital) => edital.id === 7);
    const edital8 = resposta.body.editais.find((edital) => edital.id === 8);

    assert.deepStrictEqual(edital7.projetos, [
      {
        id: 3,
        titulo: 'Inteligência artificial aplicada ao Agreste',
        status: 'em_andamento',
        grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
      },
    ]);
    assert.strictEqual(edital8.totalProjetos, 0);
    assert.deepStrictEqual(edital8.grupos, []);
    assert.deepStrictEqual(edital8.projetos, []);
  });

  it('/api/editais valida o parâmetro comProjetos', async () => {
    const resposta = await request(app).get('/api/editais?comProjetos=abc');

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'O parâmetro comProjetos deve ser 1 ou true.');
  });

  it('/api/editais reúne os grupos distintos e ordenados dos projetos vinculados', async () => {
    await consultar(
      `
        INSERT INTO projeto_pesquisa (
          id_projeto, id_grupo, id_edital, titulo, resumo, data_inicio, data_fim, status, origem
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9),
          ($10, $11, $12, $13, $14, $15, $16, $17, $18)
      `,
      [
        5,
        1,
        7,
        'Agroecologia digital no semiárido',
        'Estuda práticas sustentáveis com apoio de tecnologia.',
        '2024-06-01',
        null,
        'planejado',
        'manual',
        6,
        1,
        7,
        'Monitoramento de solo com sensores de baixo custo',
        'Aplica sensores IoT para monitorar a umidade do solo.',
        '2024-07-01',
        null,
        'planejado',
        'manual',
      ],
    );

    const resposta = await request(app).get('/api/editais?comProjetos=1');

    assert.strictEqual(resposta.status, 200);
    const edital7 = resposta.body.editais.find((edital) => edital.id === 7);

    assert.strictEqual(edital7.totalProjetos, 3);
    assert.deepStrictEqual(edital7.grupos, [
      { id: 1, nome: 'Grupo de Pesquisa em Agroecologia Digital' },
      { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
    ]);
    assert.deepStrictEqual(
      edital7.projetos.map((projeto) => projeto.id),
      [6, 5, 3],
    );
  });

  it('/api/editais retorna lista vazia quando não há editais', async () => {
    await reiniciarCenarioTeste();

    const resposta = await request(app).get('/api/editais');
    const respostaComProjetos = await request(app).get('/api/editais?comProjetos=1');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body, { editais: [] });
    assert.strictEqual(respostaComProjetos.status, 200);
    assert.deepStrictEqual(respostaComProjetos.body, { editais: [] });
  });
});

describe('Indicadores de produções científicas', () => {
  beforeEach(reiniciarCenarioAcervoTeste);

  it('consulta os indicadores publicamente, sem token', async () => {
    const resposta = await request(app).get('/api/relatorios/indicadores-producoes');

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body.indicadores, {
      totalProducoes: 3,
      porAno: [
        { ano: 2023, quantidade: 1 },
        { ano: 2024, quantidade: 1 },
        { ano: 2025, quantidade: 1 },
      ],
      porTipo: [
        { tipo: 'artigo', quantidade: 1 },
        { tipo: 'capitulo', quantidade: 1 },
        { tipo: 'resumo', quantidade: 1 },
      ],
      porArea: [
        { idArea: 1, nome: 'Ciência da Computação', quantidade: 2 },
        { idArea: 2, nome: 'Agronomia', quantidade: 1 },
      ],
      areasDestaque: [{ idArea: 1, nome: 'Ciência da Computação', quantidade: 2 }],
    });
  });

  it('consolida produções por ano, tipo e área sem inflar contagens por autoria', async () => {
    const token = await tokenAlunoTeste();
    const resposta = await request(app)
      .get('/api/relatorios/indicadores-producoes')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body.indicadores, {
      totalProducoes: 3,
      porAno: [
        { ano: 2023, quantidade: 1 },
        { ano: 2024, quantidade: 1 },
        { ano: 2025, quantidade: 1 },
      ],
      porTipo: [
        { tipo: 'artigo', quantidade: 1 },
        { tipo: 'capitulo', quantidade: 1 },
        { tipo: 'resumo', quantidade: 1 },
      ],
      porArea: [
        { idArea: 1, nome: 'Ciência da Computação', quantidade: 2 },
        { idArea: 2, nome: 'Agronomia', quantidade: 1 },
      ],
      areasDestaque: [{ idArea: 1, nome: 'Ciência da Computação', quantidade: 2 }],
    });
  });

  it('mantém o total global ao vincular uma mesma produção a mais de uma área', async () => {
    await consultar(
      'INSERT INTO area_publicacao (id_publicacao, id_area) VALUES ($1, $2)',
      [1, 2],
    );
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .get('/api/relatorios/indicadores-producoes')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resposta.status, 200);
    assert.strictEqual(resposta.body.indicadores.totalProducoes, 3);
    assert.deepStrictEqual(resposta.body.indicadores.porArea, [
      { idArea: 2, nome: 'Agronomia', quantidade: 2 },
      { idArea: 1, nome: 'Ciência da Computação', quantidade: 2 },
    ]);
    assert.deepStrictEqual(
      resposta.body.indicadores.areasDestaque.map((area) => area.nome),
      ['Agronomia', 'Ciência da Computação'],
    );
  });

  it('retorna estrutura vazia e estável quando ainda não existem produções', async () => {
    await reiniciarCenarioTeste();
    const token = await tokenAdmin();

    const resposta = await request(app)
      .get('/api/relatorios/indicadores-producoes')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resposta.status, 200);
    assert.deepStrictEqual(resposta.body.indicadores, {
      totalProducoes: 0,
      porAno: [],
      porTipo: [],
      porArea: [],
      areasDestaque: [],
    });
  });
});

describe('Produções relacionadas', () => {
  beforeEach(reiniciarCenarioAcervoTeste);

  it('retorna 401 sem token e 200 com token válido', async () => {
    let resposta = await request(app).get('/api/publicacoes/1/relacionadas');
    assert.strictEqual(resposta.status, 401);

    const token = await tokenPesquisadorTeste();
    resposta = await request(app)
      .get('/api/publicacoes/1/relacionadas')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(resposta.status, 200);
  });

  it('não retorna a própria publicação', async () => {
    const token = await tokenPesquisadorTeste();
    const resposta = await request(app)
      .get('/api/publicacoes/1/relacionadas')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(resposta.status, 200);
    const publicacoes = resposta.body.publicacoes;
    const contemPropria = publicacoes.some((p) => p.id === 1);
    assert.strictEqual(contemPropria, false);
  });

  it('prioriza maior número de áreas em comum e respeita desempates', async () => {
    // A publicação 1 tem tipo 'artigo' e área 1. Vamos adicionar a área 2 para ela ter 2 áreas.
    await pool.query('INSERT INTO area_publicacao (id_publicacao, id_area) VALUES (1, 2)');

    // Pub 10: 2 áreas em comum (1 e 2), tipo diferente (resumo), ano 2024
    await pool.query("INSERT INTO publicacao (id_publicacao, id_projeto, tipo, ano, titulo, veiculo) VALUES (10, 3, 'resumo', 2024, 'Pub 10', 'V')");
    await pool.query("INSERT INTO area_publicacao (id_publicacao, id_area) VALUES (10, 1), (10, 2)");

    // Pub 11: 1 área em comum (1), mesmo tipo (artigo), ano 2025 (desempate por ano mais recente)
    await pool.query("INSERT INTO publicacao (id_publicacao, id_projeto, tipo, ano, titulo, veiculo) VALUES (11, 3, 'artigo', 2025, 'Pub 11', 'V')");
    await pool.query("INSERT INTO area_publicacao (id_publicacao, id_area) VALUES (11, 1)");

    // Pub 12: 1 área em comum (1), mesmo tipo (artigo), ano 2024 (desempate por id_publicacao menor que 13)
    await pool.query("INSERT INTO publicacao (id_publicacao, id_projeto, tipo, ano, titulo, veiculo) VALUES (12, 3, 'artigo', 2024, 'Pub 12', 'V')");
    await pool.query("INSERT INTO area_publicacao (id_publicacao, id_area) VALUES (12, 1)");

    // Pub 13: 1 área em comum (1), mesmo tipo (artigo), ano 2024 (desempate por id_publicacao maior)
    await pool.query("INSERT INTO publicacao (id_publicacao, id_projeto, tipo, ano, titulo, veiculo) VALUES (13, 3, 'artigo', 2024, 'Pub 13', 'V')");
    await pool.query("INSERT INTO area_publicacao (id_publicacao, id_area) VALUES (13, 1)");

    // Pub 14: 1 área em comum (1), tipo diferente (capitulo), ano 2025 (perde para os de mesmo tipo)
    await pool.query("INSERT INTO publicacao (id_publicacao, id_projeto, tipo, ano, titulo, veiculo) VALUES (14, 3, 'capitulo', 2025, 'Pub 14', 'V')");
    await pool.query("INSERT INTO area_publicacao (id_publicacao, id_area) VALUES (14, 1)");

    const token = await tokenPesquisadorTeste();
    const resposta = await request(app)
      .get('/api/publicacoes/1/relacionadas?limite=10')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resposta.status, 200);
    const idsRetornados = resposta.body.publicacoes.map(p => p.id);

    // Valida exata ordem:
    // 1º: 10 (2 áreas)
    // 2º: 11 (1 área, 'artigo', 2025)
    // 3º: 13 (1 área, 'artigo', 2024, id_publicacao DESC)
    // 4º: 12 (1 área, 'artigo', 2024)
    // 5º: 14 (1 área, 'capitulo', 2025)
    assert.deepStrictEqual(idsRetornados.slice(0, 5), [10, 11, 13, 12, 14]);
  });

  it('respeita limite padrão e máximo; ID inexistente retorna 404', async () => {
    const token = await tokenPesquisadorTeste();

    let resposta = await request(app)
      .get('/api/publicacoes/1/relacionadas')
      .set('Authorization', `Bearer ${token}`);
    assert.ok(resposta.body.publicacoes.length <= 5);

    resposta = await request(app)
      .get('/api/publicacoes/1/relacionadas?limite=20')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(resposta.status, 400);

    resposta = await request(app)
      .get('/api/publicacoes/999999/relacionadas')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(resposta.status, 404);
  });

  it('resultados trazem autores e áreas', async () => {
    const token = await tokenPesquisadorTeste();
    const resposta = await request(app)
      .get('/api/publicacoes/1/relacionadas')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(resposta.status, 200);
    const publicacoes = resposta.body.publicacoes;
    if (publicacoes.length > 0) {
      assert.ok(Array.isArray(publicacoes[0].autores));
      assert.ok(Array.isArray(publicacoes[0].areas));
    }
  });
});

describe('Cadastro do acervo', () => {
  beforeEach(reiniciarCenarioAcervoTeste);

  it('cria publicação com autor existente e autor novo mantendo ordem e origem manual', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Análise de desempenho de algoritmos de aprendizado II',
        tipo: 'artigo',
        ano: 2024,
        doi: ' 10.1000/exemplo.novo ',
        veiculo: 'Revista Brasileira de Computação',
        idProjeto: 3,
        autores: [
          { id: 91 },
          { nome: 'Bruno Manual', numeroLattes: '9876543210987654', vinculo: 'docente' },
        ],
        areas: [1],
      });

    assert.strictEqual(resposta.status, 201);
    assert.strictEqual(resposta.body.publicacao.doi, '10.1000/exemplo.novo');
    assert.deepStrictEqual(
      resposta.body.publicacao.autores.map((autor) => ({
        nome: autor.nome,
        ordem: autor.ordem,
      })),
      [
        { nome: 'Zuleica Souza', ordem: 1 },
        { nome: 'Bruno Manual', ordem: 2 },
      ],
    );
    assert.deepStrictEqual(resposta.body.publicacao.areas, [{ id: 1, nome: 'Ciência da Computação' }]);

    const autorNovo = await consultar(
      `
        SELECT email, origem
        FROM pesquisador
        WHERE numero_lattes = $1
      `,
      ['9876543210987654'],
    );
    assert.strictEqual(autorNovo.rows[0].email, '');
    assert.strictEqual(autorNovo.rows[0].origem, 'manual');
  });

  it('cria publicação com autor novo gravando email informado', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Publicação com email de autor',
        tipo: 'artigo',
        ano: 2024,
        doi: '10.1000/email-autor',
        veiculo: 'Revista de Teste',
        idProjeto: 3,
        autores: [
          {
            nome: 'Autora Com Email',
            numeroLattes: '7878787878787878',
            email: ' autora.manual@ufape.edu.br ',
            vinculo: 'docente',
          },
        ],
      });

    assert.strictEqual(resposta.status, 201);

    const autorNovo = await consultar(
      `
        SELECT email
        FROM pesquisador
        WHERE numero_lattes = $1
      `,
      ['7878787878787878'],
    );
    assert.strictEqual(autorNovo.rows[0].email, 'autora.manual@ufape.edu.br');
  });

  it('reusa número Lattes existente em autoria sem duplicar pesquisador', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Reuso de autoria importada',
        tipo: 'resumo',
        ano: 2026,
        doi: null,
        veiculo: 'Anais de Teste',
        idProjeto: 3,
        autores: [
          {
            nome: 'Nome Ignorado',
            numeroLattes: '2345678901234567',
            email: 'email.ignorado@ufape.edu.br',
            vinculo: 'docente',
          },
        ],
      });

    assert.strictEqual(resposta.status, 201);
    assert.deepStrictEqual(resposta.body.publicacao.autores, [{ id: 104, nome: 'Bruno Lima', ordem: 1 }]);

    const total = await consultar(
      `
        SELECT COUNT(*)::int AS total, MAX(email) AS email
        FROM pesquisador
        WHERE numero_lattes = $1
      `,
      ['2345678901234567'],
    );
    assert.strictEqual(total.rows[0].total, 1);
    assert.strictEqual(total.rows[0].email, 'bruno.lima@acervo.ufape.edu.br');
  });

  it('recusa email malformado de autor novo sem criar publicação nem pesquisador', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Publicação com email inválido',
        tipo: 'artigo',
        ano: 2024,
        doi: '10.1000/email-invalido',
        veiculo: 'Revista de Teste',
        idProjeto: 3,
        autores: [
          {
            nome: 'Autor Email Inválido',
            numeroLattes: '7979797979797979',
            email: 'email-invalido',
            vinculo: 'docente',
          },
        ],
      });

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Informe um email válido para o autor novo.');

    const restos = await consultar(
      `
        SELECT
          (SELECT COUNT(*)::int FROM publicacao WHERE doi = $1) AS publicacoes,
          (SELECT COUNT(*)::int FROM pesquisador WHERE numero_lattes = $2) AS pesquisadores
      `,
      ['10.1000/email-invalido', '7979797979797979'],
    );

    assert.deepStrictEqual(restos.rows[0], { publicacoes: 0, pesquisadores: 0 });
  });

  it('recusa email de autor novo acima de 150 caracteres', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Publicação com email longo',
        tipo: 'artigo',
        ano: 2024,
        doi: '10.1000/email-longo',
        veiculo: 'Revista de Teste',
        idProjeto: 3,
        autores: [
          {
            nome: 'Autor Email Longo',
            numeroLattes: '8080808080808080',
            email: `${'a'.repeat(142)}@ufape.edu.br`,
            vinculo: 'docente',
          },
        ],
      });

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'O email do autor deve ter no máximo 150 caracteres.');
  });

  it('recusa payloads inválidos de publicação', async () => {
    const token = await tokenPesquisadorTeste();
    const base = {
      titulo: 'Publicação válida',
      tipo: 'artigo',
      ano: 2024,
      doi: null,
      veiculo: 'Revista',
      idProjeto: 3,
      autores: [{ id: 91 }],
    };

    const casos = [
      [{ ...base, titulo: '' }, 'Informe o título.'],
      [{ ...base, titulo: 'x'.repeat(256) }, 'O título deve ter no máximo 255 caracteres.'],
      [{ ...base, tipo: 'tcc' }, 'O tipo deve ser artigo, capítulo ou resumo.'],
      [{ ...base, ano: 1949 }, 'O ano deve ser um número inteiro entre 1950 e 2100.'],
      [{ ...base, veiculo: '' }, 'Informe o veículo.'],
      [{ ...base, veiculo: 'x'.repeat(151) }, 'O veículo deve ter no máximo 150 caracteres.'],
      [{ ...base, doi: 'x'.repeat(101) }, 'O DOI deve ter no máximo 100 caracteres.'],
      [{ ...base, idProjeto: 999 }, 'Projeto não encontrado.'],
      [{ ...base, areas: [999] }, 'Área não encontrada.'],
      [{ ...base, autores: [] }, 'Informe ao menos um autor.'],
      [{ ...base, autores: [{ id: 999 }] }, 'Autor não encontrado.'],
      [{ ...base, autores: [{ id: 91, nome: 'Ambíguo', numeroLattes: '1', vinculo: 'docente' }] }, 'Informe um autor existente ou os dados de um autor novo.'],
      [{ ...base, autores: [{ nome: 'Sem Lattes', vinculo: 'docente' }] }, 'Informe um autor existente ou os dados de um autor novo.'],
      [{ ...base, autores: [{ id: 91 }, { id: 91 }] }, 'Não repita o mesmo autor na lista.'],
      [{ ...base, autores: [{ nome: 'A', numeroLattes: '999', vinculo: 'docente' }, { nome: 'B', numeroLattes: '999', vinculo: 'externo' }] }, 'Não repita o mesmo autor na lista.'],
    ];

    for (const [payload, mensagem] of casos) {
      const resposta = await request(app)
        .post('/api/publicacoes')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      assert.strictEqual(resposta.status, 400);
      assert.match(resposta.body.mensagem, new RegExp(mensagem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('retorna 400 para campos malformados de publicação sem gerar 500', async () => {
    const token = await tokenPesquisadorTeste();
    const antes = await consultar('SELECT COUNT(*)::int AS total FROM publicacao');
    const base = {
      titulo: 'Publicação malformada',
      tipo: 'artigo',
      ano: 2024,
      veiculo: 'Revista',
      idProjeto: 3,
      autores: [{ id: 91 }],
    };

    const casos = [
      {
        titulo: { texto: 'inválido' },
        tipo: 'artigo',
        ano: '2024',
        veiculo: 'Revista',
        idProjeto: 3,
        autores: [{ id: '91' }],
      },
      { ...base, autores: [null] },
      { ...base, autores: [{ id: 91 }, null] },
      { ...base, areas: '1' },
      { ...base, areas: ['1'] },
    ];

    for (const payload of casos) {
      const resposta = await request(app)
        .post('/api/publicacoes')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      assert.strictEqual(resposta.status, 400);
      assert.strictEqual(resposta.body.mensagem, 'Campos da publicação inválidos.');
    }

    const depois = await consultar('SELECT COUNT(*)::int AS total FROM publicacao');
    assert.strictEqual(depois.rows[0].total, antes.rows[0].total);
  });

  it('vincula usuários pesquisadores como coautores sem duplicar a produção e permite consultá-la por cada perfil', async () => {
    const autorPrincipal = await cadastrar(
      dadosPesquisador({
        nome: 'Docente Autor Principal',
        email: 'autor.principal@ufape.edu.br',
        numeroLattes: '4545454545454545',
        vinculo: 'docente',
      }),
    );
    const coautor = await cadastrar(
      dadosPesquisador({
        nome: 'Discente Coautor',
        email: 'coautor.discente@ufape.edu.br',
        numeroLattes: '4646464646464646',
        vinculo: 'discente',
      }),
    );

    assert.strictEqual(autorPrincipal.status, 201);
    assert.strictEqual(coautor.status, 201);

    const pesquisadores = await consultar(
      `
        SELECT id_pesquisador, email
        FROM pesquisador
        WHERE email = ANY($1::text[])
      `,
      [['autor.principal@ufape.edu.br', 'coautor.discente@ufape.edu.br']],
    );
    const idPorEmail = new Map(pesquisadores.rows.map((pesquisador) => [pesquisador.email, pesquisador.id_pesquisador]));
    const idAutorPrincipal = idPorEmail.get('autor.principal@ufape.edu.br');
    const idCoautor = idPorEmail.get('coautor.discente@ufape.edu.br');

    const cadastro = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${autorPrincipal.body.token}`)
      .send({
        titulo: 'Produção compartilhada entre coautores',
        tipo: 'artigo',
        ano: 2026,
        doi: '10.1000/coautoria-compartilhada',
        veiculo: 'Revista de Integração Científica',
        idProjeto: 3,
        autores: [{ id: idAutorPrincipal }, { id: idCoautor }],
        areas: [1],
      });

    assert.strictEqual(cadastro.status, 201);
    assert.deepStrictEqual(
      cadastro.body.publicacao.autores.map((autor) => [autor.id, autor.ordem]),
      [[idAutorPrincipal, 1], [idCoautor, 2]],
    );

    const [porAutorPrincipal, porCoautor] = await Promise.all([
      request(app).get(`/api/publicacoes?idPesquisador=${idAutorPrincipal}`),
      request(app).get(`/api/publicacoes?idPesquisador=${idCoautor}`),
    ]);

    const idPublicacao = cadastro.body.publicacao.id;
    assert.ok(porAutorPrincipal.body.publicacoes.some((publicacao) => publicacao.id === idPublicacao));
    assert.ok(porCoautor.body.publicacoes.some((publicacao) => publicacao.id === idPublicacao));

    const quantidade = await consultar(
      'SELECT COUNT(*)::int AS total FROM publicacao WHERE doi = $1',
      ['10.1000/coautoria-compartilhada'],
    );
    assert.strictEqual(quantidade.rows[0].total, 1);
  });

  it('remove áreas repetidas antes de gravar a publicação', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Publicação com áreas sem repetição',
        tipo: 'artigo',
        ano: 2026,
        doi: '10.1000/areas-sem-repeticao',
        veiculo: 'Revista de Testes',
        idProjeto: 3,
        autores: [{ id: 91 }],
        areas: [1, 1, 2],
      });

    assert.strictEqual(resposta.status, 201);
    assert.deepStrictEqual(
      resposta.body.publicacao.areas.map((area) => area.id).sort((a, b) => a - b),
      [1, 2],
    );

    const associacoes = await consultar(
      'SELECT id_area FROM area_publicacao WHERE id_publicacao = $1 ORDER BY id_area',
      [resposta.body.publicacao.id],
    );
    assert.deepStrictEqual(associacoes.rows.map((linha) => linha.id_area), [1, 2]);
  });

  it('retorna 409 para DOI repetido', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'DOI repetido',
        tipo: 'artigo',
        ano: 2024,
        doi: '10.1000/exemplo.1',
        veiculo: 'Revista',
        idProjeto: 3,
        autores: [{ id: 91 }],
      });

    assert.strictEqual(resposta.status, 409);
    assert.strictEqual(resposta.body.mensagem, 'Já existe uma publicação com esse DOI.');
  });

  it('faz rollback de publicação quando autor posterior é inexistente', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/publicacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Publicação com falha transacional',
        tipo: 'artigo',
        ano: 2024,
        doi: '10.1000/rollback',
        veiculo: 'Revista',
        idProjeto: 3,
        autores: [
          { nome: 'Autor Temporário', numeroLattes: '1010101010101010', vinculo: 'docente' },
          { id: 999 },
        ],
      });

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Autor não encontrado.');

    const restos = await consultar(
      `
        SELECT
          (SELECT COUNT(*)::int FROM publicacao WHERE doi = $1) AS publicacoes,
          (SELECT COUNT(*)::int FROM pesquisador WHERE numero_lattes = $2) AS pesquisadores
      `,
      ['10.1000/rollback', '1010101010101010'],
    );

    assert.deepStrictEqual(restos.rows[0], { publicacoes: 0, pesquisadores: 0 });
  });

  it('cria projeto com edital, áreas e participação de coordenador', async () => {
    const token = await tokenPesquisadorTeste({ numeroLattes: '5656565656565656' });

    const resposta = await request(app)
      .post('/api/projetos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Inteligência artificial aplicada ao Agreste II',
        resumo: 'Estuda a aplicação de aprendizado de máquina.',
        dataInicio: '2024-03-01',
        dataFim: null,
        status: 'em_andamento',
        idGrupo: 2,
        idEdital: 7,
        areas: [1, 2],
      });

    assert.strictEqual(resposta.status, 201);
    assert.strictEqual(resposta.body.projeto.origem, 'manual');
    assert.deepStrictEqual(resposta.body.projeto.edital, { id: 7, nome: 'Edital Universal nº 03/2022', ano: 2022 });
    assert.deepStrictEqual(
      resposta.body.projeto.areas.map((area) => area.id),
      [2, 1],
    );
    assert.deepStrictEqual(resposta.body.projeto.equipe, [
      { id: resposta.body.projeto.equipe[0].id, nome: 'Pesquisadora Cadastro', papel: 'coordenador', dataEntrada: '2024-03-01' },
    ]);
  });

  it('cria projeto sem edital e sem participação automática para admin', async () => {
    await garantirAdminInicial();
    const token = await tokenAdmin();

    const resposta = await request(app)
      .post('/api/projetos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Projeto criado por admin',
        resumo: null,
        dataInicio: '2025-01-10',
        dataFim: null,
        status: 'planejado',
        idGrupo: 2,
        areas: [],
      });

    assert.strictEqual(resposta.status, 201);
    assert.strictEqual(resposta.body.projeto.edital, null);
    assert.deepStrictEqual(resposta.body.projeto.equipe, []);
  });

  it('recusa payloads inválidos de projeto', async () => {
    const token = await tokenPesquisadorTeste();
    const base = {
      titulo: 'Projeto válido',
      resumo: 'Resumo',
      dataInicio: '2024-01-01',
      dataFim: null,
      status: 'planejado',
      idGrupo: 2,
      idEdital: null,
      areas: [1],
    };

    const casos = [
      [{ ...base, titulo: '' }, 'Informe o título.'],
      [{ ...base, titulo: 'x'.repeat(256) }, 'O título deve ter no máximo 255 caracteres.'],
      [{ ...base, resumo: 'x'.repeat(5001) }, 'O resumo deve ter no máximo 5000 caracteres.'],
      [{ ...base, status: 'ativo' }, 'O status deve ser planejado, em_andamento, concluido ou cancelado.'],
      [{ ...base, dataInicio: '01-01-2024' }, 'Informe a data de início no formato YYYY-MM-DD.'],
      [{ ...base, dataFim: '2023-12-31' }, 'A data de fim não pode ser anterior à de início.'],
      [{ ...base, idGrupo: 999 }, 'Grupo não encontrado.'],
      [{ ...base, idEdital: 999 }, 'Edital não encontrado.'],
      [{ ...base, areas: [999] }, 'Área não encontrada.'],
    ];

    for (const [payload, mensagem] of casos) {
      const resposta = await request(app)
        .post('/api/projetos')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      assert.strictEqual(resposta.status, 400);
      assert.match(resposta.body.mensagem, new RegExp(mensagem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('retorna 400 para campos malformados de projeto sem gerar 500', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/projetos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: ['Projeto'],
        status: 'planejado',
        dataInicio: '2024-01-01',
        idGrupo: '2',
        areas: ['1'],
      });

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Campos do projeto inválidos.');
  });

  it('cria grupo com membro líder para pesquisador e sem membro para admin', async () => {
    const tokenPesquisador = await tokenPesquisadorTeste();
    const grupoPesquisador = await request(app)
      .post('/api/grupos')
      .set('Authorization', `Bearer ${tokenPesquisador}`)
      .send({
        nome: 'Grupo de Pesquisa em Sistemas Inteligentes',
        linkDgp: 'http://dgp.cnpq.br/sistemas',
        anoCriacao: 2020,
      });

    assert.strictEqual(grupoPesquisador.status, 201);
    assert.deepStrictEqual(grupoPesquisador.body.grupo.membros, [
      { id: grupoPesquisador.body.grupo.membros[0].id, nome: 'Pesquisadora Cadastro', papel: 'lider' },
    ]);

    await garantirAdminInicial();
    const tokenDoAdmin = await tokenAdmin();
    const grupoAdmin = await request(app)
      .post('/api/grupos')
      .set('Authorization', `Bearer ${tokenDoAdmin}`)
      .send({
        nome: 'Grupo Criado por Admin',
        linkDgp: null,
        anoCriacao: 2021,
      });

    assert.strictEqual(grupoAdmin.status, 201);
    assert.deepStrictEqual(grupoAdmin.body.grupo.membros, []);
  });

  it('recusa payloads inválidos de grupo e nome repetido', async () => {
    const token = await tokenPesquisadorTeste();
    const base = {
      nome: 'Grupo Válido',
      linkDgp: null,
      anoCriacao: 2020,
    };

    const casos = [
      [{ ...base, nome: '' }, 400, 'Informe o nome.'],
      [{ ...base, nome: 'x'.repeat(151) }, 400, 'O nome deve ter no máximo 150 caracteres.'],
      [{ ...base, linkDgp: 'x'.repeat(256) }, 400, 'O link DGP deve ter no máximo 255 caracteres.'],
      [{ ...base, anoCriacao: 1949 }, 400, 'O ano de criação deve ser um número inteiro entre 1950 e 2100.'],
      [{ ...base, nome: 'Grupo de Pesquisa em Computação Aplicada' }, 409, 'Já existe um grupo com esse nome.'],
    ];

    for (const [payload, status, mensagem] of casos) {
      const resposta = await request(app)
        .post('/api/grupos')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      assert.strictEqual(resposta.status, status);
      assert.strictEqual(resposta.body.mensagem, mensagem);
    }
  });

  it('retorna 400 para campos malformados de grupo sem gerar 500', async () => {
    const token = await tokenPesquisadorTeste();

    const resposta = await request(app)
      .post('/api/grupos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: { texto: 'Grupo' }, anoCriacao: '2020' });

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Campos do grupo inválidos.');
  });

  it('retorna 403 para aluno nas três rotas de cadastro', async () => {
    const token = await tokenAlunoTeste();

    const respostas = await Promise.all([
      request(app).post('/api/publicacoes').set('Authorization', `Bearer ${token}`).send({}),
      request(app).post('/api/projetos').set('Authorization', `Bearer ${token}`).send({}),
      request(app).post('/api/grupos').set('Authorization', `Bearer ${token}`).send({}),
    ]);

    for (const resposta of respostas) {
      assert.strictEqual(resposta.status, 403);
      assert.strictEqual(resposta.body.mensagem, 'Seu perfil não tem permissão para acessar este recurso.');
    }
  });

  it('retorna 401 sem token nas três rotas de cadastro', async () => {
    const respostas = await Promise.all([
      request(app).post('/api/publicacoes').send({}),
      request(app).post('/api/projetos').send({}),
      request(app).post('/api/grupos').send({}),
    ]);

    for (const resposta of respostas) {
      assert.strictEqual(resposta.status, 401);
      assert.strictEqual(resposta.body.mensagem, 'Envie o token de acesso no cabeçalho Authorization.');
    }
  });

  it('edição de publicação exige autenticação e perfil autorizado', async () => {
    const tokenAluno = await tokenAlunoTeste();
    const corpo = {
      titulo: 'Publicação protegida',
      tipo: 'artigo',
      ano: 2024,
      doi: null,
      veiculo: 'Revista',
      idProjeto: 3,
      autores: [{ id: 91 }],
      areas: [1],
    };

    const [semToken, comoAluno] = await Promise.all([
      request(app).put('/api/publicacoes/1').send(corpo),
      request(app)
        .put('/api/publicacoes/1')
        .set('Authorization', `Bearer ${tokenAluno}`)
        .send(corpo),
    ]);

    assert.strictEqual(semToken.status, 401);
    assert.strictEqual(comoAluno.status, 403);
  });

  it('retorna 403 para pesquisador autenticado sem linha em pesquisador', async () => {
    const token = await tokenPesquisadorSemPerfil();

    const resposta = await request(app)
      .post('/api/grupos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Grupo Inconsistente',
        linkDgp: null,
        anoCriacao: 2020,
      });

    assert.strictEqual(resposta.status, 403);
    assert.strictEqual(resposta.body.mensagem, 'Sua conta não está vinculada a um pesquisador.');
  });
});

describe('CRUD completo, Views, vagas e candidaturas', () => {
  beforeEach(reiniciarCenarioAcervoTeste);

  it('atualiza e exclui projetos preservando relações e cascatas', async () => {
    const token = await tokenPesquisadorTeste();

    const atualizacao = await request(app)
      .put('/api/projetos/3')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Projeto atualizado para a entrega',
        resumo: 'Resumo atualizado.',
        dataInicio: '2024-03-01',
        dataFim: '2026-12-20',
        status: 'concluido',
        idGrupo: 2,
        idEdital: null,
        areas: [2],
      });

    assert.strictEqual(atualizacao.status, 200);
    assert.strictEqual(atualizacao.body.projeto.titulo, 'Projeto atualizado para a entrega');
    assert.strictEqual(atualizacao.body.projeto.status, 'concluido');
    assert.strictEqual(atualizacao.body.projeto.edital, null);
    assert.deepStrictEqual(atualizacao.body.projeto.areas.map((area) => area.id), [2]);

    const exclusao = await request(app)
      .delete('/api/projetos/4')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(exclusao.status, 204);

    const restos = await consultar(`
      SELECT
        (SELECT COUNT(*)::int FROM projeto_pesquisa WHERE id_projeto = 4) AS projetos,
        (SELECT COUNT(*)::int FROM publicacao WHERE id_projeto = 4) AS publicacoes
    `);

    assert.deepStrictEqual(restos.rows[0], { projetos: 0, publicacoes: 0 });
  });

  it('atualiza autoria de publicação e exclui autorias por cascata', async () => {
    const token = await tokenPesquisadorTeste();

    const atualizacao = await request(app)
      .put('/api/publicacoes/1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Publicação revisada',
        tipo: 'artigo',
        ano: 2026,
        doi: '10.1000/exemplo.1',
        veiculo: 'Revista de Testes do Scientia',
        idProjeto: 4,
        autores: [{ id: 117 }, { id: 91 }],
        areas: [2],
      });

    assert.strictEqual(atualizacao.status, 200);
    assert.strictEqual(atualizacao.body.publicacao.projeto.id, 4);
    assert.deepStrictEqual(atualizacao.body.publicacao.areas, [{ id: 2, nome: 'Agronomia' }]);
    assert.deepStrictEqual(
      atualizacao.body.publicacao.autores.map((autor) => [autor.id, autor.ordem]),
      [
        [117, 1],
        [91, 2],
      ],
    );

    const [porAutorRemovido, porAutorNovo, porAreaAntiga, porAreaNova] = await Promise.all([
      request(app).get('/api/publicacoes?idPesquisador=104'),
      request(app).get('/api/publicacoes?idPesquisador=117'),
      request(app).get('/api/publicacoes?idArea=1'),
      request(app).get('/api/publicacoes?idArea=2'),
    ]);
    assert.ok(!porAutorRemovido.body.publicacoes.some((publicacao) => publicacao.id === 1));
    assert.ok(porAutorNovo.body.publicacoes.some((publicacao) => publicacao.id === 1));
    assert.ok(!porAreaAntiga.body.publicacoes.some((publicacao) => publicacao.id === 1));
    assert.ok(porAreaNova.body.publicacoes.some((publicacao) => publicacao.id === 1));

    const exclusao = await request(app)
      .delete('/api/publicacoes/2')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(exclusao.status, 204);

    const relacionamentos = await consultar(
      `
        SELECT
          (SELECT COUNT(*)::int FROM autoria WHERE id_publicacao = $1) AS autorias,
          (SELECT COUNT(*)::int FROM area_publicacao WHERE id_publicacao = $1) AS areas
      `,
      [2],
    );
    assert.deepStrictEqual(relacionamentos.rows[0], { autorias: 0, areas: 0 });
  });

  it('atualização inválida de área não altera publicação, autoria nem áreas anteriores', async () => {
    const token = await tokenPesquisadorTeste();
    const antes = await request(app).get('/api/publicacoes/1');

    const resposta = await request(app)
      .put('/api/publicacoes/1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Título que não deve persistir',
        tipo: 'artigo',
        ano: 2026,
        doi: '10.1000/exemplo.1',
        veiculo: 'Revista que não deve persistir',
        idProjeto: 4,
        autores: [{ id: 117 }],
        areas: [999],
      });

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Área não encontrada.');

    const depois = await request(app).get('/api/publicacoes/1');
    assert.deepStrictEqual(depois.body, antes.body);
  });

  it('atualiza grupo, exclui grupo sem projetos e protege grupo referenciado', async () => {
    const token = await tokenPesquisadorTeste();

    const atualizacao = await request(app)
      .put('/api/grupos/2')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Grupo de Computação Aplicada Atualizado',
        linkDgp: 'https://dgp.cnpq.br/grupo-atualizado',
        anoCriacao: 2016,
      });

    assert.strictEqual(atualizacao.status, 200);
    assert.strictEqual(atualizacao.body.grupo.nome, 'Grupo de Computação Aplicada Atualizado');

    const cadastro = await request(app)
      .post('/api/grupos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Grupo Temporário para Exclusão',
        linkDgp: null,
        anoCriacao: 2026,
      });

    assert.strictEqual(cadastro.status, 201);

    const exclusao = await request(app)
      .delete(`/api/grupos/${cadastro.body.grupo.id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(exclusao.status, 204);

    const protegido = await request(app)
      .delete('/api/grupos/2')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(protegido.status, 409);
    assert.strictEqual(protegido.body.mensagem, 'Não é possível excluir um grupo que possui projetos.');
  });

  it('consulta as três Views pelos endpoints de relatórios com agregações coerentes', async () => {
    const projetos = await request(app).get('/api/relatorios/projetos');
    const publicacoes = await request(app).get('/api/relatorios/publicacoes');
    const grupos = await request(app).get('/api/relatorios/grupos');

    assert.strictEqual(projetos.status, 200);
    assert.strictEqual(publicacoes.status, 200);
    assert.strictEqual(grupos.status, 200);

    const projeto = projetos.body.projetos.find((item) => item.idProjeto === 3);
    assert.strictEqual(projeto.nomeGrupo, 'Grupo de Pesquisa em Computação Aplicada');
    assert.strictEqual(projeto.quantidadePublicacoes, 2);

    const linhasPublicacao = publicacoes.body.publicacoes.filter((item) => item.idPublicacao === 2);
    assert.deepStrictEqual(
      linhasPublicacao.map((item) => [item.idPesquisador, item.ordemAutor]),
      [
        [104, 1],
        [117, 2],
        [91, 3],
      ],
    );

    const grupo = grupos.body.grupos.find((item) => item.idGrupo === 2);
    assert.strictEqual(grupo.quantidadePesquisadores, 2);
    assert.strictEqual(grupo.quantidadeProjetos, 1);
    assert.strictEqual(grupo.projetosEmAndamento, 1);
    assert.strictEqual(grupo.lideres, 'Zuleica Souza');
  });

  it('executa CRUD de vagas e valida projeto, quantidade e status', async () => {
    const token = await tokenPesquisadorTeste();

    const invalida = await request(app)
      .post('/api/vagas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idProjeto: 999,
        titulo: 'Vaga inválida',
        requisitos: null,
        status: 'aberta',
        qtdVagas: 1,
        dataAbertura: '2026-08-23',
      });
    assert.strictEqual(invalida.status, 400);
    assert.strictEqual(invalida.body.mensagem, 'Projeto não encontrado.');

    const cadastro = await request(app)
      .post('/api/vagas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idProjeto: 3,
        titulo: 'Iniciação científica em IA',
        requisitos: 'Conhecimentos básicos de programação.',
        status: 'aberta',
        qtdVagas: 2,
        dataAbertura: '2026-08-23',
      });

    assert.strictEqual(cadastro.status, 201);
    assert.strictEqual(cadastro.body.vaga.projeto.id, 3);
    assert.strictEqual(cadastro.body.vaga.totalCandidaturas, 0);
    const idVaga = cadastro.body.vaga.id;

    const atualizacao = await request(app)
      .put(`/api/vagas/${idVaga}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        idProjeto: 3,
        titulo: 'Iniciação científica em IA atualizada',
        requisitos: 'Python e banco de dados.',
        status: 'fechada',
        qtdVagas: 3,
        dataAbertura: '2026-08-23',
      });

    assert.strictEqual(atualizacao.status, 200);
    assert.strictEqual(atualizacao.body.vaga.status, 'fechada');
    assert.strictEqual(atualizacao.body.vaga.qtdVagas, 3);

    const exclusao = await request(app)
      .delete(`/api/vagas/${idVaga}`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(exclusao.status, 204);

    const inexistente = await request(app).get(`/api/vagas/${idVaga}`);
    assert.strictEqual(inexistente.status, 404);
  });

  it('executa fluxo completo de candidatura pela chave composta', async () => {
    const tokenPesquisador = await tokenPesquisadorTeste();
    const cadastroVaga = await request(app)
      .post('/api/vagas')
      .set('Authorization', `Bearer ${tokenPesquisador}`)
      .send({
        idProjeto: 3,
        titulo: 'Vaga para testar candidatura',
        requisitos: null,
        status: 'aberta',
        qtdVagas: 1,
        dataAbertura: '2026-08-23',
      });
    assert.strictEqual(cadastroVaga.status, 201);
    const idVaga = cadastroVaga.body.vaga.id;

    const tokenAluno = await tokenAlunoTeste();
    const aluno = await consultar(
      `
        SELECT a.id_aluno
        FROM aluno a
        JOIN conta c ON c.id_conta = a.id_conta
        WHERE c.email = $1
      `,
      ['aluno.acervo@ufape.edu.br'],
    );
    const idAluno = aluno.rows[0].id_aluno;

    const cadastro = await request(app)
      .post('/api/candidaturas')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ idVaga });

    assert.strictEqual(cadastro.status, 201);
    assert.strictEqual(cadastro.body.candidatura.aluno.id, idAluno);
    assert.strictEqual(cadastro.body.candidatura.vaga.id, idVaga);
    assert.strictEqual(cadastro.body.candidatura.status, 'pendente');

    const duplicada = await request(app)
      .post('/api/candidaturas')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ idVaga });
    assert.strictEqual(duplicada.status, 409);

    const atualizacao = await request(app)
      .put(`/api/candidaturas/${idAluno}/${idVaga}`)
      .set('Authorization', `Bearer ${tokenPesquisador}`)
      .send({ status: 'aprovada' });
    assert.strictEqual(atualizacao.status, 200);
    assert.strictEqual(atualizacao.body.candidatura.status, 'aprovada');

    const listaAluno = await request(app)
      .get('/api/candidaturas')
      .set('Authorization', `Bearer ${tokenAluno}`);
    assert.strictEqual(listaAluno.status, 200);
    assert.deepStrictEqual(listaAluno.body.paginacao, { pagina: 1, porPagina: 20, total: 1 });
    assert.strictEqual(listaAluno.body.candidaturas[0].aluno.id, idAluno);

    const exclusao = await request(app)
      .delete(`/api/candidaturas/${idAluno}/${idVaga}`)
      .set('Authorization', `Bearer ${tokenAluno}`);
    assert.strictEqual(exclusao.status, 204);

    const detalhe = await request(app)
      .get(`/api/candidaturas/${idAluno}/${idVaga}`)
      .set('Authorization', `Bearer ${tokenPesquisador}`);
    assert.strictEqual(detalhe.status, 404);
  });

  it('impede candidatura em vaga fechada e acesso do aluno a candidatura alheia', async () => {
    const tokenPesquisador = await tokenPesquisadorTeste();
    const cadastroVaga = await request(app)
      .post('/api/vagas')
      .set('Authorization', `Bearer ${tokenPesquisador}`)
      .send({
        idProjeto: 3,
        titulo: 'Vaga fechada',
        requisitos: null,
        status: 'fechada',
        qtdVagas: 1,
        dataAbertura: '2026-08-23',
      });
    const idVaga = cadastroVaga.body.vaga.id;
    const tokenAluno = await tokenAlunoTeste();

    const fechada = await request(app)
      .post('/api/candidaturas')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ idVaga });
    assert.strictEqual(fechada.status, 409);
    assert.strictEqual(fechada.body.mensagem, 'A vaga está fechada para novas candidaturas.');

    const acessoAlheio = await request(app)
      .get(`/api/candidaturas/999/${idVaga}`)
      .set('Authorization', `Bearer ${tokenAluno}`);
    assert.strictEqual(acessoAlheio.status, 403);
    assert.strictEqual(acessoAlheio.body.mensagem, 'Você só pode acessar suas próprias candidaturas.');
  });
});
});
