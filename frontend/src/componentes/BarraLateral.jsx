import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import { podeCadastrarNoAcervo } from '../utils/acervo.js';
import simbolo from '../assets/scientia-simbolo.svg';

const CHAVE_FIXADOS = 'scientia:itens-fixados';

const Icone = {
  publicacoes: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  projetos: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  grupos: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M16 8.2a3.2 3.2 0 0 1 0 6" />
      <path d="M18 20c0-2.6-1-4.2-2.6-4.8" />
    </>
  ),
  vagas: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    </>
  ),
  relatorios: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  indicadores: <><path d="M6 20v-6" /><path d="M12 20V8" /><path d="M18 20v-3" /><path d="M22 20H2" /></>,
  painel: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 9h10M7 13h6" /></>,
  candidaturas: (
    <>
      <path d="M4 7h16" />
      <path d="M7 4v3M17 4v3" />
      <rect x="4" y="7" width="16" height="13" rx="2.5" />
    </>
  ),
  usuarios: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></>,
  mais: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.5" cy="12" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  sair: (
    <>
      <path d="M15 5V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" />
      <path d="M19 12H9m10 0-3-3m3 3-3 3" />
    </>
  ),
};

export function Glifo({ nome, tamanho = 18 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      {Icone[nome]}
    </svg>
  );
}

function Alfinete({ fixado }) {
  if (fixado) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 4h6l-1 6 4 3H6l4-3-1-6Z" />
        <path d="M11.4 13h1.2v7h-1.2z" />
      </svg>
    );
  }

  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 4h6l-1 6 4 3H6l4-3-1-6Z" />
      <path d="M12 13v7" />
    </svg>
  );
}

export const ROTULOS_ROTA = {
  '/publicacoes': ['Publicações', 'publicacoes'],
  '/projetos': ['Projetos', 'projetos'],
  '/grupos': ['Grupos', 'grupos'],
  '/vagas': ['Vagas', 'vagas'],
  '/relatorios': ['Relatórios', 'relatorios'],
  '/indicadores': ['Indicadores', 'indicadores'],
  '/painel': ['Painel', 'painel'],
  '/candidaturas': ['Candidaturas', 'candidaturas'],
  '/usuarios': ['Usuários', 'usuarios'],
  '/pesquisadores': ['Pesquisadores', 'grupos'],
};

const MENU_FIXO = [
  { para: '/publicacoes', rotulo: 'Publicações', icone: 'publicacoes' },
  { para: '/projetos', rotulo: 'Projetos', icone: 'projetos' },
  { para: '/grupos', rotulo: 'Grupos', icone: 'grupos' },
  { para: '/vagas', rotulo: 'Vagas', icone: 'vagas' },
  { para: '/relatorios', rotulo: 'Relatórios', icone: 'relatorios' },
];

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';

  return (primeira + ultima).toUpperCase();
}

function lerFixados() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_FIXADOS));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export function BarraLateral() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  const [aberto, setAberto] = useState(false);
  const [fixados, setFixados] = useState(lerFixados);
  const containerMais = useRef(null);

  const menuExtra = [
    usuario && { para: '/indicadores', rotulo: 'Indicadores', icone: 'indicadores' },
    usuario && { para: '/painel', rotulo: 'Painel', icone: 'painel' },
    usuario && { para: '/candidaturas', rotulo: 'Candidaturas', icone: 'candidaturas' },
    usuario?.tipo === 'admin' && { para: '/usuarios', rotulo: 'Usuários', icone: 'usuarios' },
  ].filter(Boolean);

  useEffect(() => {
    localStorage.setItem(CHAVE_FIXADOS, JSON.stringify(fixados));
  }, [fixados]);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }

    function fecharFora(evento) {
      if (!containerMais.current?.contains(evento.target)) {
        setAberto(false);
      }
    }

    document.addEventListener('mousedown', fecharFora);
    return () => document.removeEventListener('mousedown', fecharFora);
  }, [aberto]);

  async function encerrarSessao() {
    await sair();
    navegar('/login', { replace: true });
  }

  function alternarFixado(para) {
    setFixados((atuais) =>
      atuais.includes(para) ? atuais.filter((item) => item !== para) : [...atuais, para],
    );
  }

  const promovidos = menuExtra.filter((item) => fixados.includes(item.para));

  return (
    <aside className="rail">
      <Link to="/publicacoes" className="rail__marca">
        <img className="rail__simbolo" src={simbolo} alt="" />
        <span className="rail__nome">Scientia</span>
      </Link>

      <div className="rail__acoes">
        {podeCadastrarNoAcervo(usuario) ? (
          <Link to="/publicacoes/cadastro" className="botao botao--primario">
            Cadastrar
          </Link>
        ) : (
          !usuario && (
            <Link to="/login" className="botao botao--primario">
              Entrar
            </Link>
          )
        )}
      </div>

      <nav className="rail__menu">
        {[...MENU_FIXO, ...promovidos].map((item) => (
          <NavLink key={item.para} to={item.para}>
            <Glifo nome={item.icone} />
            {item.rotulo}
          </NavLink>
        ))}

        {menuExtra.length > 0 && (
          <div ref={containerMais}>
            <button
              type="button"
              className="rail__mais"
              aria-expanded={aberto}
              onClick={() => setAberto((valor) => !valor)}
            >
              <Glifo nome="mais" />
              Mais
            </button>

            {aberto && (
              <div className="popover">
                {menuExtra.map((item) => {
                  const fixado = fixados.includes(item.para);

                  return (
                    <NavLink key={item.para} to={item.para} onClick={() => setAberto(false)}>
                      <Glifo nome={item.icone} tamanho={17} />
                      {item.rotulo}
                      <button
                        type="button"
                        className={`popover__fixar${fixado ? ' popover__fixar--ativo' : ''}`}
                        title={fixado ? 'Desafixar do menu' : 'Fixar no menu'}
                        onClick={(evento) => {
                          evento.preventDefault();
                          evento.stopPropagation();
                          alternarFixado(item.para);
                        }}
                      >
                        <Alfinete fixado={fixado} />
                      </button>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {usuario && (
        <div className="rail__rodape">
          <span className="avatar">{iniciais(usuario.nome)}</span>
          <span className="rail__conta">
            <strong>{usuario.nome}</strong>
            <small>{usuario.tipo}</small>
          </span>
          <button type="button" className="rail__sair" title="Sair" onClick={encerrarSessao}>
            <Glifo nome="sair" tamanho={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
