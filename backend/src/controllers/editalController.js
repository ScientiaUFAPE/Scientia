import { listaDeEditaisResposta } from '../dto/editalDTO.js';
import * as editalService from '../services/editalService.js';

export async function listar(req, res) {
  const editais = await editalService.listar(req.query);
  res.json({ editais: listaDeEditaisResposta(editais) });
}
