import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Publicacoes } from '../paginas/Publicacoes.jsx';
import * as publicacaoService from '../servicos/publicacaoService.js';
import { RESPOSTA_PUBLICACOES } from './fixturesAcervo.js';

vi.mock('../servicos/areaService.js', () => ({
  listar: vi.fn().mockResolvedValue({ areas: [] })
}));

vi.mock('../servicos/publicacaoService.js', () => ({
  listar: vi.fn(),
}));

const sessaoFalsa = { usuario: null };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

const [publicacaoDaSpec] = RESPOSTA_PUBLICACOES.publicacoes;

const publicacaoComAutoresEmbaralhados = {
  ...publicacaoDaSpec,
  id: 2,
  titulo: 'Mapeamento de cultivares com visão computacional',
  tipo: 'resumo',
  ano: 2023,
  doi: null,
  autores: [
    { id: 104, nome: 'Bruno Lima', ordem: 2 },
    { id: 91, nome: 'Ana Souza', ordem: 1 },
  ],
};

function renderizarTela() {
  return render(
    <MemoryRouter>
      <Publicacoes />
    </MemoryRouter>,
  );
}

describe('Tela de publicações', () => {
  beforeEach(() => {
    sessaoFalsa.usuario = null;
    vi.useFakeTimers();
    publicacaoService.listar.mockResolvedValue(RESPOSTA_PUBLICACOES);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('mostra o carregamento e depois uma linha por publicação, com o resto no painel', async () => {
    renderizarTela();
    expect(screen.getByText(/carregando publicações/i)).toBeInTheDocument();

    await act(async () => {});

    const linha = screen
      .getByText('Análise de desempenho de algoritmos de aprendizado')
      .closest('button');

    expect(within(linha).getByText('Artigo')).toBeInTheDocument();
    expect(within(linha).getByText('2024')).toBeInTheDocument();

    fireEvent.click(linha);

    const painel = screen.getByRole('complementary');

    expect(within(painel).getByText('Revista Brasileira de Computação')).toBeInTheDocument();
    expect(
      within(painel).getByRole('link', { name: 'Inteligência artificial aplicada ao Agreste' }),
    ).toHaveAttribute('href', '/projetos/3');
    expect(within(painel).getByRole('link', { name: /10\.1000\/exemplo\.1/ })).toHaveAttribute(
      'href',
      'https://doi.org/10.1000/exemplo.1',
    );
  });

  it('lista os autores por ordem crescente, não pela ordem do array', async () => {
    publicacaoService.listar.mockResolvedValue({
      ...RESPOSTA_PUBLICACOES,
      publicacoes: [publicacaoDaSpec, publicacaoComAutoresEmbaralhados],
    });

    renderizarTela();
    await act(async () => {});

    fireEvent.click(
      screen.getByText('Mapeamento de cultivares com visão computacional').closest('button'),
    );

    expect(screen.getByRole('complementary').textContent).toMatch(
      /Ana Souza[\s\S]*Bruno Lima/,
    );
  });

  it('sem DOI, o painel não oferece o link do doi.org', async () => {
    publicacaoService.listar.mockResolvedValue({
      ...RESPOSTA_PUBLICACOES,
      publicacoes: [publicacaoComAutoresEmbaralhados],
    });

    renderizarTela();
    await act(async () => {});

    fireEvent.click(
      screen.getByText('Mapeamento de cultivares com visão computacional').closest('button'),
    );

    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^DOI/ })).not.toBeInTheDocument();
  });

  it('escolher o tipo chama o serviço com o filtro e volta para a primeira página', async () => {
    renderizarTela();
    await act(async () => {});

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'capitulo' } });
    await act(async () => {});

    expect(publicacaoService.listar).toHaveBeenLastCalledWith({
      busca: '',
      tipo: 'capitulo',
      ano: '',
      idArea: '',
      pagina: 1,
      porPagina: 20,
    });
  });

  it('digitar na busca chama o serviço com o termo depois do debounce', async () => {
    renderizarTela();
    await act(async () => {});

    fireEvent.change(screen.getByPlaceholderText(/título ou autor/i), {
      target: { value: 'agreste' },
    });

    expect(publicacaoService.listar).not.toHaveBeenCalledWith(
      expect.objectContaining({ busca: 'agreste' }),
    );

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(publicacaoService.listar).toHaveBeenLastCalledWith({
      busca: 'agreste',
      tipo: '',
      ano: '',
      idArea: '',
      pagina: 1,
      porPagina: 20,
    });
  });

  it('avançar a paginação pede a página seguinte ao serviço', async () => {
    renderizarTela();
    await act(async () => {});

    expect(screen.getByText(/página 1 de 10 · 200 resultados/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await act(async () => {});

    expect(publicacaoService.listar).toHaveBeenLastCalledWith({
      busca: '',
      tipo: '',
      ano: '',
      idArea: '',
      pagina: 2,
      porPagina: 20,
    });
  });

  it('mostra o alerta de erro quando o serviço falha', async () => {
    publicacaoService.listar.mockRejectedValue(
      new Error('Não foi possível falar com o servidor. Verifique se a API está no ar.'),
    );

    renderizarTela();
    await act(async () => {});

    expect(screen.getByText(/API está no ar/i)).toBeInTheDocument();
  });

});
