import { consultar } from '../config/bd.js';
import { montarPadraoBusca } from './buscaTextual.js';

export async function listar({ busca, ordem, limite, deslocamento }) {
  const { clausula, parametros } = montarFiltros({ busca });
  const [total, resumo] = await Promise.all([contar(clausula, parametros), obterResumo()]);
  const parametrosLista = [...parametros, limite, deslocamento];
  const indiceLimite = parametrosLista.length - 1;
  const indiceDeslocamento = parametrosLista.length;
  const { rows } = await consultar(
    `
      SELECT
        g.id_grupo,
        g.nome_grupo,
        g.link_dgp,
        g.ano_criacao,
        (
          SELECT COUNT(*)::int
          FROM projeto_pesquisa pr
          WHERE pr.id_grupo = g.id_grupo
        ) AS total_projetos,
        (
          SELECT COUNT(*)::int
          FROM membro m
          WHERE m.id_grupo = g.id_grupo
        ) AS total_membros
        ,(
          SELECT pe.nome
          FROM membro m
          JOIN pesquisador pe ON pe.id_pesquisador = m.id_pesquisador
          WHERE m.id_grupo = g.id_grupo AND m.papel_grupo = 'lider'
          ORDER BY pe.nome ASC
          LIMIT 1
        ) AS lider
        ,COALESCE((
          SELECT json_agg(
            json_build_object('id', membros.id_pesquisador, 'nome', membros.nome)
            ORDER BY membros.prioridade, membros.nome
          )
          FROM (
            SELECT pe.id_pesquisador, pe.nome,
              CASE m.papel_grupo WHEN 'lider' THEN 0 ELSE 1 END AS prioridade
            FROM membro m
            JOIN pesquisador pe ON pe.id_pesquisador = m.id_pesquisador
            WHERE m.id_grupo = g.id_grupo
            ORDER BY prioridade, pe.nome
            LIMIT 3
          ) membros
        ), '[]'::json) AS membros_previa
      FROM grupo_pesquisa g
      ${clausula}
      ORDER BY ${ordenacaoSql(ordem)}, g.id_grupo ASC
      LIMIT $${indiceLimite} OFFSET $${indiceDeslocamento}
    `,
    parametrosLista,
  );

  return { itens: rows.map(mapearGrupoResumo), total, resumo };
}

export async function buscarPorId(id) {
  const { rows } = await consultar(
    `
      SELECT id_grupo, nome_grupo, link_dgp, ano_criacao
      FROM grupo_pesquisa
      WHERE id_grupo = $1
      LIMIT 1
    `,
    [id],
  );

  const grupo = mapearGrupoDetalhe(rows[0]);

  if (!grupo) {
    return null;
  }

  const [membros, projetos] = await Promise.all([listarMembrosDoGrupo(id), listarProjetosDoGrupo(id)]);

  return {
    ...grupo,
    membros,
    projetos,
  };
}

export async function existe(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT 1
      FROM grupo_pesquisa
      WHERE id_grupo = $1
      LIMIT 1
    `,
    [id],
  );

  return rows.length > 0;
}

export async function criar(executor, { nome, linkDgp, anoCriacao }) {
  const { rows } = await executor.query(
    `
      INSERT INTO grupo_pesquisa (nome_grupo, link_dgp, ano_criacao)
      VALUES ($1, $2, $3)
      RETURNING id_grupo
    `,
    [nome, linkDgp, anoCriacao],
  );

  return rows[0].id_grupo;
}

export async function atualizar(executor, idGrupo, { nome, linkDgp, anoCriacao }) {
  const resultado = await executor.query(
    `
      UPDATE grupo_pesquisa
      SET nome_grupo = $2, link_dgp = $3, ano_criacao = $4
      WHERE id_grupo = $1
    `,
    [idGrupo, nome, linkDgp, anoCriacao],
  );

  return resultado.rowCount > 0;
}

export async function excluir(executor, idGrupo) {
  const resultado = await executor.query(
    `
      DELETE FROM grupo_pesquisa
      WHERE id_grupo = $1
    `,
    [idGrupo],
  );

  return resultado.rowCount > 0;
}

export async function criarMembro(executor, { idGrupo, idPesquisador, papel }) {
  await executor.query(
    `
      INSERT INTO membro (id_pesquisador, id_grupo, papel_grupo)
      VALUES ($1, $2, $3)
    `,
    [idPesquisador, idGrupo, papel],
  );
}

async function contar(clausula, parametros) {
  const { rows } = await consultar(
    `
      SELECT COUNT(*)::int AS total
      FROM grupo_pesquisa g
      ${clausula}
    `,
    parametros,
  );

  return rows[0].total;
}

async function obterResumo() {
  const { rows } = await consultar(`
    SELECT
      COUNT(*)::int AS total_grupos,
      COALESCE(SUM(pr.total), 0)::int AS total_projetos,
      COALESCE(SUM(m.total), 0)::int AS total_membros,
      COALESCE(MAX(pr.total), 0)::int AS maior_total_projetos
    FROM grupo_pesquisa g
    LEFT JOIN (
      SELECT id_grupo, COUNT(*)::int AS total
      FROM projeto_pesquisa
      GROUP BY id_grupo
    ) pr ON pr.id_grupo = g.id_grupo
    LEFT JOIN (
      SELECT id_grupo, COUNT(*)::int AS total
      FROM membro
      GROUP BY id_grupo
    ) m ON m.id_grupo = g.id_grupo
  `);

  const resumo = rows[0];
  return {
    totalGrupos: resumo.total_grupos,
    totalProjetos: resumo.total_projetos,
    totalMembros: resumo.total_membros,
    maiorTotalProjetos: resumo.maior_total_projetos,
  };
}

function ordenacaoSql(ordem) {
  const ordenacoes = {
    projetos: 'total_projetos DESC, g.nome_grupo ASC',
    membros: 'total_membros DESC, g.nome_grupo ASC',
    recentes: 'g.ano_criacao DESC, g.nome_grupo ASC',
    nome: 'g.nome_grupo ASC',
  };

  return ordenacoes[ordem] ?? ordenacoes.projetos;
}

function montarFiltros({ busca }) {
  const filtros = [];
  const parametros = [];

  if (busca) {
    parametros.push(montarPadraoBusca(busca));
    filtros.push(String.raw`(
      g.nome_grupo ILIKE $${parametros.length} ESCAPE '\'
      OR EXISTS (
        SELECT 1
        FROM membro m_busca
        JOIN pesquisador pe_busca ON pe_busca.id_pesquisador = m_busca.id_pesquisador
        WHERE m_busca.id_grupo = g.id_grupo
          AND m_busca.papel_grupo = 'lider'
          AND pe_busca.nome ILIKE $${parametros.length} ESCAPE '\'
      )
    )`);
  }

  return {
    clausula: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
    parametros,
  };
}

async function listarMembrosDoGrupo(id) {
  const { rows } = await consultar(
    `
      SELECT pe.id_pesquisador, pe.nome, m.papel_grupo
      FROM membro m
      JOIN pesquisador pe ON pe.id_pesquisador = m.id_pesquisador
      WHERE m.id_grupo = $1
      ORDER BY CASE m.papel_grupo WHEN 'lider' THEN 0 ELSE 1 END, pe.nome ASC
    `,
    [id],
  );

  return rows.map((linha) => ({
    id: linha.id_pesquisador,
    nome: linha.nome,
    papel: linha.papel_grupo,
  }));
}

async function listarProjetosDoGrupo(id) {
  const { rows } = await consultar(
    `
      SELECT id_projeto, titulo, status
      FROM projeto_pesquisa
      WHERE id_grupo = $1
      ORDER BY data_inicio DESC, id_projeto DESC
    `,
    [id],
  );

  return rows.map((linha) => ({
    id: linha.id_projeto,
    titulo: linha.titulo,
    status: linha.status,
  }));
}

function mapearGrupoResumo(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_grupo,
    nome: linha.nome_grupo,
    linkDgp: linha.link_dgp,
    anoCriacao: linha.ano_criacao,
    totalProjetos: linha.total_projetos,
    totalMembros: linha.total_membros,
    lider: linha.lider,
    membrosPrevia: linha.membros_previa ?? [],
  };
}

function mapearGrupoDetalhe(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_grupo,
    nome: linha.nome_grupo,
    linkDgp: linha.link_dgp,
    anoCriacao: linha.ano_criacao,
    membros: [],
    projetos: [],
  };
}

function executarConsulta(executor, sql, parametros) {
  if (executor) {
    return executor.query(sql, parametros);
  }

  return consultar(sql, parametros);
}
