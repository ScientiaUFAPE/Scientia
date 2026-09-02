import { grupoDetalheResposta, listaDeGruposResposta } from '../dto/grupoDTO.js';
import * as grupoService from '../services/grupoService.js';

export async function listar(req, res) {
  const resultado = await grupoService.listar(req.query);

  res.json({
    grupos: listaDeGruposResposta(resultado.grupos),
    paginacao: resultado.paginacao,
    resumo: resultado.resumo,
  });
}

export async function detalhar(req, res) {
  const grupo = await grupoService.buscarPorId(req.params.id);
  res.json({ grupo: grupoDetalheResposta(grupo) });
}

export async function cadastrar(req, res) {
  const grupo = await grupoService.cadastrar(req.body ?? {}, req.usuario);
  res.status(201).json({ grupo: grupoDetalheResposta(grupo) });
}

export async function atualizar(req, res) {
  const grupo = await grupoService.atualizar(req.params.id, req.body ?? {}, req.usuario);
  res.json({ grupo: grupoDetalheResposta(grupo) });
}

export async function excluir(req, res) {
  await grupoService.excluir(req.params.id, req.usuario);
  res.status(204).end();
}
