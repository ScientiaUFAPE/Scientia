import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import request from 'supertest';

import { criarApp } from '../app.js';
import { ErroHttp } from '../erros/ErroHttp.js';
import { exigeTipo } from '../middlewares/autorizacao.js';
import { rotaNaoEncontrada, tratadorDeErros } from '../middlewares/erros.js';

const app = criarApp();
const executar = promisify(execFile);
const caminhoAmbiente = resolve(import.meta.dirname, '../config/ambiente.js');

function respostaFalsa() {
  return {
    statusRecebido: null,
    corpoRecebido: null,
    status(valor) {
      this.statusRecebido = valor;
      return this;
    },
    json(corpo) {
      this.corpoRecebido = corpo;
      return this;
    },
  };
}

describe('Bordas do tratamento de erros', () => {
  it('rota inexistente sem token responde 401, sem revelar que a rota não existe', async () => {
    const resposta = await request(app).get('/api/nao-existe');

    assert.strictEqual(resposta.status, 401);
    assert.doesNotMatch(resposta.body.mensagem ?? '', /não existe|not found/i);
  });

  it('corpo com JSON inválido responde 400 sem vazar o erro do parser', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    assert.strictEqual(resposta.status, 400);
    assert.strictEqual(resposta.body.mensagem, 'Corpo da requisição não é um JSON válido.');
  });

  it('corpo acima do limite responde 413', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a'.repeat(200 * 1024) }));

    assert.strictEqual(resposta.status, 413);
    assert.strictEqual(
      resposta.body.mensagem,
      'Corpo da requisição excede o tamanho máximo permitido.',
    );
  });

  it('erro sem status responde 500 genérico e não devolve a mensagem original', () => {
    const res = respostaFalsa();
    const errosDoConsole = [];
    const original = console.error;
    console.error = (...args) => errosDoConsole.push(args);

    try {
      tratadorDeErros(new Error('detalhe interno da conexão'), {}, res, () => {});
    } finally {
      console.error = original;
    }

    assert.strictEqual(res.statusRecebido, 500);
    assert.strictEqual(res.corpoRecebido.mensagem, 'Erro inesperado no servidor.');
    assert.strictEqual(errosDoConsole.length, 1);
  });

  it('erro com status conhecido devolve a própria mensagem', () => {
    const res = respostaFalsa();

    tratadorDeErros(new ErroHttp(422, 'Ano fora do intervalo aceito.'), {}, res, () => {});

    assert.strictEqual(res.statusRecebido, 422);
    assert.strictEqual(res.corpoRecebido.mensagem, 'Ano fora do intervalo aceito.');
  });

  it('rotaNaoEncontrada encaminha um ErroHttp 404 para o próximo middleware', () => {
    let recebido = null;

    rotaNaoEncontrada({ method: 'DELETE', path: '/api/x' }, {}, (erro) => {
      recebido = erro;
    });

    assert.ok(recebido instanceof ErroHttp);
    assert.strictEqual(recebido.status, 404);
  });
});

describe('Bordas da autorização por tipo', () => {
  it('sem usuário na requisição, exigeTipo barra com 401', () => {
    assert.throws(() => exigeTipo('admin')({}, {}, () => {}), {
      status: 401,
      message: 'É preciso estar autenticado para acessar este recurso.',
    });
  });

  it('com tipo fora da lista, exigeTipo barra com 403', () => {
    assert.throws(() => exigeTipo('admin')({ usuario: { tipo: 'aluno' } }, {}, () => {}), {
      status: 403,
    });
  });

  it('com tipo permitido, exigeTipo segue adiante', () => {
    let seguiu = false;

    exigeTipo('admin', 'pesquisador')({ usuario: { tipo: 'pesquisador' } }, {}, () => {
      seguiu = true;
    });

    assert.ok(seguiu);
  });
});

describe('Bordas da leitura de ambiente', () => {
  it('sem DATABASE_URL, a importação falha explicando como configurar', async () => {
    const { DATABASE_URL, ...semBanco } = process.env;

    await assert.rejects(
      executar(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(caminhoAmbiente)})`], {
        cwd: tmpdir(),
        env: semBanco,
      }),
      (erro) => {
        assert.match(erro.stderr, /DATABASE_URL não foi definida/);
        return true;
      },
    );
  });

  it('sem JWT_SECRET, avisa que caiu no segredo de desenvolvimento', async () => {
    const { JWT_SECRET, ...semSegredo } = process.env;

    const { stderr } = await executar(
      process.execPath,
      ['--input-type=module', '-e', `await import(${JSON.stringify(caminhoAmbiente)})`],
      {
        cwd: tmpdir(),
        env: { ...semSegredo, DATABASE_URL: 'postgres://scientia:scientia@localhost:5432/scientia_teste' },
      },
    );

    assert.match(stderr, /JWT_SECRET não foi definido/);
  });

  it('com as variáveis definidas, usa os valores do ambiente em vez dos padrões', async () => {
    const script = `
      const ambiente = await import(${JSON.stringify(caminhoAmbiente)});
      console.log(JSON.stringify({
        porta: ambiente.PORTA,
        origem: ambiente.ORIGEM_FRONTEND,
        expiracao: ambiente.JWT_EXPIRACAO,
        ssl: ambiente.BANCO_SSL,
        admin: ambiente.ADMIN_INICIAL,
      }));
    `;

    const { stdout } = await executar(process.execPath, ['--input-type=module', '-e', script], {
      cwd: tmpdir(),
      env: {
        ...process.env,
        PORTA: '4321',
        ORIGEM_FRONTEND: 'https://scientia.ufape.edu.br',
        DATABASE_URL: 'postgres://scientia:scientia@localhost:5432/scientia_teste',
        BANCO_SSL: 'true',
        JWT_SECRET: 'segredo-de-teste',
        JWT_EXPIRACAO: '8h',
        ADMIN_NOME: 'Coordenacao',
        ADMIN_EMAIL: 'coordenacao@ufape.edu.br',
        ADMIN_SENHA: 'outra-senha',
      },
    });

    const lido = JSON.parse(stdout);

    assert.strictEqual(lido.porta, 4321);
    assert.strictEqual(lido.origem, 'https://scientia.ufape.edu.br');
    assert.strictEqual(lido.expiracao, '8h');
    assert.strictEqual(lido.ssl, true);
    assert.deepStrictEqual(lido.admin, {
      nome: 'Coordenacao',
      email: 'coordenacao@ufape.edu.br',
      senha: 'outra-senha',
    });
  });
});

describe('Bordas do corpo ausente na autenticação', () => {
  it('login sem corpo nenhum cai na resposta genérica de credencial inválida', async () => {
    const resposta = await request(app).post('/api/auth/login');

    assert.strictEqual(resposta.status, 401);
  });

  it('cadastro sem corpo nenhum responde 400 em vez de estourar', async () => {
    const resposta = await request(app).post('/api/auth/cadastro');

    assert.strictEqual(resposta.status, 400);
  });
});
