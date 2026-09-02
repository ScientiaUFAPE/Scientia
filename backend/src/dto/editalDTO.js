export function editalResposta(edital) {
  return {
    id: edital.id,
    nome: edital.nome,
    ano: edital.ano,
    totalProjetos: edital.totalProjetos,
    grupos: edital.grupos,
    projetos: edital.projetos,
  };
}

export function listaDeEditaisResposta(editais) {
  return editais.map(editalResposta);
}
