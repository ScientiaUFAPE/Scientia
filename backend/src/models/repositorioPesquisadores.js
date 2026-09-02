import { consultar } from '../config/bd.js';
import { montarPadraoBusca } from './buscaTextual.js';

export async function listar({ busca, vinculo, idGrupo, limite, deslocamento }) {
  const { clausula, parametros } = montarFiltros({ busca, vinculo, idGrupo });
  const [total, resumo] = await Promise.all([contar(clausula, parametros), obterResumo()]);
  const parametrosLista = [...parametros, limite, deslocamento];
  const indiceLimite = parametrosLista.length - 1;
  const indiceDeslocamento = parametrosLista.length;
  const { rows } = await consultar(
    `
      SELECT
        pe.id_pesquisador,
        pe.nome,
        pe.vinculo,
        pe.numero_lattes,
        (
          SELECT COUNT(*)::int
          FROM autoria a
          WHERE a.id_pesquisador = pe.id_pesquisador
        ) AS total_publicacoes
        ,(
          SELECT MAX(p.ano)::int
          FROM autoria a
          JOIN publicacao p ON p.id_publicacao = a.id_publicacao
          WHERE a.id_pesquisador = pe.id_pesquisador
        ) AS ultima_publicacao
        ,(
          SELECT json_build_object('id', g.id_grupo, 'nome', g.nome_grupo)
          FROM membro m
          JOIN grupo_pesquisa g ON g.id_grupo = m.id_grupo
          WHERE m.id_pesquisador = pe.id_pesquisador
          ORDER BY CASE m.papel_grupo WHEN 'lider' THEN 0 ELSE 1 END, g.nome_grupo
          LIMIT 1
        ) AS grupo_principal
      FROM pesquisador pe
      ${clausula}
      ORDER BY pe.nome ASC, pe.id_pesquisador ASC
      LIMIT $${indiceLimite} OFFSET $${indiceDeslocamento}
    `,
    parametrosLista,
  );

  return { itens: rows.map(mapearPesquisador), total, resumo };
}

export async function buscarPorId(id, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT id_pesquisador, id_conta, nome, numero_lattes, email, vinculo, origem
      FROM pesquisador
      WHERE id_pesquisador = $1
      LIMIT 1
    `,
    [id],
  );

  const pesquisador = mapearPesquisadorDetalhe(rows[0]);

  if (!pesquisador) {
    return null;
  }

  const [publicacoes, grupos, areas, projetos] = await Promise.all([
    obterResumoPublicacoes(id, executor),
    listarGruposDoPesquisador(id, executor),
    listarAreasFrequentes(id, executor),
    listarProjetosEmAndamento(id, executor),
  ]);

  return {
    ...pesquisador,
    ...publicacoes,
    grupos,
    areasFrequentes: areas,
    projetosEmAndamento: projetos,
  };
}

export async function buscarPorIdConta(idConta, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT id_pesquisador, id_conta, nome, numero_lattes, email, vinculo, origem
      FROM pesquisador
      WHERE id_conta = $1
      LIMIT 1
    `,
    [idConta],
  );

  return mapearPesquisadorDetalhe(rows[0]);
}

export async function buscarPorNumeroLattes(numeroLattes, executor) {
  const { rows } = await executarConsulta(
    executor,
    `
      SELECT id_pesquisador, id_conta, nome, numero_lattes, email, vinculo, origem
      FROM pesquisador
      WHERE numero_lattes = $1
      LIMIT 1
    `,
    [normalizarNumeroLattes(numeroLattes)],
  );

  return mapearPesquisadorDetalhe(rows[0]);
}

export async function criarManual(executor, { nome, numeroLattes, email, vinculo }) {
  const { rows } = await executor.query(
    `
      INSERT INTO pesquisador (nome, numero_lattes, email, vinculo, origem)
      VALUES ($1, $2, $3, $4, 'manual')
      ON CONFLICT (numero_lattes) DO NOTHING
      RETURNING id_pesquisador, id_conta, nome, numero_lattes, email, vinculo, origem
    `,
    [nome, normalizarNumeroLattes(numeroLattes), email || '', vinculo],
  );

  return mapearPesquisadorDetalhe(rows[0]);
}

async function contar(clausula, parametros) {
  const { rows } = await consultar(
    `
      SELECT COUNT(*)::int AS total
      FROM pesquisador pe
      ${clausula}
    `,
    parametros,
  );

  return rows[0].total;
}

async function obterResumo() {
  const { rows } = await consultar(`
    SELECT
      COUNT(*)::int AS total_pesquisadores,
      COUNT(*) FILTER (WHERE vinculo = 'docente')::int AS docentes,
      COUNT(*) FILTER (WHERE vinculo = 'discente')::int AS discentes,
      COUNT(*) FILTER (WHERE vinculo = 'externo')::int AS externos,
      (SELECT COUNT(*)::int FROM autoria) AS total_autorias
    FROM pesquisador
  `);
  const resumo = rows[0];
  return {
    totalPesquisadores: resumo.total_pesquisadores,
    totalAutorias: resumo.total_autorias,
    porVinculo: {
      docente: resumo.docentes,
      discente: resumo.discentes,
      externo: resumo.externos,
    },
  };
}

async function obterResumoPublicacoes(id, executor) {
  const { rows } = await executarConsulta(executor, `
    SELECT COUNT(*)::int AS total_publicacoes, MAX(p.ano)::int AS ultima_publicacao
    FROM autoria a
    JOIN publicacao p ON p.id_publicacao = a.id_publicacao
    WHERE a.id_pesquisador = $1
  `, [id]);
  return {
    totalPublicacoes: rows[0].total_publicacoes,
    ultimaPublicacao: rows[0].ultima_publicacao,
  };
}

async function listarGruposDoPesquisador(id, executor) {
  const { rows } = await executarConsulta(executor, `
    SELECT g.id_grupo, g.nome_grupo, m.papel_grupo
    FROM membro m
    JOIN grupo_pesquisa g ON g.id_grupo = m.id_grupo
    WHERE m.id_pesquisador = $1
    ORDER BY CASE m.papel_grupo WHEN 'lider' THEN 0 ELSE 1 END, g.nome_grupo
  `, [id]);
  return rows.map((linha) => ({ id: linha.id_grupo, nome: linha.nome_grupo, papel: linha.papel_grupo }));
}

async function listarAreasFrequentes(id, executor) {
  const { rows } = await executarConsulta(executor, `
    SELECT ac.id_area, ac.nome_area, COUNT(DISTINCT ap.id_publicacao)::int AS quantidade
    FROM autoria au
    JOIN area_publicacao ap ON ap.id_publicacao = au.id_publicacao
    JOIN area_conhecimento ac ON ac.id_area = ap.id_area
    WHERE au.id_pesquisador = $1
    GROUP BY ac.id_area, ac.nome_area
    ORDER BY quantidade DESC, ac.nome_area ASC
    LIMIT 4
  `, [id]);
  return rows.map((linha) => ({ id: linha.id_area, nome: linha.nome_area, quantidade: linha.quantidade }));
}

async function listarProjetosEmAndamento(id, executor) {
  const { rows } = await executarConsulta(executor, `
    SELECT pr.id_projeto, pr.titulo
    FROM participacao pa
    JOIN projeto_pesquisa pr ON pr.id_projeto = pa.id_projeto
    WHERE pa.id_pesquisador = $1 AND pr.status = 'em_andamento'
    ORDER BY pr.data_inicio DESC, pr.titulo ASC
  `, [id]);
  return rows.map((linha) => ({ id: linha.id_projeto, titulo: linha.titulo }));
}

function montarFiltros({ busca, vinculo, idGrupo }) {
  const filtros = [];
  const parametros = [];

  if (busca) {
    parametros.push(montarPadraoBusca(busca));
    filtros.push(String.raw`(
      pe.nome ILIKE $${parametros.length} ESCAPE '\'
      OR EXISTS (
        SELECT 1
        FROM membro m_busca
        JOIN grupo_pesquisa g_busca ON g_busca.id_grupo = m_busca.id_grupo
        WHERE m_busca.id_pesquisador = pe.id_pesquisador
          AND g_busca.nome_grupo ILIKE $${parametros.length} ESCAPE '\'
      )
    )`);
  }

  if (vinculo) {
    parametros.push(vinculo);
    filtros.push(`pe.vinculo = $${parametros.length}`);
  }

  if (idGrupo !== undefined) {
    parametros.push(idGrupo);
    filtros.push(`EXISTS (
      SELECT 1 FROM membro m_filtro
      WHERE m_filtro.id_pesquisador = pe.id_pesquisador
        AND m_filtro.id_grupo = $${parametros.length}
    )`);
  }

  return {
    clausula: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
    parametros,
  };
}

function mapearPesquisador(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_pesquisador,
    nome: linha.nome,
    vinculo: linha.vinculo,
    numeroLattes: linha.numero_lattes,
    totalPublicacoes: linha.total_publicacoes,
    ultimaPublicacao: linha.ultima_publicacao,
    grupoPrincipal: linha.grupo_principal,
  };
}

function mapearPesquisadorDetalhe(linha) {
  if (!linha) {
    return null;
  }

  return {
    id: linha.id_pesquisador,
    idConta: linha.id_conta,
    nome: linha.nome,
    numeroLattes: linha.numero_lattes,
    email: linha.email,
    vinculo: linha.vinculo,
    origem: linha.origem,
  };
}

function normalizarNumeroLattes(numeroLattes) {
  return String(numeroLattes ?? '').trim();
}

function executarConsulta(executor, sql, parametros) {
  if (executor) {
    return executor.query(sql, parametros);
  }

  return consultar(sql, parametros);
}
