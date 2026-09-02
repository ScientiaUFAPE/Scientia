import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Conta } from '../paginas/Conta.jsx';

const sessaoFalsa = { usuario: null };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

function renderizarTela(tipo) {
  sessaoFalsa.usuario = {
    id: 152,
    nome: 'Ana Souza',
    email: 'ana@ufape.edu.br',
    tipo,
    criadoEm: '2026-08-19T12:00:00.000Z',
  };

  return render(
    <MemoryRouter>
      <Conta />
    </MemoryRouter>,
  );
}

describe('Conta', () => {
  beforeEach(() => {
    sessaoFalsa.usuario = null;
  });

  it('para o aluno, mostra os dados da sessão sem os atalhos de escrita no acervo', () => {
    renderizarTela('aluno');

    expect(screen.getByRole('heading', { name: 'Conta' })).toBeInTheDocument();
    expect(screen.getByText('ana@ufape.edu.br')).toBeInTheDocument();

    expect(screen.queryByText('Alimentar o acervo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /cadastrar publicação/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /cadastrar projeto/i })).not.toBeInTheDocument();
  });

  it.each(['pesquisador', 'admin'])('para a conta %s, mostra os dois atalhos', (tipo) => {
    renderizarTela(tipo);

    expect(screen.getByRole('link', { name: /cadastrar publicação/i })).toHaveAttribute(
      'href',
      '/publicacoes/cadastro',
    );
    expect(screen.getByRole('link', { name: /cadastrar projeto/i })).toHaveAttribute(
      'href',
      '/projetos/cadastro',
    );
  });
});
