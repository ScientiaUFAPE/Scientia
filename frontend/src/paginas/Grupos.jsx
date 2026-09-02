import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { BuscaAlta, IconeLinkExterno, SeloSigla, useAtalhoBusca } from '../componentes/Exploracao.jsx';
import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as grupoService from '../servicos/grupoService.js';
import { iniciaisDoNome, podeCadastrarNoAcervo, POR_PAGINA } from '../utils/acervo.js';

const ORDENS = [
  ['projetos', 'Mais projetos'],
  ['membros', 'Mais membros'],
  ['recentes', 'Mais recentes'],
  ['nome', 'A–Z'],
];

export function Grupos() {
  const { usuario, token } = useAuth();
  const [grupos, setGrupos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [ordem, setOrdem] = useState('projetos');
  const [pagina, setPagina] = useState(1);
  const campoBusca = useRef(null);

  useAtalhoBusca(campoBusca);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBuscaAplicada(busca);
      setPagina(1);
    }, 400);
    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro('');
    grupoService
      .listar({ busca: buscaAplicada, ordem, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) return;
        setGrupos(dados.grupos);
        setPaginacao(dados.paginacao);
        setResumo(dados.resumo ?? null);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));
    return () => { atual = false; };
  }, [buscaAplicada, ordem, pagina]);

  async function excluirGrupo(grupo) {
    if (!window.confirm(`Excluir o grupo "${grupo.nome}"?`)) return;
    try {
      await grupoService.excluir(grupo.id, token);
      setGrupos((atuais) => atuais.filter((item) => item.id !== grupo.id));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-acervo">
        <h1 className="pagina__titulo">Grupos de pesquisa</h1>
        {resumo && <span className="cabecalho-acervo__resumo">{resumoGrupos(resumo)}</span>}
        {podeCadastrarNoAcervo(usuario) && (
          <Link to="/grupos/cadastro" className="botao botao--primario botao--compacto cabecalho-acervo__acao">
            Cadastrar grupo
          </Link>
        )}
      </div>

      <BuscaAlta
        referencia={campoBusca}
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar por nome do grupo ou líder"
        rotulo="Buscar grupos"
      />

      <div className="filtros-pilulas">
        <span className="filtros-pilulas__rotulo">Ordenar por</span>
        {ORDENS.map(([valor, rotulo]) => (
          <button
            type="button"
            className="pilula"
            aria-pressed={ordem === valor}
            onClick={() => { setOrdem(valor); setPagina(1); }}
            key={valor}
          >
            {rotulo}
          </button>
        ))}
        {paginacao && <span className="filtros-pilulas__resumo">{paginacao.total} resultados</span>}
      </div>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando grupos...</p>}
      {!carregando && !erro && grupos.length === 0 && (
        <div className="aviso-central"><p>Nenhum grupo corresponde à busca.</p></div>
      )}

      {!carregando && !erro && grupos.length > 0 && (
        <ul className="lista-acervo">
          {grupos.map((grupo) => (
            <li key={grupo.id} className="linha-acervo linha-acervo--navega linha-grupo">
              <SeloSigla>{siglaGrupo(grupo.nome)}</SeloSigla>
              <span className="linha-exploracao__corpo">
                <Link className="linha-exploracao__titulo linha-acervo__alvo" to={`/grupos/${grupo.id}`}>
                  {grupo.nome}
                </Link>
                <span className="linha-exploracao__subtitulo">
                  Desde {grupo.anoCriacao}{grupo.lider ? ` · liderado por ${grupo.lider}` : ''}
                </span>
              </span>

              <span className="linha-grupo__projetos">
                <span className="barra-progresso" aria-hidden="true">
                  <span style={{ width: percentual(grupo.totalProjetos, resumo?.maiorTotalProjetos) }} />
                </span>
                <span>{plural(grupo.totalProjetos, 'projeto', 'projetos')}</span>
              </span>

              <span className="linha-grupo__membros">
                <span className="pilha-autores">
                  {(grupo.membrosPrevia ?? []).map((membro) => (
                    <span className="avatar" title={membro.nome} key={membro.id}>{iniciaisDoNome(membro.nome)}</span>
                  ))}
                </span>
                <span>{grupo.totalMembros}</span>
              </span>

              {grupo.linkDgp && (
                <a className="acao-icone" href={grupo.linkDgp} target="_blank" rel="noopener noreferrer" aria-label="Perfil no Diretório de Grupos" title="Perfil no Diretório de Grupos">
                  <IconeLinkExterno />
                </a>
              )}

              {podeCadastrarNoAcervo(usuario) && (
                <span className="linha-acervo__acoes linha-acervo__acoes--gestao">
                  <Link className="botao botao--discreto" to={`/grupos/${grupo.id}/editar`}>Editar</Link>
                  <button type="button" className="botao botao--discreto" onClick={() => excluirGrupo(grupo)}>Excluir</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}
    </section>
  );
}

function siglaGrupo(nome = '') {
  return nome
    .replace(/^(Grupo de Pesquisa em|Núcleo de Estudos em|Laboratório de Pesquisa em)\s/, '')
    .split(/\s+/)
    .filter((parte) => parte.length > 2)
    .map((parte) => parte[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function percentual(valor = 0, maximo = 0) {
  return `${maximo > 0 ? Math.round((valor / maximo) * 100) : 0}%`;
}

function plural(total = 0, singular, pluralizado) {
  return `${total} ${total === 1 ? singular : pluralizado}`;
}

function resumoGrupos(resumo) {
  return `${plural(resumo.totalGrupos, 'grupo', 'grupos')} · ${plural(resumo.totalProjetos, 'projeto', 'projetos')} · ${plural(resumo.totalMembros, 'membro', 'membros')}`;
}
