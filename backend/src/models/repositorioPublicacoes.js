import { consultar } from '../config/bd.js';
import { montarPadraoBusca } from './buscaTextual.js';

export async function listar({ busca, tipo, ano, idProjeto, idPesquisador, idArea, limite, deslocamento }) {
  const { clausula, parametros } = montarFiltros({ busca, tipo, ano, idProjeto, idPesquisador, idArea });
  const total = await contar(clausula, parametros);
  const parametrosLista = [...parametros, limite, deslocamento];
  const indiceLimite = parametrosLista.length - 1;
  const indiceDeslocamento = parametrosLista.length;
  const { rows } = await consultar(
    `
      SELECT
        p.id_publicacao,
        p.titulo,
        p.tipo,
        p.ano,
        p.doi,
        p.veiculo,
        pr.id_projeto,
        pr.titulo AS titulo_projeto
      FROM publicacao p
      JOIN projeto_pesquisa pr ON pr.id_projeto = p.id_projeto
      ${clausula}
      ORDER BY p.ano DESC, p.id_publicacao DESC
      LIMIT $${indiceLimite} OFFSET $${indiceDeslocamento}
    `,
    parametrosLista,
  );

  const publicacoes = rows.map(mapearPublicacao);
  await Promise.all([preencherAutores(publicacoes), preencherAreas(publicacoes)]);

  return { itens: publicacoes, total };
}

export async function buscarPorId(id) {
  const { rows } = await consultar(
    `
      SELECT
        p.id_publicacao,
        p.titulo,
        p.tipo,
        p.ano,
        p.doi,
        p.veiculo,
        pr.id_projeto,
        pr.titulo AS titulo_projeto
      FROM publicacao p
      JOIN projeto_pesquisa pr ON pr.id_projeto = p.id_projeto
      WHERE p.id_publicacao = $1
      LIMIT 1
    `,
    [id],
  );

  const publicacao = mapearPublicacao(rows[0]);

  if (!publicacao) {
    return null;
  }

  await Promise.all([preencherAutores([publicacao]), preencherAreas([publicacao])]);
  return publicacao;
}

export async function buscarRelacionadas(idPublicacao, limite) {
  const { rows } = await consultar(
    `
      SELECT
        p.id_publicacao,
        p.titulo,
        p.tipo,
        p.ano,
        p.doi,
        p.veiculo,
        pr.id_projeto,
        pr.titulo AS titulo_projeto,
        COUNT(DISTINCT candidatas.id_area)::int AS areas_em_comum,
        (p.tipo = p_origem.tipo) AS mesmo_tipo
      FROM publicacao p_origem
      JOIN area_publicacao origem ON origem.id_publicacao = p_origem.id_publicacao
      JOIN area_publicacao candidatas ON candidatas.id_area = origem.id_area
      JOIN publicacao p ON p.id_publicacao = candidatas.id_publicacao
      JOIN projeto_pesquisa pr ON pr.id_projeto = p.id_projeto
      WHERE p_origem.id_publicacao = $1
        AND p.id_publicacao <> $1
      GROUP BY p.id_publicacao, pr.id_projeto, p_origem.tipo
      ORDER BY
        areas_em_comum DESC,
        mesmo_tipo DESC,
        p.ano DESC,
        p.id_publicacao DESC
      LIMIT $2
    `,
    [idPublicacao, limite],
  );

  const publicacoes = rows.map((linha) => {
    const pub = mapearPublicacao(linha);
    pub.areasEmComum = linha.areas_em_comum;
    return pub;
  });

  await Promise.all([preencherAutores(publicacoes), preencherAreas(publicacoes)]);

  return publicacoes;
}

export async function existe(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT 1
      FROM publicacao
      WHERE id_publicacao = $1
      LIMIT 1
    `,
    [id],
  );

  return rows.length > 0;
}

export async function areasExistentes(ids, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT id_area
      FROM area_conhecimento
      WHERE id_area = ANY($1::int[])
    `,
    [ids],
  );

  return rows.map((linha) => linha.id_area);
}

export async function criar(executor, { titulo, tipo, ano, doi, veiculo, idProjeto }) {
  const { rows } = await executor.query(
    `
      INSERT INTO publicacao (id_projeto, tipo, ano, doi, veiculo, titulo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_publicacao
    `,
    [idProjeto, tipo, ano, doi, veiculo, titulo],
  );

  return rows[0].id_publicacao;
}

export async function atualizar(
  executor,
  idPublicacao,
  { titulo, tipo, ano, doi, veiculo, idProjeto },
) {
  const resultado = await executor.query(
    `
      UPDATE publicacao
      SET
        id_projeto = $2,
        tipo = $3,
        ano = $4,
        doi = $5,
        veiculo = $6,
        titulo = $7
      WHERE id_publicacao = $1
    `,
    [idPublicacao, idProjeto, tipo, ano, doi, veiculo, titulo],
  );

  return resultado.rowCount > 0;
}

export async function removerAutorias(executor, idPublicacao) {
  await executor.query(
    `
      DELETE FROM autoria
      WHERE id_publicacao = $1
    `,
    [idPublicacao],
  );
}

export async function excluir(executor, idPublicacao) {
  const resultado = await executor.query(
    `
      DELETE FROM publicacao
      WHERE id_publicacao = $1
    `,
    [idPublicacao],
  );

  return resultado.rowCount > 0;
}

export async function criarAutoria(executor, { idPublicacao, idPesquisador, ordem }) {
  await executor.query(
    `
      INSERT INTO autoria (id_pesquisador, id_publicacao, ordem)
      VALUES ($1, $2, $3)
    `,
    [idPesquisador, idPublicacao, ordem],
  );
}

export async function removerAreas(executor, idPublicacao) {
  await executor.query(
    `
      DELETE FROM area_publicacao
      WHERE id_publicacao = $1
    `,
    [idPublicacao],
  );
}

export async function vincularArea(executor, { idPublicacao, idArea }) {
  await executor.query(
    `
      INSERT INTO area_publicacao (id_publicacao, id_area)
      VALUES ($1, $2)
    `,
    [idPublicacao, idArea],
  );
}

async function contar(clausula, parametros) {
  const { rows } = await consultar(
    `
      SELECT COUNT(*)::int AS total
      FROM publicacao p
      ${clausula}
    `,
    parametros,
  );

  return rows[0].total;
}

function montarFiltros({ busca, tipo, ano, idProjeto, idPesquisador, idArea }) {
  const filtros = [];
  const parametros = [];

  if (busca) {
    parametros.push(montarPadraoBusca(busca));
    filtros.push(String.raw`
      (
        p.titulo ILIKE $${parametros.length} ESCAPE '\'
        OR EXISTS (
          SELECT 1
          FROM autoria a_busca
          JOIN pesquisador pe_busca ON pe_busca.id_pesquisador = a_busca.id_pesquisador
          WHERE a_busca.id_publicacao = p.id_publicacao
            AND pe_busca.nome ILIKE $${parametros.length} ESCAPE '\'
        )
      )
    `);
  }

  if (tipo) {
    parametros.push(tipo);
    filtros.push(`p.tipo = $${parametros.length}`);
  }

  if (ano !== undefined) {
    parametros.push(ano);
    filtros.push(`p.ano = $${parametros.length}`);
  }

  if (idProjeto !== undefined) {
    parametros.push(idProjeto);
    filtros.push(`p.id_projeto = $${parametros.length}`);
  }

  if (idPesquisador !== undefined) {
    parametros.push(idPesquisador);
    filtros.push(`
      EXISTS (
        SELECT 1
        FROM autoria a_pesquisador
        WHERE a_pesquisador.id_publicacao = p.id_publicacao
          AND a_pesquisador.id_pesquisador = $${parametros.length}
      )
    `);
  }

  if (idArea !== undefined) {
    parametros.push(idArea);
    filtros.push(`
      EXISTS (
        SELECT 1
        FROM area_publicacao ap_filtro
        WHERE ap_filtro.id_publicacao = p.id_publicacao
          AND ap_filtro.id_area = $${parametros.length}
      )
    `);
  }

  return {
    clausula: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
    parametros,
  };
}

async function preencherAutores(publicacoes) {
  const ids = publicacoes.map((publicacao) => publicacao.id);

  if (ids.length === 0) {
    return;
  }

  const { rows } = await consultar(
    `
      SELECT
        a.id_publicacao,
        json_agg(
          json_build_object(
            'id', pe.id_pesquisador,
            'nome', pe.nome,
            'ordem', a.ordem
          )
          ORDER BY a.ordem ASC
        ) AS autores
      FROM autoria a
      JOIN pesquisador pe ON pe.id_pesquisador = a.id_pesquisador
      WHERE a.id_publicacao = ANY($1::int[])
      GROUP BY a.id_publicacao
    `,
    [ids],
  );

  const autoresPorPublicacao = new Map(rows.map((linha) => [linha.id_publicacao, linha.autores ?? []]));

  for (const publicacao of publicacoes) {
    publicacao.autores = autoresPorPublicacao.get(publicacao.id) ?? [];
  }
}

async function preencherAreas(publicacoes) {
  const ids = publicacoes.map((publicacao) => publicacao.id);

  if (ids.length === 0) {
    return;
  }

  const { rows } = await consultar(
    `
      SELECT
        ap.id_publicacao,
        json_agg(
          json_build_object(
            'id', ac.id_area,
            'nome', ac.nome_area
          )
          ORDER BY ac.nome_area ASC
        ) AS areas
      FROM area_publicacao ap
      JOIN area_conhecimento ac ON ac.id_area = ap.id_area
      WHERE ap.id_publicacao = ANY($1::int[])
      GROUP BY ap.id_publicacao
    `,
    [ids],
  );

  const areasPorPublicacao = new Map(rows.map((linha) => [linha.id_publicacao, linha.areas ?? []]));

  for (const publicacao of publicacoes) {
    publicacao.areas = areasPorPublicacao.get(publicacao.id) ?? [];
  }
}

function mapearPublicacao(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_publicacao,
    titulo: linha.titulo,
    tipo: linha.tipo,
    ano: linha.ano,
    doi: linha.doi,
    veiculo: linha.veiculo,
    projeto: {
      id: linha.id_projeto,
      titulo: linha.titulo_projeto,
    },
    autores: [],
    areas: [],
  };
}

function executarConsulta(executor, sql, parametros) {
  if (executor) {
    return executor.query(sql, parametros);
  }

  return consultar(sql, parametros);
}
