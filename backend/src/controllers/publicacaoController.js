import { listaDePublicacoesResposta, publicacaoResposta } from '../dto/publicacaoDTO.js';
import * as publicacaoService from '../services/publicacaoService.js';

export async function listar(req, res) {
  const resultado = await publicacaoService.listar(req.query);

  res.json({
    publicacoes: listaDePublicacoesResposta(resultado.publicacoes),
    paginacao: resultado.paginacao,
  });
}

export async function relacionadas(req, res) {
  const relacionadas = await publicacaoService.listarRelacionadas(req.params.id, req.query.limite);
  res.json({ publicacoes: listaDePublicacoesResposta(relacionadas) });
}

export async function detalhar(req, res) {
  const publicacao = await publicacaoService.buscarPorId(req.params.id);
  res.json({ publicacao: publicacaoResposta(publicacao) });
}

export async function cadastrar(req, res) {
  const publicacao = await publicacaoService.cadastrar(req.body ?? {}, req.usuario);
  res.status(201).json({ publicacao: publicacaoResposta(publicacao) });
}

export async function atualizar(req, res) {
  const publicacao = await publicacaoService.atualizar(req.params.id, req.body ?? {}, req.usuario);
  res.json({ publicacao: publicacaoResposta(publicacao) });
}

export async function excluir(req, res) {
  await publicacaoService.excluir(req.params.id, req.usuario);
  res.status(204).end();
}
