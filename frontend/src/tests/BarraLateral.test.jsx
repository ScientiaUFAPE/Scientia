import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarraLateral } from '../componentes/BarraLateral.jsx';

const sessaoFalsa = { usuario: null, sair: vi.fn() };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

function renderizarBarra() {
  return render(
    <MemoryRouter>
      <BarraLateral />
    </MemoryRouter>,
  );
}

function abrirMais() {
  fireEvent.click(screen.getByRole('button', { name: 'Mais' }));
}

describe('Barra lateral do hub', () => {
  beforeEach(() => {
    sessaoFalsa.usuario = null;
    localStorage.clear();
  });

  it('sem sessão, mostra os links do acervo e o convite para entrar', () => {
    renderizarBarra();

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Publicações' })).toHaveAttribute(
      'href',
      '/publicacoes',
    );
    expect(screen.getByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projetos');
    expect(screen.getByRole('link', { name: 'Grupos' })).toHaveAttribute('href', '/grupos');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mais' })).not.toBeInTheDocument();
  });

  it('com sessão de admin, o "Mais" guarda conta, candidaturas e usuários', () => {
    sessaoFalsa.usuario = { id: 1, nome: 'Ana Souza', email: 'ana@ufape.edu.br', tipo: 'admin' };

    renderizarBarra();

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Conta/ })).not.toBeInTheDocument();

    abrirMais();

    expect(screen.getByRole('link', { name: /Conta/ })).toHaveAttribute('href', '/conta');
    expect(screen.getByRole('link', { name: /Usuários/ })).toHaveAttribute('href', '/usuarios');
    expect(screen.getByRole('link', { name: /Candidaturas/ })).toHaveAttribute(
      'href',
      '/candidaturas',
    );
  });

  it('com sessão de aluno, esconde o link de usuários', () => {
    sessaoFalsa.usuario = { id: 2, nome: 'Bruno Lima', email: 'bruno@ufape.edu.br', tipo: 'aluno' };

    renderizarBarra();
    abrirMais();

    expect(screen.queryByRole('link', { name: /Usuários/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conta/ })).toBeInTheDocument();
  });

  it('fixar promove o item para o menu e desafixar devolve para o "Mais"', () => {
    sessaoFalsa.usuario = { id: 2, nome: 'Bruno Lima', email: 'bruno@ufape.edu.br', tipo: 'aluno' };

    renderizarBarra();
    abrirMais();

    const linkConta = screen.getByRole('link', { name: /Conta/ });
    fireEvent.click(within(linkConta).getByRole('button', { name: 'Fixar no menu' }));

    expect(JSON.parse(localStorage.getItem('scientia:itens-fixados'))).toContain('/conta');
    expect(screen.getAllByRole('link', { name: /Conta/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Desafixar do menu' }));

    expect(JSON.parse(localStorage.getItem('scientia:itens-fixados'))).toEqual([]);
    expect(screen.getAllByRole('link', { name: /Conta/ })).toHaveLength(1);
  });

  it.each(['pesquisador', 'admin'])('a conta %s ganha o atalho de cadastro', (tipo) => {
    sessaoFalsa.usuario = { id: 7, nome: 'Ana Souza', email: 'ana@ufape.edu.br', tipo };

    renderizarBarra();

    expect(screen.getByRole('link', { name: 'Cadastrar' })).toHaveAttribute(
      'href',
      '/publicacoes/cadastro',
    );
  });

  it('conta de aluno não recebe o atalho de cadastro nem o convite para entrar', () => {
    sessaoFalsa.usuario = { id: 2, nome: 'Bruno Lima', email: 'bruno@ufape.edu.br', tipo: 'aluno' };

    renderizarBarra();

    expect(screen.queryByRole('link', { name: 'Cadastrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
