import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { BuscaAlta, CabecalhoGrupo, IconeLinkExterno, SeletorPilula, useAtalhoBusca } from '../componentes/Exploracao.jsx';
import { Paginacao } from '../componentes/Paginacao.jsx';
import { PainelRapido } from '../componentes/PainelRapido.jsx';
import * as grupoService from '../servicos/grupoService.js';
import * as pesquisadorService from '../servicos/pesquisadorService.js';
import { iniciaisDoNome, POR_PAGINA, ROTULOS_VINCULO } from '../utils/acervo.js';

const VINCULOS = ['docente', 'discente', 'externo'];
const ROTULOS_PLURAIS = { docente: 'Docentes', discente: 'Discentes', externo: 'Externos' };

export function Pesquisadores() {
  const [pesquisadores, setPesquisadores] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [vinculo, setVinculo] = useState('');
  const [idGrupo, setIdGrupo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState(null);
  const campoBusca = useRef(null);

  useAtalhoBusca(campoBusca);

  useEffect(() => {
    let atual = true;
    grupoService.listar({ ordem: 'nome', porPagina: 100 })
      .then((dados) => atual && setGrupos(dados.grupos))
      .catch(() => {});
    return () => { atual = false; };
  }, []);

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
    pesquisadorService
      .listar({ busca: buscaAplicada, vinculo, idGrupo, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) return;
        setPesquisadores(dados.pesquisadores);
        setPaginacao(dados.paginacao);
        setResumo(dados.resumo ?? null);
        setSelecionado(null);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));
    return () => { atual = false; };
  }, [buscaAplicada, vinculo, idGrupo, pagina]);

  function abrirPainel(pesquisador) {
    setSelecionado(pesquisador);
    if (typeof pesquisadorService.obterPorId !== 'function') return;
    pesquisadorService.obterPorId(pesquisador.id)
      .then((detalhe) => setSelecionado((atual) => atual?.id === pesquisador.id ? { ...atual, ...detalhe } : atual))
      .catch(() => {});
  }

  const agrupados = VINCULOS
    .map((tipo) => ({ tipo, itens: pesquisadores.filter((item) => item.vinculo === tipo) }))
    .filter((grupo) => grupo.itens.length > 0);
  const filtrosAtivos = Boolean(buscaAplicada.trim() || vinculo || idGrupo);

  return (
    <section className="pagina">
      <div className="cabecalho-acervo">
        <h1 className="pagina__titulo">Pesquisadores</h1>
        {resumo && (
          <span className="cabecalho-acervo__resumo">
            {plural(resumo.totalPesquisadores, 'pesquisador', 'pesquisadores')} · {plural(resumo.totalAutorias, 'autoria', 'autorias')}
          </span>
        )}
      </div>

      <BuscaAlta
        referencia={campoBusca}
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar por nome ou grupo"
        rotulo="Buscar pesquisadores"
      />

      <div className="filtros-pilulas">
        <button type="button" className="pilula" aria-pressed={vinculo === ''} onClick={() => { setVinculo(''); setPagina(1); }}>
          Todos {resumo && <span className="pilula__conta">{resumo.totalPesquisadores}</span>}
        </button>
        {VINCULOS.map((tipo) => (
          <button type="button" className="pilula" aria-pressed={vinculo === tipo} onClick={() => { setVinculo(tipo); setPagina(1); }} key={tipo}>
            {ROTULOS_VINCULO[tipo]} {resumo && <span className="pilula__conta">{resumo.porVinculo?.[tipo] ?? 0}</span>}
          </button>
        ))}
        <span className="filtros-pilulas__fio" />
        <SeletorPilula
          rotulo="Grupo"
          valor={nomeDoGrupo(grupos, idGrupo)}
          value={idGrupo}
          onChange={(evento) => { setIdGrupo(evento.target.value); setPagina(1); }}
        >
          <option value="">Todos</option>
          {grupos.map((grupo) => <option value={grupo.id} key={grupo.id}>{grupo.nome}</option>)}
        </SeletorPilula>
        {filtrosAtivos && (
          <button type="button" className="pilula pilula--limpar" onClick={() => { setBusca(''); setVinculo(''); setIdGrupo(''); setPagina(1); }}>Limpar</button>
        )}
        {paginacao && <span className="filtros-pilulas__resumo">{paginacao.total} resultados</span>}
      </div>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando pesquisadores...</p>}
      {!carregando && !erro && pesquisadores.length === 0 && (
        <div className="aviso-central"><p>Nenhum pesquisador corresponde aos filtros escolhidos.</p></div>
      )}

      {!carregando && !erro && agrupados.map((grupo) => (
        <section className="grupo-ano" key={grupo.tipo}>
          <CabecalhoGrupo nome={ROTULOS_PLURAIS[grupo.tipo]} quantidade={plural(grupo.itens.length, 'pesquisador', 'pesquisadores')} />
          <ul className="lista-acervo">
            {grupo.itens.map((pesquisador) => (
              <li key={pesquisador.id}>
                <div
                  className="linha-acervo linha-pesquisador"
                  role="button"
                  tabIndex="0"
                  aria-current={selecionado?.id === pesquisador.id}
                  onClick={() => abrirPainel(pesquisador)}
                  onKeyDown={(evento) => abrirComTeclado(evento, () => abrirPainel(pesquisador))}
                >
                  <span className="avatar linha-acervo__avatar">{iniciaisDoNome(pesquisador.nome)}</span>
                  <span className="linha-exploracao__corpo">
                    <span className="linha-exploracao__titulo">{pesquisador.nome}</span>
                    {pesquisador.grupoPrincipal && (
                      <Link className="linha-exploracao__subtitulo" to={`/grupos/${pesquisador.grupoPrincipal.id}`} onClick={(evento) => evento.stopPropagation()}>{pesquisador.grupoPrincipal.nome}</Link>
                    )}
                  </span>
                  <span className="linha-pesquisador__dado">{plural(pesquisador.totalPublicacoes, 'publicação', 'publicações')}</span>
                  <span className="linha-pesquisador__dado">{pesquisador.ultimaPublicacao ? `última em ${pesquisador.ultimaPublicacao}` : 'sem publicações'}</span>
                  {pesquisador.numeroLattes && (
                    <a className="acao-icone" href={`http://lattes.cnpq.br/${pesquisador.numeroLattes}`} target="_blank" rel="noopener noreferrer" title="Currículo Lattes" aria-label={`Currículo Lattes de ${pesquisador.nome}`} onClick={(evento) => evento.stopPropagation()}>
                      <IconeLinkExterno />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}

      {selecionado && (
        <PainelRapido
          rotulo={ROTULOS_VINCULO[selecionado.vinculo] ?? selecionado.vinculo}
          titulo={selecionado.nome}
          avatar={iniciaisDoNome(selecionado.nome)}
          fatos={fatosDoPesquisador(selecionado)}
          paginaCompleta={`/pesquisadores/${selecionado.id}`}
          aoFechar={() => setSelecionado(null)}
        />
      )}
    </section>
  );
}

function fatosDoPesquisador(pesquisador) {
  return [
    pesquisador.numeroLattes && {
      termo: 'Lattes',
      valor: <a className="link-externo" href={`http://lattes.cnpq.br/${pesquisador.numeroLattes}`} target="_blank" rel="noopener noreferrer">{pesquisador.numeroLattes}<IconeLinkExterno /></a>,
    },
    pesquisador.grupos?.length > 0 && {
      termo: 'Grupos',
      valor: <ul className="lista-chips">{pesquisador.grupos.map((grupo) => <li className="chip" key={grupo.id}>{grupo.nome}</li>)}</ul>,
    },
    { termo: 'Publicações', valor: `${plural(pesquisador.totalPublicacoes, 'publicação', 'publicações')}${pesquisador.ultimaPublicacao ? ` · última em ${pesquisador.ultimaPublicacao}` : ''}` },
    pesquisador.areasFrequentes?.length > 0 && {
      termo: 'Áreas mais frequentes',
      valor: <ul className="lista-chips">{pesquisador.areasFrequentes.map((area) => <li className="chip" key={area.id}>{area.nome}</li>)}</ul>,
    },
    pesquisador.projetosEmAndamento?.length > 0 && {
      termo: 'Projetos em andamento',
      valor: <ul className="painel-lista-links">{pesquisador.projetosEmAndamento.map((projeto) => <li key={projeto.id}><Link to={`/projetos/${projeto.id}`}>{projeto.titulo}</Link></li>)}</ul>,
    },
  ].filter(Boolean);
}

function abrirComTeclado(evento, abrir) {
  if (evento.key === 'Enter' || evento.key === ' ') {
    evento.preventDefault();
    abrir();
  }
}

function nomeDoGrupo(grupos, id) {
  return grupos.find((grupo) => String(grupo.id) === String(id))?.nome ?? 'Todos';
}

function plural(total = 0, singular, pluralizado) {
  return `${total} ${total === 1 ? singular : pluralizado}`;
}
