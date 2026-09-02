import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { BuscaAlta, CabecalhoGrupo, SeletorPilula, SeloSigla, useAtalhoBusca } from '../componentes/Exploracao.jsx';
import { PainelRapido } from '../componentes/PainelRapido.jsx';
import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as areaService from '../servicos/areaService.js';
import * as grupoService from '../servicos/grupoService.js';
import * as projetoService from '../servicos/projetoService.js';
import * as vagaService from '../servicos/vagaService.js';
import { iniciaisDoNome, podeCadastrarNoAcervo, POR_PAGINA, ROTULOS_STATUS, siglaDaArea } from '../utils/acervo.js';

const STATUS = [
  ['em_andamento', 'Em andamento', '#09d0c9'],
  ['planejado', 'Planejados', '#c9c9cd'],
  ['concluido', 'Concluídos', '#1b2331'],
  ['cancelado', 'Cancelados', '#b3261e'],
];

export function Projetos() {
  const { usuario, token } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [idGrupo, setIdGrupo] = useState('');
  const [idArea, setIdArea] = useState('');
  const [pagina, setPagina] = useState(1);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [vagasAbertas, setVagasAbertas] = useState(null);
  const campoBusca = useRef(null);

  useAtalhoBusca(campoBusca);

  useEffect(() => {
    let atual = true;
    grupoService.listar({ porPagina: 100 }).then((dados) => atual && setGrupos(dados.grupos)).catch(() => {});
    areaService.listar().then((dados) => atual && setAreas(dados.areas)).catch(() => {});
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
    projetoService
      .listar({ busca: buscaAplicada, status, idGrupo, idArea, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) return;
        setProjetos(dados.projetos);
        setPaginacao(dados.paginacao);
        setResumo(dados.resumo ?? null);
        if (selecionado && !dados.projetos.some((projeto) => projeto.id === selecionado.id)) {
          setSelecionado(null);
          setDetalhe(null);
          setVagasAbertas(null);
        }
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));
    return () => { atual = false; };
  }, [buscaAplicada, status, idGrupo, idArea, pagina]);

  async function abrirPainel(projeto) {
    setSelecionado(projeto);
    setDetalhe(null);
    setVagasAbertas(null);
    try {
      const [dadosProjeto, dadosVagas] = await Promise.all([
        projetoService.buscarPorId(projeto.id),
        vagaService.listar({ status: 'aberta', idProjeto: projeto.id, pagina: 1, porPagina: 1 }),
      ]);
      setDetalhe(dadosProjeto.projeto);
      setVagasAbertas(dadosVagas.paginacao?.total ?? 0);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function excluirProjeto(projeto) {
    if (!window.confirm(`Excluir o projeto "${projeto.titulo}"? Os registros dependentes serão removidos.`)) return;
    try {
      await projetoService.excluir(projeto.id, token);
      setProjetos((atuais) => atuais.filter((item) => item.id !== projeto.id));
      if (selecionado?.id === projeto.id) setSelecionado(null);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  const agrupados = STATUS
    .map(([tipo, nome, cor]) => ({ tipo, nome, cor, itens: projetos.filter((projeto) => projeto.status === tipo) }))
    .filter((grupo) => grupo.itens.length > 0);
  const filtrosAtivos = Boolean(buscaAplicada.trim() || idGrupo || idArea);

  return (
    <section className="pagina pagina-projetos">
      <div className="cabecalho-acervo">
        <h1 className="pagina__titulo">Projetos de pesquisa</h1>
        {resumo && <span className="cabecalho-acervo__resumo">{resumoProjetos(resumo)}</span>}
        {podeCadastrarNoAcervo(usuario) && (
          <Link to="/projetos/cadastro" className="botao botao--primario botao--compacto cabecalho-acervo__acao">Cadastrar projeto</Link>
        )}
      </div>

      <BuscaAlta referencia={campoBusca} value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar por título, grupo ou área" rotulo="Buscar projetos" />

      <div className="filtros-pilulas">
        <BotaoStatus valor="" rotulo="Todos" status={status} total={resumo?.totalProjetos} aoEscolher={(valor) => { setStatus(valor); setPagina(1); }} />
        {STATUS.map(([valor, rotulo]) => (
          <BotaoStatus key={valor} valor={valor} rotulo={rotulo} status={status} total={totalDoStatus(resumo, valor)} aoEscolher={(novoStatus) => { setStatus(novoStatus); setPagina(1); }} />
        ))}
        <span className="filtros-pilulas__fio" />
        <SeletorPilula rotulo="Grupo" valor={nomeSelecionado(grupos, idGrupo, 'Todos')} value={idGrupo} onChange={(evento) => { setIdGrupo(evento.target.value); setPagina(1); }}>
          <option value="">Todos</option>
          {grupos.map((grupo) => <option value={grupo.id} key={grupo.id}>{grupo.nome}</option>)}
        </SeletorPilula>
        <SeletorPilula rotulo="Área" valor={nomeSelecionado(areas, idArea, 'Todas')} value={idArea} onChange={(evento) => { setIdArea(evento.target.value); setPagina(1); }}>
          <option value="">Todas</option>
          {areas.map((area) => <option value={area.id} key={area.id}>{area.nome}</option>)}
        </SeletorPilula>
        {filtrosAtivos && <button type="button" className="pilula pilula--limpar" onClick={() => { setBusca(''); setIdGrupo(''); setIdArea(''); setPagina(1); }}>Limpar</button>}
        {paginacao && <span className="filtros-pilulas__resumo">{plural(paginacao.total, 'resultado', 'resultados')}</span>}
      </div>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando projetos...</p>}
      {!carregando && !erro && projetos.length === 0 && <div className="aviso-central"><p>Nenhum projeto corresponde aos filtros escolhidos.</p></div>}

      {!carregando && !erro && agrupados.map((grupo) => (
        <section className="grupo-ano" key={grupo.tipo}>
          <CabecalhoGrupo nome={grupo.nome} quantidade={plural(grupo.itens.length, 'projeto', 'projetos')} cor={grupo.cor} />
          <ul className="lista-acervo">
            {grupo.itens.map((projeto) => (
              <li key={projeto.id}>
                <div className="linha-acervo linha-projeto" role="button" tabIndex="0" aria-current={selecionado?.id === projeto.id} onClick={() => abrirPainel(projeto)} onKeyDown={(evento) => abrirComTeclado(evento, () => abrirPainel(projeto))}>
                  <SeloSigla>{siglaDaArea(projeto.areas[0]?.nome) || '—'}</SeloSigla>
                  <span className="linha-exploracao__corpo">
                    <Link className="linha-exploracao__titulo" to={`/projetos/${projeto.id}`} onClick={(evento) => evento.stopPropagation()}>{projeto.titulo}</Link>
                    <Link className="linha-exploracao__subtitulo linha-exploracao__link" to={`/grupos/${projeto.grupo.id}`} onClick={(evento) => evento.stopPropagation()}>{projeto.grupo.nome}</Link>
                  </span>
                  <span className="linha-projeto__periodo">{periodoProjeto(projeto)}</span>
                  <span className="linha-projeto__publicacoes">{plural(projeto.totalPublicacoes, 'publicação', 'publicações')}</span>
                  {podeCadastrarNoAcervo(usuario) && (
                    <span className="linha-acervo__acoes linha-acervo__acoes--gestao" onClick={(evento) => evento.stopPropagation()}>
                      <Link className="botao botao--discreto" to={`/projetos/${projeto.id}/editar`}>Editar</Link>
                      <button type="button" className="botao botao--discreto" onClick={() => excluirProjeto(projeto)}>Excluir</button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}

      {selecionado && (
        <PainelRapido rotulo={`${ROTULOS_STATUS[selecionado.status]} · ${periodoProjeto(selecionado)}`} titulo={selecionado.titulo} fatos={fatosDoProjeto(detalhe, selecionado, vagasAbertas)} paginaCompleta={`/projetos/${selecionado.id}`} aoFechar={() => { setSelecionado(null); setDetalhe(null); setVagasAbertas(null); }} />
      )}
    </section>
  );
}

function BotaoStatus({ valor, rotulo, status, total, aoEscolher }) {
  return <button type="button" className="pilula" aria-label={total === undefined ? rotulo : `${rotulo} ${total}`} aria-pressed={status === valor} onClick={() => aoEscolher(valor)}>{rotulo}{total !== undefined && <span className="pilula__conta">{total}</span>}</button>;
}

function fatosDoProjeto(projeto, resumo, vagasAbertas) {
  if (!projeto) return [{ termo: 'Detalhes', valor: 'Carregando informações do projeto…' }];
  const coordenador = projeto.equipe?.find((pessoa) => pessoa.papel === 'coordenador');
  const participantes = Math.max(0, (projeto.equipe?.length ?? 0) - (coordenador ? 1 : 0));
  return [
    projeto.resumo && { termo: 'Resumo', valor: <span className="painel-projeto__resumo">{projeto.resumo}</span> },
    { termo: 'Grupo', valor: <Link to={`/grupos/${projeto.grupo.id}`}>{projeto.grupo.nome}</Link> },
    coordenador && { termo: 'Coordenação', valor: <span className="painel-projeto__coordenacao"><span className="avatar painel-projeto__avatar">{iniciaisDoNome(coordenador.nome)}</span><span>{coordenador.nome}</span><span className="painel-projeto__equipe">· {plural(participantes, 'participante', 'participantes')}</span></span> },
    { termo: 'Edital', valor: projeto.edital?.nome ?? 'Sem edital vinculado' },
    { termo: 'Áreas', valor: projeto.areas?.length ? <ul className="lista-chips">{projeto.areas.map((area) => <li className="chip" key={area.id}>{area.nome}</li>)}</ul> : 'Nenhuma área vinculada' },
    { termo: 'Saídas', valor: <span className="painel-projeto__saidas"><Link to={`/projetos/${resumo.id}`}>{plural(projeto.publicacoes?.length, 'publicação vinculada', 'publicações vinculadas')}</Link><Link to="/vagas">{vagasAbertas === null ? 'Consultando vagas…' : vagasAbertas ? plural(vagasAbertas, 'vaga aberta', 'vagas abertas') : 'Nenhuma vaga aberta'}</Link></span> },
  ].filter(Boolean);
}

function periodoProjeto(projeto) {
  const inicio = mesAno(projeto.dataInicio);
  if (projeto.dataFim) return `${inicio} – ${mesAno(projeto.dataFim)}`;
  if (projeto.status === 'planejado') return `início em ${inicio}`;
  return `desde ${inicio}`;
}

function mesAno(data) {
  if (!data) return 'não informado';
  const [ano, mes] = data.slice(0, 10).split('-');
  return `${mes}/${ano}`;
}

function totalDoStatus(resumo, status) {
  if (!resumo) return undefined;
  return { em_andamento: resumo.emAndamento, planejado: resumo.planejados, concluido: resumo.concluidos, cancelado: resumo.cancelados }[status];
}

function resumoProjetos(resumo) {
  return `${resumo.totalProjetos} no acervo · ${resumo.emAndamento} em andamento · ${plural(resumo.totalGrupos, 'grupo', 'grupos')}`;
}

function nomeSelecionado(itens, id, padrao) {
  return itens.find((item) => String(item.id) === String(id))?.nome ?? padrao;
}

function plural(total = 0, singular, pluralizado) {
  return `${total} ${total === 1 ? singular : pluralizado}`;
}

function abrirComTeclado(evento, abrir) {
  if (evento.key === 'Enter' || evento.key === ' ') {
    evento.preventDefault();
    abrir();
  }
}
