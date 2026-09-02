import { consultar } from '../config/bd.js';
import { montarPadraoBusca } from './buscaTextual.js';

export async function listar({ busca, status, idProjeto, limite, deslocamento }) {
  const { clausula, parametros } = montarFiltros({ busca, status, idProjeto });
  const [total, resumo] = await Promise.all([contar(clausula, parametros), obterResumo()]);
  const parametrosLista = [...parametros, limite, deslocamento];
  const indiceLimite = parametrosLista.length - 1;
  const indiceDeslocamento = parametrosLista.length;
  const { rows } = await consultar(
    `
      SELECT
        v.id_vaga,
        v.titulo,
        v.requisitos,
        v.status,
        v.qtd_vagas,
        v.data_abertura,
        pr.id_projeto,
        pr.titulo AS titulo_projeto,
        (
          SELECT json_build_object('id', ac.id_area, 'nome', ac.nome_area)
          FROM possui_area pa
          JOIN area_conhecimento ac ON ac.id_area = pa.id_area
          WHERE pa.id_projeto = pr.id_projeto
          ORDER BY ac.nome_area ASC
          LIMIT 1
        ) AS area,
        (
          SELECT COUNT(*)::int
          FROM candidatura c
          WHERE c.id_vaga = v.id_vaga
        ) AS total_candidaturas
      FROM vaga v
      JOIN projeto_pesquisa pr ON pr.id_projeto = v.id_projeto
      ${clausula}
      ORDER BY CASE v.status WHEN 'aberta' THEN 0 ELSE 1 END,
        v.data_abertura DESC, v.id_vaga DESC
      LIMIT $${indiceLimite} OFFSET $${indiceDeslocamento}
    `,
    parametrosLista,
  );

  return { itens: rows.map(mapearVaga), total, resumo };
}

export async function buscarPorId(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT
        v.id_vaga,
        v.titulo,
        v.requisitos,
        v.status,
        v.qtd_vagas,
        v.data_abertura,
        pr.id_projeto,
        pr.titulo AS titulo_projeto,
        (
          SELECT json_build_object('id', ac.id_area, 'nome', ac.nome_area)
          FROM possui_area pa
          JOIN area_conhecimento ac ON ac.id_area = pa.id_area
          WHERE pa.id_projeto = pr.id_projeto
          ORDER BY ac.nome_area ASC
          LIMIT 1
        ) AS area,
        (
          SELECT COUNT(*)::int
          FROM candidatura c
          WHERE c.id_vaga = v.id_vaga
        ) AS total_candidaturas
      FROM vaga v
      JOIN projeto_pesquisa pr ON pr.id_projeto = v.id_projeto
      WHERE v.id_vaga = $1
      LIMIT 1
    `,
    [id],
  );

  return mapearVaga(rows[0]);
}

export async function existe(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    'SELECT 1 FROM vaga WHERE id_vaga = $1 LIMIT 1',
    [id],
  );

  return rows.length > 0;
}

export async function criar(executor, { idProjeto, titulo, requisitos, status, qtdVagas, dataAbertura }) {
  const { rows } = await executor.query(
    `
      INSERT INTO vaga (id_projeto, titulo, requisitos, status, qtd_vagas, data_abertura)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_vaga
    `,
    [idProjeto, titulo, requisitos, status, qtdVagas, dataAbertura],
  );

  return rows[0].id_vaga;
}

export async function atualizar(
  executor,
  idVaga,
  { idProjeto, titulo, requisitos, status, qtdVagas, dataAbertura },
) {
  const resultado = await executor.query(
    `
      UPDATE vaga
      SET
        id_projeto = $2,
        titulo = $3,
        requisitos = $4,
        status = $5,
        qtd_vagas = $6,
        data_abertura = $7
      WHERE id_vaga = $1
    `,
    [idVaga, idProjeto, titulo, requisitos, status, qtdVagas, dataAbertura],
  );

  return resultado.rowCount > 0;
}

export async function excluir(executor, idVaga) {
  const resultado = await executor.query('DELETE FROM vaga WHERE id_vaga = $1', [idVaga]);
  return resultado.rowCount > 0;
}

async function contar(clausula, parametros) {
  const { rows } = await consultar(
    `SELECT COUNT(*)::int AS total FROM vaga v ${clausula}`,
    parametros,
  );
  return rows[0].total;
}

async function obterResumo() {
  const { rows } = await consultar(`
    SELECT
      COUNT(*)::int AS total_vagas,
      COUNT(*) FILTER (WHERE v.status = 'aberta')::int AS abertas,
      EXTRACT(YEAR FROM MIN(v.data_abertura))::int AS primeiro_ano,
      COALESCE((SELECT COUNT(*) FROM candidatura), 0)::int AS total_candidaturas
    FROM vaga v
  `);
  const resumo = rows[0];
  return {
    totalVagas: resumo.total_vagas,
    abertas: resumo.abertas,
    primeiroAno: resumo.primeiro_ano,
    totalCandidaturas: resumo.total_candidaturas,
  };
}

function montarFiltros({ busca, status, idProjeto }) {
  const filtros = [];
  const parametros = [];

  if (busca) {
    parametros.push(montarPadraoBusca(busca));
    filtros.push(String.raw`(
      v.titulo ILIKE $${parametros.length} ESCAPE '\'
      OR COALESCE(v.requisitos, '') ILIKE $${parametros.length} ESCAPE '\'
      OR EXISTS (
        SELECT 1 FROM projeto_pesquisa pr_busca
        WHERE pr_busca.id_projeto = v.id_projeto
          AND pr_busca.titulo ILIKE $${parametros.length} ESCAPE '\'
      )
    )`);
  }

  if (status) {
    parametros.push(status);
    filtros.push(`v.status = $${parametros.length}`);
  }

  if (idProjeto !== undefined) {
    parametros.push(idProjeto);
    filtros.push(`v.id_projeto = $${parametros.length}`);
  }

  return {
    clausula: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
    parametros,
  };
}

function mapearVaga(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_vaga,
    titulo: linha.titulo,
    requisitos: linha.requisitos,
    status: linha.status,
    qtdVagas: linha.qtd_vagas,
    dataAbertura: formatarData(linha.data_abertura),
    projeto: {
      id: linha.id_projeto,
      titulo: linha.titulo_projeto,
    },
    totalCandidaturas: linha.total_candidaturas,
    area: linha.area,
  };
}

function formatarData(valor) {
  if (!valor) {
    return null;
  }

  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }

  return valor.toISOString().slice(0, 10);
}

function executarConsulta(executor, sql, parametros) {
  if (executor) {
    return executor.query(sql, parametros);
  }

  return consultar(sql, parametros);
}
