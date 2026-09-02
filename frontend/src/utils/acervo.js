export const ROTULOS_TIPO = {
  artigo: 'Artigo',
  capitulo: 'Capítulo',
  resumo: 'Resumo',
};

export const ROTULOS_STATUS = {
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const ROTULOS_VINCULO = {
  docente: 'Docente',
  discente: 'Discente',
  externo: 'Externo',
};

export const ROTULOS_PAPEL = {
  coordenador: 'Coordenador',
  participante: 'Participante',
  lider: 'Líder',
  membro: 'Membro',
};

export const POR_PAGINA = 20;

export const TIPOS_QUE_CADASTRAM = ['pesquisador', 'admin'];

export function podeCadastrarNoAcervo(usuario) {
  return Boolean(usuario) && TIPOS_QUE_CADASTRAM.includes(usuario.tipo);
}

export function ordenarAutores(autores = []) {
  return [...autores].sort((um, outro) => um.ordem - outro.ordem);
}

export function nomesDosAutores(autores) {
  return ordenarAutores(autores)
    .map((autor) => autor.nome)
    .join(', ');
}

export function formatarData(data) {
  if (!data) {
    return '';
  }

  const [ano, mes, dia] = data.slice(0, 10).split('-');

  return `${dia}/${mes}/${ano}`;
}

export function formatarPeriodo(dataInicio, dataFim) {
  const inicio = formatarData(dataInicio);

  return dataFim ? `${inicio} a ${formatarData(dataFim)}` : `${inicio} — em andamento`;
}

export function totalDePaginas(paginacao) {
  if (!paginacao || !paginacao.porPagina) {
    return 1;
  }

  return Math.max(1, Math.ceil(paginacao.total / paginacao.porPagina));
}

export function siglaDaArea(nome) {
  if (!nome) {
    return '';
  }

  return nome
    .split(/\s+/)
    .filter((parte) => parte.length > 2)
    .map((parte) => parte[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export function iniciaisDoNome(nome) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';

  return (primeira + ultima).toUpperCase();
}

export function agruparPorAno(publicacoes) {
  const grupos = [];

  publicacoes.forEach((publicacao) => {
    const ultimo = grupos[grupos.length - 1];

    if (ultimo && ultimo.ano === publicacao.ano) {
      ultimo.itens.push(publicacao);
    } else {
      grupos.push({ ano: publicacao.ano, itens: [publicacao] });
    }
  });

  return grupos;
}

export function saudacao(hora = new Date().getHours()) {
  if (hora < 12) {
    return 'Bom dia';
  }

  return hora < 18 ? 'Boa tarde' : 'Boa noite';
}

export function periodoDosAnos(porAno = []) {
  const anos = porAno.map((item) => item.ano);

  if (anos.length === 0) {
    return '';
  }

  const primeiro = Math.min(...anos);
  const ultimo = Math.max(...anos);

  return primeiro === ultimo ? String(primeiro) : `${primeiro}–${ultimo}`;
}

export function percentualRelativo(quantidade, maior) {
  return maior > 0 ? Math.round((quantidade / maior) * 100) : 0;
}

export function juntarNomes(nomes = []) {
  if (nomes.length < 2) {
    return nomes[0] ?? '';
  }

  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

export function montarAgora(vagas = [], editais = [], limite = 5) {
  const vagasEscolhidas = vagas.slice(0, Math.min(3, limite));
  const espaco = Math.max(limite - vagasEscolhidas.length, 0);
  const editaisEscolhidos = editais.slice(0, espaco);

  return { vagas: vagasEscolhidas, editais: editaisEscolhidos };
}
