import { consultar } from '../config/bd.js';

export async function listarTodos({ comProjetos } = {}) {
  const { rows } = await consultar(
    `
      SELECT id_edital, nome_edital, ano
      FROM edital
      ORDER BY ano DESC, nome_edital ASC
    `,
  );

  const editais = rows.map(mapearEdital);

  if (comProjetos) {
    await preencherProjetos(editais);
  } else {
    await preencherResumoProjetos(editais);
  }

  return editais;
}

async function preencherProjetos(editais) {
  const ids = editais.map((edital) => edital.id);

  if (ids.length === 0) {
    return;
  }

  const { rows } = await consultar(
    `
      SELECT
        pr.id_edital,
        json_agg(
          json_build_object(
            'id', pr.id_projeto,
            'titulo', pr.titulo,
            'status', pr.status,
            'grupo', json_build_object('id', gp.id_grupo, 'nome', gp.nome_grupo)
          )
          ORDER BY pr.data_inicio DESC, pr.id_projeto DESC
        ) AS projetos
      FROM projeto_pesquisa pr
      JOIN grupo_pesquisa gp ON gp.id_grupo = pr.id_grupo
      WHERE pr.id_edital = ANY($1::int[])
      GROUP BY pr.id_edital
    `,
    [ids],
  );

  const projetosPorEdital = new Map(rows.map((linha) => [linha.id_edital, linha.projetos]));

  for (const edital of editais) {
    const projetos = projetosPorEdital.get(edital.id) ?? [];
    edital.projetos = projetos;
    edital.totalProjetos = projetos.length;
    edital.grupos = gruposDistintos(projetos.map((projeto) => projeto.grupo));
  }
}

async function preencherResumoProjetos(editais) {
  const ids = editais.map((edital) => edital.id);

  if (ids.length === 0) {
    return;
  }

  const { rows } = await consultar(
    `
      SELECT
        pr.id_edital,
        COUNT(*)::int AS total_projetos,
        json_agg(json_build_object('id', gp.id_grupo, 'nome', gp.nome_grupo)) AS grupos
      FROM projeto_pesquisa pr
      JOIN grupo_pesquisa gp ON gp.id_grupo = pr.id_grupo
      WHERE pr.id_edital = ANY($1::int[])
      GROUP BY pr.id_edital
    `,
    [ids],
  );

  const resumoPorEdital = new Map(rows.map((linha) => [linha.id_edital, linha]));

  for (const edital of editais) {
    const resumo = resumoPorEdital.get(edital.id);
    edital.totalProjetos = resumo ? resumo.total_projetos : 0;
    edital.grupos = resumo ? gruposDistintos(resumo.grupos) : [];
  }
}

function gruposDistintos(grupos) {
  const mapa = new Map(grupos.map((grupo) => [grupo.id, grupo]));

  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

function mapearEdital(linha) {
  return {
    id: linha.id_edital,
    nome: linha.nome_edital,
    ano: linha.ano,
  };
}
