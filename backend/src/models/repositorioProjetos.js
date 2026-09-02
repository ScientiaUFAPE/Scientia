import { consultar } from '../config/bd.js';
import { montarPadraoBusca } from './buscaTextual.js';

export async function listar({ busca, status, idGrupo, idArea, limite, deslocamento }) {
  const { clausula, parametros } = montarFiltros({ busca, status, idGrupo, idArea });
  const [total, resumo] = await Promise.all([contar(clausula, parametros), obterResumo()]);
  const parametrosLista = [...parametros, limite, deslocamento];
  const indiceLimite = parametrosLista.length - 1;
  const indiceDeslocamento = parametrosLista.length;
  const { rows } = await consultar(
    `
      SELECT
        pr.id_projeto,
        pr.titulo,
        pr.resumo,
        pr.status,
        pr.data_inicio,
        pr.data_fim,
        pr.origem,
        g.id_grupo,
        g.nome_grupo,
        (
          SELECT COUNT(*)::int
          FROM publicacao pu
          WHERE pu.id_projeto = pr.id_projeto
        ) AS total_publicacoes
      FROM projeto_pesquisa pr
      JOIN grupo_pesquisa g ON g.id_grupo = pr.id_grupo
      ${clausula}
      ORDER BY CASE pr.status
        WHEN 'em_andamento' THEN 0
        WHEN 'planejado' THEN 1
        WHEN 'concluido' THEN 2
        WHEN 'cancelado' THEN 3
        ELSE 4
      END, pr.data_inicio DESC, pr.id_projeto DESC
      LIMIT $${indiceLimite} OFFSET $${indiceDeslocamento}
    `,
    parametrosLista,
  );

  const projetos = rows.map(mapearProjetoResumo);
  await preencherAreas(projetos);

  return { itens: projetos, total, resumo };
}

export async function buscarPorId(id) {
  const { rows } = await consultar(
    `
      SELECT
        pr.id_projeto,
        pr.titulo,
        pr.resumo,
        pr.status,
        pr.data_inicio,
        pr.data_fim,
        pr.origem,
        g.id_grupo,
        g.nome_grupo,
        e.id_edital,
        e.nome_edital,
        e.ano AS ano_edital
      FROM projeto_pesquisa pr
      JOIN grupo_pesquisa g ON g.id_grupo = pr.id_grupo
      LEFT JOIN edital e ON e.id_edital = pr.id_edital
      WHERE pr.id_projeto = $1
      LIMIT 1
    `,
    [id],
  );

  const projeto = mapearProjetoDetalhe(rows[0]);

  if (!projeto) {
    return null;
  }

  const [areas, equipe, publicacoes] = await Promise.all([
    listarAreasDoProjeto(id),
    listarEquipeDoProjeto(id),
    listarPublicacoesDoProjeto(id),
  ]);

  return {
    ...projeto,
    areas,
    equipe,
    publicacoes,
  };
}

export async function existe(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT 1
      FROM projeto_pesquisa
      WHERE id_projeto = $1
      LIMIT 1
    `,
    [id],
  );

  return rows.length > 0;
}

export async function editalExiste(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT 1
      FROM edital
      WHERE id_edital = $1
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

export async function criar(executor, { titulo, resumo, dataInicio, dataFim, status, idGrupo, idEdital }) {
  const { rows } = await executor.query(
    `
      INSERT INTO projeto_pesquisa (
        id_grupo,
        id_edital,
        titulo,
        resumo,
        data_inicio,
        data_fim,
        status,
        origem
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual')
      RETURNING id_projeto
    `,
    [idGrupo, idEdital, titulo, resumo, dataInicio, dataFim, status],
  );

  return rows[0].id_projeto;
}

export async function atualizar(
  executor,
  idProjeto,
  { titulo, resumo, dataInicio, dataFim, status, idGrupo, idEdital },
) {
  const resultado = await executor.query(
    `
      UPDATE projeto_pesquisa
      SET
        id_grupo = $2,
        id_edital = $3,
        titulo = $4,
        resumo = $5,
        data_inicio = $6,
        data_fim = $7,
        status = $8
      WHERE id_projeto = $1
    `,
    [idProjeto, idGrupo, idEdital, titulo, resumo, dataInicio, dataFim, status],
  );

  return resultado.rowCount > 0;
}

export async function removerAreas(executor, idProjeto) {
  await executor.query(
    `
      DELETE FROM possui_area
      WHERE id_projeto = $1
    `,
    [idProjeto],
  );
}

export async function excluir(executor, idProjeto) {
  const resultado = await executor.query(
    `
      DELETE FROM projeto_pesquisa
      WHERE id_projeto = $1
    `,
    [idProjeto],
  );

  return resultado.rowCount > 0;
}

export async function vincularArea(executor, { idProjeto, idArea }) {
  await executor.query(
    `
      INSERT INTO possui_area (id_projeto, id_area)
      VALUES ($1, $2)
    `,
    [idProjeto, idArea],
  );
}

export async function criarParticipacao(executor, { idProjeto, idPesquisador, dataEntrada, papel }) {
  await executor.query(
    `
      INSERT INTO participacao (id_pesquisador, id_projeto, data_entrada, papel)
      VALUES ($1, $2, $3, $4)
    `,
    [idPesquisador, idProjeto, dataEntrada, papel],
  );
}

async function contar(clausula, parametros) {
  const { rows } = await consultar(
    `
      SELECT COUNT(*)::int AS total
      FROM projeto_pesquisa pr
      ${clausula}
    `,
    parametros,
  );

  return rows[0].total;
}

function montarFiltros({ busca, status, idGrupo, idArea }) {
  const filtros = [];
  const parametros = [];

  if (busca) {
    parametros.push(montarPadraoBusca(busca));
    filtros.push(String.raw`(
      pr.titulo ILIKE $${parametros.length} ESCAPE '\'
      OR EXISTS (
        SELECT 1
        FROM grupo_pesquisa g_busca
        WHERE g_busca.id_grupo = pr.id_grupo
          AND g_busca.nome_grupo ILIKE $${parametros.length} ESCAPE '\'
      )
      OR EXISTS (
        SELECT 1
        FROM possui_area pa_busca
        JOIN area_conhecimento ac_busca ON ac_busca.id_area = pa_busca.id_area
        WHERE pa_busca.id_projeto = pr.id_projeto
          AND ac_busca.nome_area ILIKE $${parametros.length} ESCAPE '\'
      )
    )`);
  }

  if (status) {
    parametros.push(status);
    filtros.push(`pr.status = $${parametros.length}`);
  }

  if (idGrupo !== undefined) {
    parametros.push(idGrupo);
    filtros.push(`pr.id_grupo = $${parametros.length}`);
  }

  if (idArea !== undefined) {
    parametros.push(idArea);
    filtros.push(`
      EXISTS (
        SELECT 1
        FROM possui_area pa_filtro
        WHERE pa_filtro.id_projeto = pr.id_projeto
          AND pa_filtro.id_area = $${parametros.length}
      )
    `);
  }

  return {
    clausula: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
    parametros,
  };
}

async function obterResumo() {
  const { rows } = await consultar(
    `
      SELECT
        COUNT(*)::int AS total_projetos,
        COUNT(*) FILTER (WHERE status = 'em_andamento')::int AS em_andamento,
        COUNT(*) FILTER (WHERE status = 'planejado')::int AS planejados,
        COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
        COUNT(*) FILTER (WHERE status = 'cancelado')::int AS cancelados,
        COUNT(DISTINCT id_grupo)::int AS total_grupos
      FROM projeto_pesquisa
    `,
  );
  const linha = rows[0];

  return {
    totalProjetos: linha.total_projetos,
    emAndamento: linha.em_andamento,
    planejados: linha.planejados,
    concluidos: linha.concluidos,
    cancelados: linha.cancelados,
    totalGrupos: linha.total_grupos,
  };
}

async function preencherAreas(projetos) {
  const ids = projetos.map((projeto) => projeto.id);

  if (ids.length === 0) {
    return;
  }

  const { rows } = await consultar(
    `
      SELECT
        pa.id_projeto,
        json_agg(
          json_build_object(
            'id', ac.id_area,
            'nome', ac.nome_area
          )
          ORDER BY ac.nome_area ASC
        ) AS areas
      FROM possui_area pa
      JOIN area_conhecimento ac ON ac.id_area = pa.id_area
      WHERE pa.id_projeto = ANY($1::int[])
      GROUP BY pa.id_projeto
    `,
    [ids],
  );

  const areasPorProjeto = new Map(rows.map((linha) => [linha.id_projeto, linha.areas ?? []]));

  for (const projeto of projetos) {
    projeto.areas = areasPorProjeto.get(projeto.id) ?? [];
  }
}

async function listarAreasDoProjeto(id) {
  const { rows } = await consultar(
    `
      SELECT ac.id_area, ac.nome_area
      FROM possui_area pa
      JOIN area_conhecimento ac ON ac.id_area = pa.id_area
      WHERE pa.id_projeto = $1
      ORDER BY ac.nome_area ASC
    `,
    [id],
  );

  return rows.map((linha) => ({
    id: linha.id_area,
    nome: linha.nome_area,
  }));
}

async function listarEquipeDoProjeto(id) {
  const { rows } = await consultar(
    `
      SELECT pe.id_pesquisador, pe.nome, pa.papel, pa.data_entrada
      FROM participacao pa
      JOIN pesquisador pe ON pe.id_pesquisador = pa.id_pesquisador
      WHERE pa.id_projeto = $1
      ORDER BY CASE pa.papel WHEN 'coordenador' THEN 0 ELSE 1 END, pe.nome ASC
    `,
    [id],
  );

  return rows.map((linha) => ({
    id: linha.id_pesquisador,
    nome: linha.nome,
    papel: linha.papel,
    dataEntrada: formatarData(linha.data_entrada),
  }));
}

async function listarPublicacoesDoProjeto(id) {
  const { rows } = await consultar(
    `
      SELECT id_publicacao, titulo, tipo, ano
      FROM publicacao
      WHERE id_projeto = $1
      ORDER BY ano DESC, id_publicacao DESC
    `,
    [id],
  );

  return rows.map((linha) => ({
    id: linha.id_publicacao,
    titulo: linha.titulo,
    tipo: linha.tipo,
    ano: linha.ano,
  }));
}

function mapearProjetoResumo(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_projeto,
    titulo: linha.titulo,
    status: linha.status,
    dataInicio: formatarData(linha.data_inicio),
    dataFim: formatarData(linha.data_fim),
    grupo: {
      id: linha.id_grupo,
      nome: linha.nome_grupo,
    },
    areas: [],
    totalPublicacoes: linha.total_publicacoes,
  };
}

function mapearProjetoDetalhe(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_projeto,
    titulo: linha.titulo,
    resumo: linha.resumo,
    status: linha.status,
    dataInicio: formatarData(linha.data_inicio),
    dataFim: formatarData(linha.data_fim),
    origem: linha.origem,
    grupo: {
      id: linha.id_grupo,
      nome: linha.nome_grupo,
    },
    edital: linha.id_edital
      ? {
          id: linha.id_edital,
          nome: linha.nome_edital,
          ano: linha.ano_edital,
        }
      : null,
    areas: [],
    equipe: [],
    publicacoes: [],
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
