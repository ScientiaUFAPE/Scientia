import { transacao } from '../config/bd.js';
import { ErroHttp } from '../erros/ErroHttp.js';
import * as repositorioGrupos from '../models/repositorioGrupos.js';
import {
  POSTGRES_INTEGER_MAXIMO,
  validarEnumOpcional,
  validarId,
  validarPaginacao,
} from './consultaParametrosService.js';
import { resolverPesquisadorAutenticado } from './pesquisadorAutenticadoService.js';

const CAMPOS_TEXTO_GRUPO = ['nome', 'linkDgp'];
const ORDENS_GRUPO = ['projetos', 'membros', 'recentes', 'nome'];

export async function listar(filtros) {
  const paginacao = validarPaginacao(filtros);
  const ordem = validarEnumOpcional(
    filtros.ordem,
    ORDENS_GRUPO,
    'A ordem deve ser projetos, membros, recentes ou nome.',
  ) ?? 'projetos';
  const resultado = await repositorioGrupos.listar({
    busca: filtros.busca,
    ordem,
    limite: paginacao.limite,
    deslocamento: paginacao.deslocamento,
  });

  return {
    grupos: resultado.itens,
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
  const grupo = await repositorioGrupos.buscarPorId(id);

  if (!grupo) {
    throw new ErroHttp(404, 'Grupo não encontrado.');
  }

  return grupo;
}

export async function cadastrar(dados, usuario) {
  const dadosGrupo = dados ?? {};
  validarTiposDoGrupo(dadosGrupo);
  const grupo = normalizarGrupo(dadosGrupo);
  validarDadosDoGrupo(grupo);

  try {
    const idGrupo = await transacao(async (cliente) => {
      const pesquisador = await resolverPesquisadorAutenticado(usuario, cliente);
      const idCriado = await repositorioGrupos.criar(cliente, grupo);

      if (pesquisador) {
        await repositorioGrupos.criarMembro(cliente, {
          idGrupo: idCriado,
          idPesquisador: pesquisador.id,
          papel: 'lider',
        });
      }

      return idCriado;
    });

    return buscarPorId(idGrupo);
  } catch (err) {
    tratarConflitoUnicoGrupo(err);
    throw err;
  }
}

export async function atualizar(valorId, dados, usuario) {
  const id = validarId(valorId);
  const dadosGrupo = dados ?? {};
  validarTiposDoGrupo(dadosGrupo);
  const grupo = normalizarGrupo(dadosGrupo);
  validarDadosDoGrupo(grupo);

  try {
    await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioGrupos.existe(id, cliente))) {
        throw new ErroHttp(404, 'Grupo não encontrado.');
      }

      await repositorioGrupos.atualizar(cliente, id, grupo);
    });

    return buscarPorId(id);
  } catch (err) {
    tratarConflitoUnicoGrupo(err);
    throw err;
  }
}

export async function excluir(valorId, usuario) {
  const id = validarId(valorId);

  try {
    await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioGrupos.existe(id, cliente))) {
        throw new ErroHttp(404, 'Grupo não encontrado.');
      }

      await repositorioGrupos.excluir(cliente, id);
    });
  } catch (err) {
    if (err.code === '23503' && err.constraint === 'fk_projeto_grupo') {
      throw new ErroHttp(409, 'Não é possível excluir um grupo que possui projetos.');
    }

    throw err;
  }
}

function validarTiposDoGrupo(dados) {
  const textoInvalido = CAMPOS_TEXTO_GRUPO.some(
    (campo) => dados[campo] != null && typeof dados[campo] !== 'string',
  );
  const numeroInvalido = !numeroValidoQuandoPresente(dados.anoCriacao);

  if (textoInvalido || numeroInvalido) {
    throw new ErroHttp(400, 'Campos do grupo inválidos.');
  }
}

function normalizarGrupo(dados) {
  return {
    nome: String(dados.nome ?? '').trim(),
    linkDgp: normalizarTextoOpcional(dados.linkDgp),
    anoCriacao: dados.anoCriacao,
  };
}

function validarDadosDoGrupo(grupo) {
  const problemas = [];

  if (!grupo.nome) {
    problemas.push('Informe o nome.');
  } else if (grupo.nome.length > 150) {
    problemas.push('O nome deve ter no máximo 150 caracteres.');
  }

  if (grupo.linkDgp && grupo.linkDgp.length > 255) {
    problemas.push('O link DGP deve ter no máximo 255 caracteres.');
  }

  if (
    !Number.isInteger(grupo.anoCriacao) ||
    grupo.anoCriacao < 1950 ||
    grupo.anoCriacao > 2100 ||
    grupo.anoCriacao > POSTGRES_INTEGER_MAXIMO
  ) {
    problemas.push('O ano de criação deve ser um número inteiro entre 1950 e 2100.');
  }

  if (problemas.length > 0) {
    throw new ErroHttp(400, problemas.join(' '));
  }
}

function tratarConflitoUnicoGrupo(erro) {
  if (erro.code === '23505' && erro.constraint === 'uq_grupo_nome') {
    throw new ErroHttp(409, 'Já existe um grupo com esse nome.');
  }
}

function normalizarTextoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function numeroValidoQuandoPresente(valor) {
  return valor == null || (typeof valor === 'number' && Number.isFinite(valor));
}
