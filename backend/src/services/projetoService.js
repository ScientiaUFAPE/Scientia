import { transacao } from '../config/bd.js';
import { ErroHttp } from '../erros/ErroHttp.js';
import * as repositorioGrupos from '../models/repositorioGrupos.js';
import * as repositorioProjetos from '../models/repositorioProjetos.js';
import {
  POSTGRES_INTEGER_MAXIMO,
  validarEnumOpcional,
  validarId,
  validarInteiroOpcional,
  validarPaginacao,
} from './consultaParametrosService.js';
import { resolverPesquisadorAutenticado } from './pesquisadorAutenticadoService.js';

const STATUS_PROJETO = ['planejado', 'em_andamento', 'concluido', 'cancelado'];
const CAMPOS_TEXTO_PROJETO = ['titulo', 'resumo', 'dataInicio', 'dataFim', 'status'];
const TAMANHO_MAXIMO_RESUMO = 5000;

export async function listar(filtros) {
  const paginacao = validarPaginacao(filtros);
  const status = validarEnumOpcional(
    filtros.status,
    STATUS_PROJETO,
    'O status deve ser planejado, em_andamento, concluido ou cancelado.',
  );
  const idGrupo = validarInteiroOpcional(filtros.idGrupo, 'O id do grupo deve ser um número inteiro.', {
    minimo: 1,
  });
  const idArea = validarInteiroOpcional(filtros.idArea, 'O id da área deve ser um número inteiro.', {
    minimo: 1,
  });
  const resultado = await repositorioProjetos.listar({
    busca: filtros.busca,
    status,
    idGrupo,
    idArea,
    limite: paginacao.limite,
    deslocamento: paginacao.deslocamento,
  });

  return {
    projetos: resultado.itens,
    resumo: resultado.resumo,
    paginacao: {
      pagina: paginacao.pagina,
      porPagina: paginacao.porPagina,
      total: resultado.total,
    },
  };
}

export async function buscarPorId(valorId) {
  const id = validarId(valorId);
  const projeto = await repositorioProjetos.buscarPorId(id);

  if (!projeto) {
    throw new ErroHttp(404, 'Projeto não encontrado.');
  }

  return projeto;
}

export async function cadastrar(dados, usuario) {
  const dadosProjeto = dados ?? {};
  validarTiposDoProjeto(dadosProjeto);
  const projeto = normalizarProjeto(dadosProjeto);
  validarDadosDoProjeto(projeto);

  try {
    const idProjeto = await transacao(async (cliente) => {
      const pesquisador = await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioGrupos.existe(projeto.idGrupo, cliente))) {
        throw new ErroHttp(400, 'Grupo não encontrado.');
      }

      if (projeto.idEdital !== null && !(await repositorioProjetos.editalExiste(projeto.idEdital, cliente))) {
        throw new ErroHttp(400, 'Edital não encontrado.');
      }

      const idsArea = [...new Set(projeto.areas)];
      if (idsArea.length > 0) {
        const existentes = await repositorioProjetos.areasExistentes(idsArea, cliente);
        if (existentes.length !== idsArea.length) {
          throw new ErroHttp(400, 'Área não encontrada.');
        }
      }

      const idCriado = await repositorioProjetos.criar(cliente, projeto);

      for (const idArea of idsArea) {
        await repositorioProjetos.vincularArea(cliente, { idProjeto: idCriado, idArea });
      }

      if (pesquisador) {
        await repositorioProjetos.criarParticipacao(cliente, {
          idProjeto: idCriado,
          idPesquisador: pesquisador.id,
          dataEntrada: projeto.dataInicio,
          papel: 'coordenador',
        });
      }

      return idCriado;
    });

    return buscarPorId(idProjeto);
  } catch (err) {
    tratarConflitoProjeto(err);
    throw err;
  }
}

export async function atualizar(valorId, dados, usuario) {
  const id = validarId(valorId);
  const dadosProjeto = dados ?? {};
  validarTiposDoProjeto(dadosProjeto);
  const projeto = normalizarProjeto(dadosProjeto);
  validarDadosDoProjeto(projeto);

  try {
    await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioProjetos.existe(id, cliente))) {
        throw new ErroHttp(404, 'Projeto não encontrado.');
      }

      if (!(await repositorioGrupos.existe(projeto.idGrupo, cliente))) {
        throw new ErroHttp(400, 'Grupo não encontrado.');
      }

      if (projeto.idEdital !== null && !(await repositorioProjetos.editalExiste(projeto.idEdital, cliente))) {
        throw new ErroHttp(400, 'Edital não encontrado.');
      }

      const idsArea = [...new Set(projeto.areas)];
      if (idsArea.length > 0) {
        const existentes = await repositorioProjetos.areasExistentes(idsArea, cliente);
        if (existentes.length !== idsArea.length) {
          throw new ErroHttp(400, 'Área não encontrada.');
        }
      }

      await repositorioProjetos.atualizar(cliente, id, projeto);
      await repositorioProjetos.removerAreas(cliente, id);

      for (const idArea of idsArea) {
        await repositorioProjetos.vincularArea(cliente, { idProjeto: id, idArea });
      }
    });

    return buscarPorId(id);
  } catch (err) {
    tratarConflitoProjeto(err);
    throw err;
  }
}

export async function excluir(valorId, usuario) {
  const id = validarId(valorId);

  await transacao(async (cliente) => {
    await resolverPesquisadorAutenticado(usuario, cliente);

    if (!(await repositorioProjetos.existe(id, cliente))) {
      throw new ErroHttp(404, 'Projeto não encontrado.');
    }

    await repositorioProjetos.excluir(cliente, id);
  });
}

function validarTiposDoProjeto(dados) {
  const textoInvalido = CAMPOS_TEXTO_PROJETO.some(
    (campo) => dados[campo] != null && typeof dados[campo] !== 'string',
  );
  const numeroInvalido =
    !numeroValidoQuandoPresente(dados.idGrupo) ||
    !numeroValidoQuandoPresente(dados.idEdital) ||
    (Array.isArray(dados.areas) && dados.areas.some((idArea) => !numeroValidoQuandoPresente(idArea)));
  const areasInvalidas = dados.areas != null && !Array.isArray(dados.areas);

  if (textoInvalido || numeroInvalido || areasInvalidas) {
    throw new ErroHttp(400, 'Campos do projeto inválidos.');
  }
}

function normalizarProjeto(dados) {
  return {
    titulo: String(dados.titulo ?? '').trim(),
    resumo: normalizarTextoOpcional(dados.resumo),
    dataInicio: String(dados.dataInicio ?? '').trim(),
    dataFim: normalizarTextoOpcional(dados.dataFim),
    status: String(dados.status ?? '').trim(),
    idGrupo: dados.idGrupo,
    idEdital: dados.idEdital ?? null,
    areas: Array.isArray(dados.areas) ? dados.areas : [],
  };
}

function validarDadosDoProjeto(projeto) {
  const problemas = [];

  if (!projeto.titulo) {
    problemas.push('Informe o título.');
  } else if (projeto.titulo.length > 255) {
    problemas.push('O título deve ter no máximo 255 caracteres.');
  }

  if (!STATUS_PROJETO.includes(projeto.status)) {
    problemas.push('O status deve ser planejado, em_andamento, concluido ou cancelado.');
  }

  if (projeto.resumo !== null && projeto.resumo.length > TAMANHO_MAXIMO_RESUMO) {
    problemas.push('O resumo deve ter no máximo 5000 caracteres.');
  }

  if (!dataValida(projeto.dataInicio)) {
    problemas.push('Informe a data de início no formato YYYY-MM-DD.');
  }

  if (projeto.dataFim !== null && !dataValida(projeto.dataFim)) {
    problemas.push('Informe a data de fim no formato YYYY-MM-DD.');
  }

  if (dataValida(projeto.dataInicio) && projeto.dataFim !== null && dataValida(projeto.dataFim) && projeto.dataFim < projeto.dataInicio) {
    problemas.push('A data de fim não pode ser anterior à de início.');
  }

  if (!Number.isInteger(projeto.idGrupo) || projeto.idGrupo < 1 || projeto.idGrupo > POSTGRES_INTEGER_MAXIMO) {
    problemas.push('Informe um grupo válido.');
  }

  if (
    projeto.idEdital !== null &&
    (!Number.isInteger(projeto.idEdital) || projeto.idEdital < 1 || projeto.idEdital > POSTGRES_INTEGER_MAXIMO)
  ) {
    problemas.push('Informe um edital válido.');
  }

  if (
    projeto.areas.some(
      (idArea) => !Number.isInteger(idArea) || idArea < 1 || idArea > POSTGRES_INTEGER_MAXIMO,
    )
  ) {
    problemas.push('Informe áreas válidas.');
  }

  if (problemas.length > 0) {
    throw new ErroHttp(400, problemas.join(' '));
  }
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function normalizarTextoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function numeroValidoQuandoPresente(valor) {
  return valor == null || (typeof valor === 'number' && Number.isFinite(valor));
}

function tratarConflitoProjeto(erro) {
  if (erro.code === '23503' && erro.constraint === 'fk_projeto_grupo') {
    throw new ErroHttp(400, 'Grupo não encontrado.');
  }

  if (erro.code === '23503' && erro.constraint === 'fk_projeto_edital') {
    throw new ErroHttp(400, 'Edital não encontrado.');
  }

  if (erro.code === '23503' && erro.constraint === 'fk_possui_area_area') {
    throw new ErroHttp(400, 'Área não encontrada.');
  }
}
