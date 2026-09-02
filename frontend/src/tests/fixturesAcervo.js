export const RESPOSTA_PUBLICACOES = {
  publicacoes: [
    {
      id: 1,
      titulo: 'Análise de desempenho de algoritmos de aprendizado',
      tipo: 'artigo',
      ano: 2024,
      doi: '10.1000/exemplo.1',
      veiculo: 'Revista Brasileira de Computação',
      projeto: { id: 3, titulo: 'Inteligência artificial aplicada ao Agreste' },
      autores: [
        { id: 91, nome: 'Ana Souza', ordem: 1 },
        { id: 104, nome: 'Bruno Lima', ordem: 2 },
      ],
    },
  ],
  paginacao: { pagina: 1, porPagina: 20, total: 200 },
};

export const RESPOSTA_PROJETOS = {
  projetos: [
    {
      id: 3,
      titulo: 'Inteligência artificial aplicada ao Agreste',
      status: 'em_andamento',
      dataInicio: '2024-03-01',
      dataFim: null,
      grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
      areas: [{ id: 1, nome: 'Ciência da Computação' }],
      totalPublicacoes: 4,
    },
  ],
  paginacao: { pagina: 1, porPagina: 20, total: 120 },
};

export const RESPOSTA_PROJETO = {
  projeto: {
    id: 3,
    titulo: 'Inteligência artificial aplicada ao Agreste',
    resumo: 'Estuda a aplicação de aprendizado de máquina...',
    status: 'em_andamento',
    dataInicio: '2024-03-01',
    dataFim: null,
    origem: 'manual',
    grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
    edital: { id: 7, nome: 'Edital Universal nº 03/2022', ano: 2022 },
    areas: [{ id: 1, nome: 'Ciência da Computação' }],
    equipe: [{ id: 91, nome: 'Ana Souza', papel: 'coordenador', dataEntrada: '2024-03-01' }],
    publicacoes: [{ id: 1, titulo: 'Análise de desempenho...', tipo: 'artigo', ano: 2024 }],
  },
};

export const RESPOSTA_GRUPOS = {
  grupos: [
    {
      id: 2,
      nome: 'Grupo de Pesquisa em Computação Aplicada',
      linkDgp: 'http://dgp.cnpq.br/exemplo',
      anoCriacao: 2015,
      totalProjetos: 6,
      totalMembros: 5,
      lider: 'Ana Souza',
      membrosPrevia: [{ id: 91, nome: 'Ana Souza' }],
    },
  ],
  paginacao: { pagina: 1, porPagina: 20, total: 30 },
  resumo: { totalGrupos: 30, totalProjetos: 120, totalMembros: 80, maiorTotalProjetos: 6 },
};

export const RESPOSTA_EDITAIS = {
  editais: [
    {
      id: 7,
      nome: 'Edital Universal nº 03/2022',
      ano: 2022,
      totalProjetos: 2,
      grupos: [
        { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
        { id: 4, nome: 'Núcleo de Redes' },
      ],
      projetos: [
        {
          id: 3,
          titulo: 'Inteligência artificial aplicada ao Agreste',
          status: 'em_andamento',
          grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
        },
        {
          id: 8,
          titulo: 'Monitoramento de redes sem fio no campus',
          status: 'concluido',
          grupo: { id: 4, nome: 'Núcleo de Redes' },
        },
      ],
    },
    {
      id: 11,
      nome: 'Edital PIBIC 2026',
      ano: 2026,
      totalProjetos: 1,
      grupos: [{ id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' }],
      projetos: [
        {
          id: 12,
          titulo: 'Painel de dados abertos da UFAPE',
          status: 'planejado',
          grupo: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
        },
      ],
    },
  ],
};

export const RESPOSTA_GRUPO = {
  grupo: {
    id: 2,
    nome: 'Grupo de Pesquisa em Computação Aplicada',
    linkDgp: null,
    anoCriacao: 2015,
    membros: [{ id: 91, nome: 'Ana Souza', papel: 'lider' }],
    projetos: [{ id: 3, titulo: 'Inteligência artificial aplicada ao Agreste', status: 'em_andamento' }],
  },
};

export const RESPOSTA_PESQUISADORES = {
  pesquisadores: [
    {
      id: 91,
      nome: 'Ana Souza',
      vinculo: 'docente',
      numeroLattes: '1234567890123456',
      totalPublicacoes: 12,
      ultimaPublicacao: 2026,
      grupoPrincipal: { id: 2, nome: 'Grupo de Pesquisa em Computação Aplicada' },
    },
    {
      id: 104,
      nome: 'Bruno Lima',
      vinculo: 'discente',
      numeroLattes: '9876543210987654',
      totalPublicacoes: 3,
      ultimaPublicacao: 2025,
    },
  ],
  paginacao: { pagina: 1, porPagina: 10, total: 2 },
  resumo: {
    totalPesquisadores: 2,
    totalAutorias: 15,
    porVinculo: { docente: 1, discente: 1, externo: 0 },
  },
};

export const RESPOSTA_AREAS = {
  areas: [
    { id: 1, nome: 'Ciência da Computação' },
    { id: 5, nome: 'Engenharia Agronômica' },
  ],
};

export const CORPO_NOVA_PUBLICACAO = {
  titulo: 'Análise de desempenho de algoritmos de aprendizado',
  tipo: 'artigo',
  ano: 2024,
  doi: '10.1000/exemplo.1',
  veiculo: 'Revista Brasileira de Computação',
  idProjeto: 3, areas: [],
  autores: [
    { id: 91 },
    { nome: 'Bruno Lima', numeroLattes: '9876543210987654', vinculo: 'docente', email: '' },
  ],
};

export const RESPOSTA_PUBLICACAO_CRIADA = {
  publicacao: RESPOSTA_PUBLICACOES.publicacoes[0],
};

export const CORPO_NOVO_PROJETO = {
  titulo: 'Inteligência artificial aplicada ao Agreste',
  resumo: 'Estuda a aplicação de aprendizado de máquina...',
  dataInicio: '2024-03-01',
  dataFim: null,
  status: 'em_andamento',
  idGrupo: 2,
  areas: [1, 5],
};
