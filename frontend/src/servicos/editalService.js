import { montarConsulta, requisitar } from './api.js';

export function listar(filtros) {
  return requisitar(`/editais${montarConsulta(filtros)}`);
}
