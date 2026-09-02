import { transacao } from '../config/bd.js';
import { ErroHttp } from '../erros/ErroHttp.js';
import * as repositorioProjetos from '../models/repositorioProjetos.js';
import * as repositorioVagas from '../models/repositorioVagas.js';
import {
  POSTGRES_INTEGER_MAXIMO,
  validarEnumOpcional,
  validarId,
  validarInteiroOpcional,
  validarPaginacao,
} from './consultaParametrosService.js';
import { resolverPesquisadorAutenticado } from './pesquisadorAutenticadoService.js';

const STATUS_VAGA = ['aberta', 'fechada'];
const CAMPOS_TEXTO_VAGA = ['titulo', 'requisitos', 'status', 'dataAbertura'];
const TAMANHO_MAXIMO_REQUISITOS = 5000;

export async function listar(filtros) {
  const paginacao = validarPaginacao(filtros);
  const status = validarEnumOpcional(filtros.status, STATUS_VAGA, 'O status deve ser aberta ou fechada.');
  const idProjeto = validarInteiroOpcional(filtros.idProjeto, 'O id do projeto deve ser um número inteiro.', {
    minimo: 1,
  });
  const resultado = await repositorioVagas.listar({
    busca: filtros.busca,
    status,
    idProjeto,
    limite: paginacao.limite,
    deslocamento: paginacao.deslocamento,
  });

  return {
    vagas: resultado.itens,
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
  const vaga = await repositorioVagas.buscarPorId(id);

  if (!vaga) {
    throw new ErroHttp(404, 'Vaga não encontrada.');
  }

  return vaga;
}

export async function cadastrar(dados, usuario) {
  const vaga = prepararVaga(dados);

  try {
    const idVaga = await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioProjetos.existe(vaga.idProjeto, cliente))) {
        throw new ErroHttp(400, 'Projeto não encontrado.');
      }

      return repositorioVagas.criar(cliente, vaga);
    });

    return buscarPorId(idVaga);
  } catch (err) {
    tratarConflitoVaga(err);
    throw err;
  }
}

export async function atualizar(valorId, dados, usuario) {
  const id = validarId(valorId);
  const vaga = prepararVaga(dados);

  try {
    await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioVagas.existe(id, cliente))) {
        throw new ErroHttp(404, 'Vaga não encontrada.');
      }

      if (!(await repositorioProjetos.existe(vaga.idProjeto, cliente))) {
        throw new ErroHttp(400, 'Projeto não encontrado.');
      }

      await repositorioVagas.atualizar(cliente, id, vaga);
    });

    return buscarPorId(id);
  } catch (err) {
    tratarConflitoVaga(err);
    throw err;
  }
}

export async function excluir(valorId, usuario) {
  const id = validarId(valorId);

  await transacao(async (cliente) => {
    await resolverPesquisadorAutenticado(usuario, cliente);

    if (!(await repositorioVagas.existe(id, cliente))) {
      throw new ErroHttp(404, 'Vaga não encontrada.');
    }

    await repositorioVagas.excluir(cliente, id);
  });
}

function prepararVaga(dados) {
  const dadosVaga = dados ?? {};
  validarTipos(dadosVaga);
  const vaga = normalizar(dadosVaga);
  validar(vaga);
  return vaga;
}

function validarTipos(dados) {
  const textoInvalido = CAMPOS_TEXTO_VAGA.some(
    (campo) => dados[campo] != null && typeof dados[campo] !== 'string',
  );
  const numeroInvalido =
    !numeroValidoQuandoPresente(dados.idProjeto) || !numeroValidoQuandoPresente(dados.qtdVagas);

  if (textoInvalido || numeroInvalido) {
    throw new ErroHttp(400, 'Campos da vaga inválidos.');
  }
}

function normalizar(dados) {
  return {
    idProjeto: dados.idProjeto,
    titulo: String(dados.titulo ?? '').trim(),
    requisitos: normalizarTextoOpcional(dados.requisitos),
    status: String(dados.status ?? '').trim(),
    qtdVagas: dados.qtdVagas,
    dataAbertura: String(dados.dataAbertura ?? '').trim(),
  };
}

function validar(vaga) {
  const problemas = [];

  if (!vaga.titulo) {
    problemas.push('Informe o título.');
  } else if (vaga.titulo.length > 150) {
    problemas.push('O título deve ter no máximo 150 caracteres.');
  }

  if (vaga.requisitos !== null && vaga.requisitos.length > TAMANHO_MAXIMO_REQUISITOS) {
    problemas.push('Os requisitos devem ter no máximo 5000 caracteres.');
  }

  if (!STATUS_VAGA.includes(vaga.status)) {
    problemas.push('O status deve ser aberta ou fechada.');
  }

  if (!Number.isInteger(vaga.qtdVagas) || vaga.qtdVagas < 1 || vaga.qtdVagas > POSTGRES_INTEGER_MAXIMO) {
    problemas.push('A quantidade de vagas deve ser um número inteiro maior que zero.');
  }

  if (!Number.isInteger(vaga.idProjeto) || vaga.idProjeto < 1 || vaga.idProjeto > POSTGRES_INTEGER_MAXIMO) {
    problemas.push('Informe um projeto válido.');
  }

  if (!dataValida(vaga.dataAbertura)) {
    problemas.push('Informe a data de abertura no formato YYYY-MM-DD.');
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

function tratarConflitoVaga(erro) {
  if (erro.code === '23503' && erro.constraint === 'fk_vaga_projeto') {
    throw new ErroHttp(400, 'Projeto não encontrado.');
  }
}
