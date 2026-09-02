import { requisitar } from './api.js';

export function listarProjetos() {
  return requisitar('/relatorios/projetos');
}

export function listarPublicacoes() {
  return requisitar('/relatorios/publicacoes');
}

export function listarGrupos() {
  return requisitar('/relatorios/grupos');
}

export function obterIndicadoresProducoes() {
  return requisitar('/relatorios/indicadores-producoes');
}
