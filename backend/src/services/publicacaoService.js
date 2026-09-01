import { transacao } from '../config/bd.js';
import { ErroHttp } from '../erros/ErroHttp.js';
import { FORMATO_EMAIL } from '../models/formatoEmail.js';
import * as repositorioPesquisadores from '../models/repositorioPesquisadores.js';
import * as repositorioProjetos from '../models/repositorioProjetos.js';
import * as repositorioPublicacoes from '../models/repositorioPublicacoes.js';
import { VINCULOS_PESQUISADOR } from '../models/vinculosPesquisador.js';
import {
  POSTGRES_INTEGER_MAXIMO,
  validarEnumOpcional,
  validarId,
  validarInteiroOpcional,
  validarPaginacao,
} from './consultaParametrosService.js';
import { resolverPesquisadorAutenticado } from './pesquisadorAutenticadoService.js';

const TIPOS_PUBLICACAO = ['artigo', 'capitulo', 'resumo'];
const CAMPOS_TEXTO_PUBLICACAO = ['titulo', 'tipo', 'doi', 'veiculo'];

export async function listar(filtros) {
  const paginacao = validarPaginacao(filtros);
  const tipo = validarEnumOpcional(
    filtros.tipo,
    TIPOS_PUBLICACAO,
    'O tipo deve ser artigo, capítulo ou resumo.',
  );
  const ano = validarInteiroOpcional(filtros.ano, 'O ano deve ser um número inteiro.');
  const idProjeto = validarInteiroOpcional(filtros.idProjeto, 'O id do projeto deve ser um número inteiro.', {
    minimo: 1,
  });
  const idPesquisador = validarInteiroOpcional(
    filtros.idPesquisador,
    'O id do pesquisador deve ser um número inteiro.',
    { minimo: 1 },
  );
  const idArea = validarInteiroOpcional(filtros.idArea, 'O id da área deve ser um número inteiro.', {
    minimo: 1,
  });
  const resultado = await repositorioPublicacoes.listar({
    busca: filtros.busca,
    tipo,
    ano,
    idProjeto,
    idPesquisador,
    idArea,
    limite: paginacao.limite,
    deslocamento: paginacao.deslocamento,
  });

  return {
    publicacoes: resultado.itens,
    paginacao: {
      pagina: paginacao.pagina,
      porPagina: paginacao.porPagina,
      total: resultado.total,
    },
  };
}

export async function listarRelacionadas(valorId, valorLimite) {
  const id = validarId(valorId);
  const limite = validarInteiroOpcional(valorLimite, 'O limite deve ser um número inteiro.', { minimo: 1, maximo: 10 }) ?? 5;

  const publicacao = await repositorioPublicacoes.buscarPorId(id);
  if (!publicacao) {
    throw new ErroHttp(404, 'Publicação não encontrada.');
  }

  const relacionadas = await repositorioPublicacoes.buscarRelacionadas(id, limite);

  return relacionadas;
}

export async function buscarPorId(valorId) {
  const id = validarId(valorId);
  const publicacao = await repositorioPublicacoes.buscarPorId(id);

  if (!publicacao) {
    throw new ErroHttp(404, 'Publicação não encontrada.');
  }

  return publicacao;
}

export async function cadastrar(dados, usuario) {
  const dadosPublicacao = dados ?? {};
  validarTiposDaPublicacao(dadosPublicacao);
  const publicacao = normalizarPublicacao(dadosPublicacao);
  validarDadosDaPublicacao(publicacao);

  try {
    const idPublicacao = await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioProjetos.existe(publicacao.idProjeto, cliente))) {
        throw new ErroHttp(400, 'Projeto não encontrado.');
      }

      const idsArea = await resolverAreas(publicacao.areas, cliente);
      const autores = await resolverAutores(publicacao.autores, cliente);
      const idCriado = await repositorioPublicacoes.criar(cliente, publicacao);

      for (const [indice, autor] of autores.entries()) {
        await repositorioPublicacoes.criarAutoria(cliente, {
          idPublicacao: idCriado,
          idPesquisador: autor.id,
          ordem: indice + 1,
        });
      }

      for (const idArea of idsArea) {
        await repositorioPublicacoes.vincularArea(cliente, {
          idPublicacao: idCriado,
          idArea,
        });
      }

      return idCriado;
    });

    return buscarPorId(idPublicacao);
  } catch (err) {
    tratarConflitoUnicoPublicacao(err);
    throw err;
  }
}

export async function atualizar(valorId, dados, usuario) {
  const id = validarId(valorId);
  const dadosPublicacao = dados ?? {};
  validarTiposDaPublicacao(dadosPublicacao);
  const publicacao = normalizarPublicacao(dadosPublicacao);
  validarDadosDaPublicacao(publicacao);

  try {
    await transacao(async (cliente) => {
      await resolverPesquisadorAutenticado(usuario, cliente);

      if (!(await repositorioPublicacoes.existe(id, cliente))) {
        throw new ErroHttp(404, 'Publicação não encontrada.');
      }

      if (!(await repositorioProjetos.existe(publicacao.idProjeto, cliente))) {
        throw new ErroHttp(400, 'Projeto não encontrado.');
      }

      const idsArea = await resolverAreas(publicacao.areas, cliente);
      const autores = await resolverAutores(publicacao.autores, cliente);
      await repositorioPublicacoes.atualizar(cliente, id, publicacao);
      await repositorioPublicacoes.removerAutorias(cliente, id);
      await repositorioPublicacoes.removerAreas(cliente, id);

      for (const [indice, autor] of autores.entries()) {
        await repositorioPublicacoes.criarAutoria(cliente, {
          idPublicacao: id,
          idPesquisador: autor.id,
          ordem: indice + 1,
        });
      }

      for (const idArea of idsArea) {
        await repositorioPublicacoes.vincularArea(cliente, {
          idPublicacao: id,
          idArea,
        });
      }
    });

    return buscarPorId(id);
  } catch (err) {
    tratarConflitoUnicoPublicacao(err);
    throw err;
  }
}

export async function excluir(valorId, usuario) {
  const id = validarId(valorId);

  await transacao(async (cliente) => {
    await resolverPesquisadorAutenticado(usuario, cliente);
    const existe = await repositorioPublicacoes.existe(id, cliente);

    if (!existe) {
      throw new ErroHttp(404, 'Publicação não encontrada.');
    }

    await repositorioPublicacoes.excluir(cliente, id);
  });
}

async function resolverAreas(areas, cliente) {
  const idsArea = [...new Set(areas)];

  if (idsArea.length === 0) {
    return idsArea;
  }

  const existentes = await repositorioPublicacoes.areasExistentes(idsArea, cliente);
  if (existentes.length !== idsArea.length) {
    throw new ErroHttp(400, 'Área não encontrada.');
  }

  return idsArea;
}

async function resolverAutores(autores, cliente) {
  const resolvidos = [];
  const idsResolvidos = new Set();

  for (const autor of autores) {
    const pesquisador = await resolverAutor(autor, cliente);

    if (!pesquisador) {
      throw new ErroHttp(400, 'Autor não encontrado.');
    }

    if (idsResolvidos.has(pesquisador.id)) {
      throw new ErroHttp(400, 'Não repita o mesmo autor na lista.');
    }

    idsResolvidos.add(pesquisador.id);
    resolvidos.push(pesquisador);
  }

  return resolvidos;
}

async function resolverAutor(autor, cliente) {
  if (autor.id !== undefined) {
    const pesquisador = await repositorioPesquisadores.buscarPorId(autor.id, cliente);

    if (!pesquisador) {
      throw new ErroHttp(400, 'Autor não encontrado.');
    }

    return pesquisador;
  }

  const existente = await repositorioPesquisadores.buscarPorNumeroLattes(autor.numeroLattes, cliente);

  if (existente) {
    return existente;
  }

  const criado = await repositorioPesquisadores.criarManual(cliente, autor);

  if (criado) {
    return criado;
  }

  return repositorioPesquisadores.buscarPorNumeroLattes(autor.numeroLattes, cliente);
}

function validarTiposDaPublicacao(dados) {
  const textoInvalido = CAMPOS_TEXTO_PUBLICACAO.some(
    (campo) => dados[campo] != null && typeof dados[campo] !== 'string',
  );
  const numeroInvalido =
    !numeroValidoQuandoPresente(dados.ano) ||
    !numeroValidoQuandoPresente(dados.idProjeto) ||
    (Array.isArray(dados.autores) &&
      dados.autores.some((autor) => autor?.id != null && !numeroValidoQuandoPresente(autor.id))) ||
    (Array.isArray(dados.areas) && dados.areas.some((idArea) => !numeroValidoQuandoPresente(idArea)));
  const autoresInvalidos =
    dados.autores != null &&
    (!Array.isArray(dados.autores) ||
      dados.autores.some((autor) => !autorEhObjeto(autor)));
  const textoAutorInvalido =
    Array.isArray(dados.autores) &&
    dados.autores.some((autor) =>
      autorEhObjeto(autor) &&
      ['nome', 'numeroLattes', 'email', 'vinculo'].some(
        (campo) => autor[campo] != null && typeof autor[campo] !== 'string',
      ),
    );
  const areasInvalidas = dados.areas != null && !Array.isArray(dados.areas);

  if (textoInvalido || numeroInvalido || autoresInvalidos || textoAutorInvalido || areasInvalidas) {
    throw new ErroHttp(400, 'Campos da publicação inválidos.');
  }
}

function normalizarPublicacao(dados) {
  return {
    titulo: String(dados.titulo ?? '').trim(),
    tipo: String(dados.tipo ?? '').trim(),
    ano: dados.ano,
    doi: normalizarTextoOpcional(dados.doi),
    veiculo: String(dados.veiculo ?? '').trim(),
    idProjeto: dados.idProjeto,
    autores: Array.isArray(dados.autores) ? dados.autores.map(normalizarAutor) : dados.autores,
    areas: Array.isArray(dados.areas) ? dados.areas : [],
  };
}

function normalizarAutor(autor) {
  return {
    ...(autor.id !== undefined && autor.id !== null ? { id: autor.id } : {}),
    nome: String(autor.nome ?? '').trim(),
    numeroLattes: String(autor.numeroLattes ?? '').trim(),
    email: String(autor.email ?? '').trim(),
    vinculo: String(autor.vinculo ?? '').trim(),
  };
}

function validarDadosDaPublicacao(publicacao) {
  const problemas = [];

  if (!publicacao.titulo) {
    problemas.push('Informe o título.');
  } else if (publicacao.titulo.length > 255) {
    problemas.push('O título deve ter no máximo 255 caracteres.');
  }

  if (!TIPOS_PUBLICACAO.includes(publicacao.tipo)) {
    problemas.push('O tipo deve ser artigo, capítulo ou resumo.');
  }

  if (!Number.isInteger(publicacao.ano) || publicacao.ano < 1950 || publicacao.ano > 2100) {
    problemas.push('O ano deve ser um número inteiro entre 1950 e 2100.');
  }

  if (!publicacao.veiculo) {
    problemas.push('Informe o veículo.');
  } else if (publicacao.veiculo.length > 150) {
    problemas.push('O veículo deve ter no máximo 150 caracteres.');
  }

  if (publicacao.doi && publicacao.doi.length > 100) {
    problemas.push('O DOI deve ter no máximo 100 caracteres.');
  }

  if (!Number.isInteger(publicacao.idProjeto) || publicacao.idProjeto < 1 || publicacao.idProjeto > POSTGRES_INTEGER_MAXIMO) {
    problemas.push('Informe um projeto válido.');
  }

  if (publicacao.areas.some((idArea) => !Number.isInteger(idArea) || idArea < 1 || idArea > POSTGRES_INTEGER_MAXIMO)) {
    problemas.push('Áreas de conhecimento inválidas.');
  }

  validarAutores(publicacao.autores, problemas);

  if (problemas.length > 0) {
    throw new ErroHttp(400, problemas.join(' '));
  }
}

function validarAutores(autores, problemas) {
  if (!Array.isArray(autores) || autores.length === 0) {
    problemas.push('Informe ao menos um autor.');
    return;
  }

  const numerosLattes = new Set();

  for (const autor of autores) {
    validarAutor(autor, numerosLattes, problemas);
  }
}

function validarAutor(autor, numerosLattes, problemas) {
  const ehExistente = autor.id !== undefined;
  const temDadosNovos = Boolean(autor.nome || autor.numeroLattes || autor.vinculo);

  if (ehExistente === temDadosNovos) {
    problemas.push('Informe um autor existente ou os dados de um autor novo.');
    return;
  }

  if (ehExistente) {
    validarAutorExistente(autor, problemas);
    return;
  }

  validarAutorNovo(autor, numerosLattes, problemas);
}

function validarAutorExistente(autor, problemas) {
  if (!Number.isInteger(autor.id) || autor.id < 1 || autor.id > POSTGRES_INTEGER_MAXIMO) {
    problemas.push('Informe um autor existente ou os dados de um autor novo.');
  }
}

function validarAutorNovo(autor, numerosLattes, problemas) {
  if (!autor.nome || !autor.numeroLattes || !VINCULOS_PESQUISADOR.has(autor.vinculo)) {
    problemas.push('Informe um autor existente ou os dados de um autor novo.');
    return;
  }

  validarComprimentosDoAutor(autor, problemas);
  validarEmailDoAutor(autor, problemas);
  validarLattesRepetido(autor, numerosLattes, problemas);
}

function validarComprimentosDoAutor(autor, problemas) {
  if (autor.nome.length > 150) {
    problemas.push('O nome do autor deve ter no máximo 150 caracteres.');
  }

  if (autor.numeroLattes.length > 50) {
    problemas.push('O número Lattes deve ter no máximo 50 caracteres.');
  }
}

function validarEmailDoAutor(autor, problemas) {
  if (autor.email && !FORMATO_EMAIL.test(autor.email)) {
    problemas.push('Informe um email válido para o autor novo.');
  }

  if (autor.email.length > 150) {
    problemas.push('O email do autor deve ter no máximo 150 caracteres.');
  }
}

function validarLattesRepetido(autor, numerosLattes, problemas) {
  if (numerosLattes.has(autor.numeroLattes)) {
    problemas.push('Não repita o mesmo autor na lista.');
  }

  numerosLattes.add(autor.numeroLattes);
}

function tratarConflitoUnicoPublicacao(erro) {
  if (erro.code === '23505' && erro.constraint === 'uq_publicacao_doi') {
    throw new ErroHttp(409, 'Já existe uma publicação com esse DOI.');
  }

  if (erro.code === '23503' && erro.constraint === 'fk_publicacao_projeto') {
    throw new ErroHttp(400, 'Projeto não encontrado.');
  }

  if (erro.code === '23503' && erro.constraint === 'fk_area_publicacao_area') {
    throw new ErroHttp(400, 'Área não encontrada.');
  }
}

function normalizarTextoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function numeroValidoQuandoPresente(valor) {
  return valor == null || (typeof valor === 'number' && Number.isFinite(valor));
}

function autorEhObjeto(autor) {
  return !!autor && !Array.isArray(autor) && typeof autor === 'object';
}
