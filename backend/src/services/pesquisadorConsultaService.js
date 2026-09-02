import { ErroHttp } from '../erros/ErroHttp.js';
import * as repositorioPesquisadores from '../models/repositorioPesquisadores.js';
import { LISTA_VINCULOS_PESQUISADOR } from '../models/vinculosPesquisador.js';
import {
  validarEnumOpcional,
  validarId,
  validarInteiroOpcional,
  validarPaginacao,
} from './consultaParametrosService.js';

export async function listar(filtros) {
  const paginacao = validarPaginacao(filtros);
  const vinculo = validarEnumOpcional(
    filtros.vinculo,
    LISTA_VINCULOS_PESQUISADOR,
    'O vínculo deve ser docente, discente ou externo.',
  );
  const idGrupo = validarInteiroOpcional(
    filtros.idGrupo,
    'O id do grupo deve ser um número inteiro.',
    { minimo: 1 },
  );
  const resultado = await repositorioPesquisadores.listar({
    busca: filtros.busca,
    vinculo,
    idGrupo,
    limite: paginacao.limite,
    deslocamento: paginacao.deslocamento,
  });

  return {
    pesquisadores: resultado.itens,
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

  const pesquisador = await repositorioPesquisadores.buscarPorId(id);
  if (!pesquisador) {
    throw new ErroHttp(404, 'Pesquisador não encontrado.');
  }

  return pesquisador;
}
