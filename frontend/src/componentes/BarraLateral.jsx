import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import { iniciaisDoNome, podeCadastrarNoAcervo } from '../utils/acervo.js';
import simbolo from '../assets/scientia-simbolo.svg';

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
  pesquisadores: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></>,
  vagas: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    </>
  ),
  editais: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9.5 12.5h6M9.5 16.5h4" />
    </>
  ),
  relatorios: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  visao: <><circle cx="12" cy="12" r="9" /><path d="M15.6 8.4 13.4 13.4 8.4 15.6l2.2-5Z" /></>,
  conta: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9.5" r="3.2" /><path d="M6.5 19c0.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4" /></>,
  candidaturas: (
    <>
      <path d="M4 7h16" />
      <path d="M7 4v3M17 4v3" />
      <rect x="4" y="7" width="16" height="13" rx="2.5" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4 20c0-3.3 2.6-5.6 6-5.6s6 2.3 6 5.6" />
      <path d="M18 9.5v5M20.5 12h-5" />
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

export const ROTULOS_ROTA = {
  '/': ['Visão geral', 'visao'],
  '/publicacoes': ['Publicações', 'publicacoes'],
  '/projetos': ['Projetos', 'projetos'],
  '/grupos': ['Grupos', 'grupos'],
  '/pesquisadores': ['Pesquisadores', 'pesquisadores'],
  '/vagas': ['Vagas', 'vagas'],
  '/editais': ['Editais', 'editais'],
  '/relatorios': ['Relatórios', 'relatorios'],
  '/conta': ['Conta', 'conta'],
  '/candidaturas': ['Candidaturas', 'candidaturas'],
  '/usuarios': ['Usuários', 'usuarios'],
};

const EXPLORAR = [
  { para: '/publicacoes', rotulo: 'Publicações', icone: 'publicacoes' },
  { para: '/projetos', rotulo: 'Projetos', icone: 'projetos' },
  { para: '/grupos', rotulo: 'Grupos', icone: 'grupos' },
  { para: '/pesquisadores', rotulo: 'Pesquisadores', icone: 'pesquisadores' },
];

export function BarraLateral() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  const participar = [
    { para: '/vagas', rotulo: 'Vagas', icone: 'vagas' },
    { para: '/editais', rotulo: 'Editais', icone: 'editais' },
    usuario && { para: '/candidaturas', rotulo: 'Minhas candidaturas', icone: 'candidaturas' },
  ].filter(Boolean);

  async function encerrarSessao() {
    await sair();
    navegar('/login', { replace: true });
  }

  return (
    <aside className="rail">
      <Link to="/" className="rail__marca">
        <img className="rail__simbolo" src={simbolo} alt="" />
        <span className="rail__nome">Scientia</span>
      </Link>

      {podeCadastrarNoAcervo(usuario) && (
        <div className="rail__acoes">
          <Link to="/publicacoes/cadastro" className="botao botao--primario">
            Cadastrar
          </Link>
        </div>
      )}

      <nav className="rail__menu">
        <NavLink to="/" end>
          <Glifo nome="visao" />
          Visão geral
        </NavLink>

        <span className="rail__grupo">Explorar</span>
        {EXPLORAR.map((item) => (
          <NavLink key={item.para} to={item.para}>
            <Glifo nome={item.icone} />
            {item.rotulo}
          </NavLink>
        ))}

        <span className="rail__grupo">Participar</span>
        {participar.map((item) => (
          <NavLink key={item.para} to={item.para}>
            <Glifo nome={item.icone} />
            {item.rotulo}
          </NavLink>
        ))}
      </nav>

      <div className="rail__pe">
        {usuario ? (
          <>
            {usuario.tipo === 'admin' && (
              <div className="rail__menu">
                <NavLink to="/usuarios">
                  <Glifo nome="usuarios" />
                  Usuários
                </NavLink>
              </div>
            )}

            <div className="rail__rodape">
              <Link className="rail__conta" to="/conta">
                <span className="avatar">{iniciaisDoNome(usuario.nome)}</span>
                <span className="rail__identidade">
                  <strong>{usuario.nome}</strong>
                  <small>{usuario.tipo}</small>
                </span>
              </Link>

              <button type="button" className="rail__sair" title="Sair" onClick={encerrarSessao}>
                <Glifo nome="sair" tamanho={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="rail__acesso">
            <Link to="/login" className="botao botao--primario">
              Entrar
            </Link>
            <Link to="/cadastro" className="botao botao--discreto">
              Cadastrar
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
