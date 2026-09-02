import { listaDeVagasResposta, vagaResposta } from '../dto/vagaDTO.js';
import * as vagaService from '../services/vagaService.js';

export async function listar(req, res) {
  const resultado = await vagaService.listar(req.query);

  res.json({
    vagas: listaDeVagasResposta(resultado.vagas),
    paginacao: resultado.paginacao,
    resumo: resultado.resumo,
  });
}

export async function detalhar(req, res) {
  const vaga = await vagaService.buscarPorId(req.params.id);
  res.json({ vaga: vagaResposta(vaga) });
}

export async function cadastrar(req, res) {
  const vaga = await vagaService.cadastrar(req.body ?? {}, req.usuario);
  res.status(201).json({ vaga: vagaResposta(vaga) });
}

export async function atualizar(req, res) {
  const vaga = await vagaService.atualizar(req.params.id, req.body ?? {}, req.usuario);
  res.json({ vaga: vagaResposta(vaga) });
}

export async function excluir(req, res) {
  await vagaService.excluir(req.params.id, req.usuario);
  res.status(204).end();
}
