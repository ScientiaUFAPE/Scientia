import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { BuscaAlta, CabecalhoGrupo, SeletorPilula, SeloSigla, useAtalhoBusca } from '../componentes/Exploracao.jsx';
import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as projetoService from '../servicos/projetoService.js';
import * as vagaService from '../servicos/vagaService.js';
import { formatarData, podeCadastrarNoAcervo, POR_PAGINA, siglaDaArea } from '../utils/acervo.js';

const STATUS = [
  ['aberta', 'Abertas'],
  ['fechada', 'Fechadas'],
  ['', 'Todas'],
];

export function Vagas() {
  const { usuario, token } = useAuth();
  const [vagas, setVagas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [status, setStatus] = useState('aberta');
  const [idProjeto, setIdProjeto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const campoBusca = useRef(null);

  useAtalhoBusca(campoBusca);

  useEffect(() => {
    let atual = true;
    projetoService.listar({ porPagina: 100 })
      .then((dados) => atual && setProjetos(dados.projetos))
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
    vagaService
      .listar({ busca: buscaAplicada, status, idProjeto, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) return;
        setVagas(dados.vagas);
        setPaginacao(dados.paginacao);
        setResumo(dados.resumo ?? null);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));
    return () => { atual = false; };
  }, [buscaAplicada, status, idProjeto, pagina]);

  async function excluir(vaga) {
    if (!window.confirm(`Excluir a vaga "${vaga.titulo}"? As candidaturas vinculadas também serão removidas.`)) return;
    try {
      await vagaService.excluir(vaga.id, token);
      setVagas((atuais) => atuais.filter((item) => item.id !== vaga.id));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  const agrupadas = ['aberta', 'fechada']
    .map((tipo) => ({ tipo, itens: vagas.filter((vaga) => vaga.status === tipo) }))
    .filter((grupo) => grupo.itens.length > 0);
  const filtrosAtivos = Boolean(buscaAplicada.trim() || idProjeto);

  return (
    <section className="pagina">
      <div className="cabecalho-acervo">
        <h1 className="pagina__titulo">Vagas</h1>
        {resumo && <span className="cabecalho-acervo__resumo">{resumoVagas(resumo)}</span>}
        {podeCadastrarNoAcervo(usuario) && (
          <Link to="/vagas/cadastro" className="botao botao--primario botao--compacto cabecalho-acervo__acao">Cadastrar vaga</Link>
        )}
      </div>

      <BuscaAlta
        referencia={campoBusca}
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar por título, projeto ou requisito"
        rotulo="Buscar vagas"
      />

      <div className="filtros-pilulas">
        {STATUS.map(([valor, rotulo]) => (
          <button type="button" className="pilula" aria-pressed={status === valor} onClick={() => { setStatus(valor); setPagina(1); }} key={rotulo}>
            {rotulo}
            {resumo && <span className="pilula__conta">{valor === 'aberta' ? resumo.abertas : valor === 'fechada' ? resumo.totalVagas - resumo.abertas : resumo.totalVagas}</span>}
          </button>
        ))}
        <span className="filtros-pilulas__fio" />
        <SeletorPilula rotulo="Projeto" valor={nomeDoProjeto(projetos, idProjeto)} value={idProjeto} onChange={(evento) => { setIdProjeto(evento.target.value); setPagina(1); }}>
          <option value="">Todos</option>
          {projetos.map((projeto) => <option value={projeto.id} key={projeto.id}>{projeto.titulo}</option>)}
        </SeletorPilula>
        {filtrosAtivos && (
          <button type="button" className="pilula pilula--limpar" onClick={() => { setBusca(''); setStatus(''); setIdProjeto(''); setPagina(1); }}>Limpar</button>
        )}
        {paginacao && <span className="filtros-pilulas__resumo">{paginacao.total} resultados</span>}
      </div>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando vagas...</p>}
      {!carregando && !erro && vagas.length === 0 && <div className="aviso-central"><p>Nenhuma vaga encontrada.</p></div>}

      {!carregando && !erro && agrupadas.map((grupo) => (
        <section className="grupo-ano" key={grupo.tipo}>
          <CabecalhoGrupo nome={grupo.tipo === 'aberta' ? 'Abertas' : 'Fechadas'} quantidade={plural(grupo.itens.length, 'vaga', 'vagas')} cor={grupo.tipo === 'aberta' ? undefined : '#c9c9cd'} />
          <ul className="lista-acervo">
            {grupo.itens.map((vaga) => (
              <li key={vaga.id} className="linha-acervo linha-acervo--dupla linha-vaga">
                <SeloSigla>{siglaDaArea(vaga.area?.nome)}</SeloSigla>
                <span className="linha-exploracao__corpo">
                  <span className="linha-exploracao__titulo">{vaga.titulo}</span>
                  <Link className="linha-exploracao__subtitulo linha-exploracao__link" to={`/projetos/${vaga.projeto.id}`}>{vaga.projeto.titulo}</Link>
                  <span className="linha-exploracao__subtitulo">Requisitos: {vaga.requisitos || 'não informados'}</span>
                </span>
                <span className="linha-vaga__dado">aberta em {formatarData(vaga.dataAbertura)}</span>
                <span className="linha-vaga__dado">{plural(vaga.totalCandidaturas, 'candidatura', 'candidaturas')}</span>
                <span className="linha-vaga__quantidade">{plural(vaga.qtdVagas, 'vaga', 'vagas')}</span>
                {vaga.status === 'aberta' ? <AcaoCandidatura vaga={vaga} usuario={usuario} /> : <span className="etiqueta etiqueta--fechada">Fechada</span>}
                {podeCadastrarNoAcervo(usuario) && (
                  <span className="linha-acervo__acoes linha-acervo__acoes--gestao">
                    <Link className="botao botao--discreto" to={`/vagas/${vaga.id}/editar`}>Editar</Link>
                    <button className="botao botao--discreto" type="button" onClick={() => excluir(vaga)}>Excluir</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}
    </section>
  );
}

function AcaoCandidatura({ vaga, usuario }) {
  if (usuario?.tipo === 'pesquisador') return null;
  const destinoCandidatura = `/candidaturas?vaga=${vaga.id}`;
  const destino = usuario ? destinoCandidatura : '/login';
  const state = usuario ? undefined : { destino: destinoCandidatura };
  return <Link className="botao botao--discreto botao--linha" to={destino} state={state} title={usuario ? 'Candidatar-se' : 'Entre para se candidatar'}>Candidatar-se</Link>;
}

function nomeDoProjeto(projetos, id) {
  return projetos.find((projeto) => String(projeto.id) === String(id))?.titulo ?? 'Todos';
}

function plural(total = 0, singular, pluralizado) {
  return `${total} ${total === 1 ? singular : pluralizado}`;
}

function resumoVagas(resumo) {
  const desde = resumo.primeiroAno ? ` · ${plural(resumo.totalVagas, 'vaga', 'vagas')} desde ${resumo.primeiroAno}` : '';
  return `${plural(resumo.abertas, 'aberta agora', 'abertas agora')}${desde} · ${plural(resumo.totalCandidaturas, 'candidatura', 'candidaturas')}`;
}
