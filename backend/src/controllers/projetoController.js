import { listaDeProjetosResposta, projetoDetalheResposta } from '../dto/projetoDTO.js';
import * as projetoService from '../services/projetoService.js';

export async function listar(req, res) {
  const resultado = await projetoService.listar(req.query);

  res.json({
    projetos: listaDeProjetosResposta(resultado.projetos),
    paginacao: resultado.paginacao,
    resumo: resultado.resumo,
  });
}

export async function detalhar(req, res) {
  const projeto = await projetoService.buscarPorId(req.params.id);
  res.json({ projeto: projetoDetalheResposta(projeto) });
}

export async function cadastrar(req, res) {
  const projeto = await projetoService.cadastrar(req.body ?? {}, req.usuario);
  res.status(201).json({ projeto: projetoDetalheResposta(projeto) });
}

export async function atualizar(req, res) {
  const projeto = await projetoService.atualizar(req.params.id, req.body ?? {}, req.usuario);
  res.json({ projeto: projetoDetalheResposta(projeto) });
}

export async function excluir(req, res) {
  await projetoService.excluir(req.params.id, req.usuario);
  res.status(204).end();
}
