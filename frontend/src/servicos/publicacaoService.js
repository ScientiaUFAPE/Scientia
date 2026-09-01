import { montarConsulta, requisitar } from './api.js';

export function listar(filtros) {
  return requisitar(`/publicacoes${montarConsulta(filtros)}`);
}

export function buscarPorId(id) {
  return requisitar(`/publicacoes/${id}`);
}

export function buscarRelacionadas(id, token, limite = 5) {
  return requisitar(`/publicacoes/${id}/relacionadas?limite=${limite}`, { token });
}

export function cadastrar(dados, token) {
  return requisitar('/publicacoes', { metodo: 'POST', corpo: dados, token });
}

export function atualizar(id, dados, token) {
  return requisitar(`/publicacoes/${id}`, { metodo: 'PUT', corpo: dados, token });
}

export function excluir(id, token) {
  return requisitar(`/publicacoes/${id}`, { metodo: 'DELETE', token });
}
