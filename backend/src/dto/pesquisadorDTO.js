export function pesquisadorResposta(pesquisador) {
  return {
    id: pesquisador.id,
    nome: pesquisador.nome,
    vinculo: pesquisador.vinculo,
    numeroLattes: pesquisador.numeroLattes,
    totalPublicacoes: pesquisador.totalPublicacoes,
    ultimaPublicacao: pesquisador.ultimaPublicacao,
    grupoPrincipal: pesquisador.grupoPrincipal,
  };
}

export function pesquisadorDetalheResposta(pesquisador) {
  return {
    id: pesquisador.id,
    nome: pesquisador.nome,
    vinculo: pesquisador.vinculo,
    numeroLattes: pesquisador.numeroLattes,
    totalPublicacoes: pesquisador.totalPublicacoes,
    ultimaPublicacao: pesquisador.ultimaPublicacao,
    grupos: pesquisador.grupos,
    areasFrequentes: pesquisador.areasFrequentes,
    projetosEmAndamento: pesquisador.projetosEmAndamento,
  };
}

export function listaDePesquisadoresResposta(pesquisadores) {
  return pesquisadores.map(pesquisadorResposta);
}
