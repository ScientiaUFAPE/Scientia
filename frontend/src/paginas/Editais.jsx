import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { BuscaAlta, CabecalhoGrupo, SeletorPilula, SeloSigla, useAtalhoBusca } from '../componentes/Exploracao.jsx';
import { PainelRapido } from '../componentes/PainelRapido.jsx';
import * as editalService from '../servicos/editalService.js';
import { ROTULOS_STATUS } from '../utils/acervo.js';

export function Editais({ anoAtual = new Date().getFullYear() }) {
  const [editais, setEditais] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [ano, setAno] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const campoBusca = useRef(null);

  useAtalhoBusca(campoBusca);

  useEffect(() => {
    let atual = true;
    editalService
      .listar({ comProjetos: 1 })
      .then((dados) => atual && setEditais(dados.editais))
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));
    return () => { atual = false; };
  }, []);

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const anos = [...new Set(editais.map((edital) => edital.ano))].sort((a, b) => b - a);
  const comAndamento = editais.filter(temProjetoEmAndamento).length;
  const desteAno = editais.filter((edital) => edital.ano === anoAtual).length;
  const filtrados = editais.filter((edital) => {
    const correspondeBusca = !termo || edital.nome.toLocaleLowerCase('pt-BR').includes(termo)
      || edital.grupos?.some((grupo) => grupo.nome.toLocaleLowerCase('pt-BR').includes(termo));
    const correspondeFiltro = !filtro
      || (filtro === 'andamento' && temProjetoEmAndamento(edital))
      || (filtro === 'ano' && edital.ano === anoAtual);
    return correspondeBusca && correspondeFiltro && (!ano || String(edital.ano) === ano);
  });
  const agrupados = anos
    .map((valor) => ({ ano: valor, itens: filtrados.filter((edital) => edital.ano === valor) }))
    .filter((grupo) => grupo.itens.length > 0);
  const filtrosAtivos = Boolean(termo || filtro || ano);

  return (
    <section className="pagina">
      <div className="cabecalho-acervo">
        <h1 className="pagina__titulo">Editais</h1>
        {editais.length > 0 && <span className="cabecalho-acervo__resumo">{resumoEditais(editais)}</span>}
      </div>

      <BuscaAlta
        referencia={campoBusca}
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar por nome do edital ou grupo"
        rotulo="Buscar editais"
      />

      <div className="filtros-pilulas">
        <button type="button" className="pilula" aria-pressed={filtro === ''} onClick={() => setFiltro('')}>
          Todos <span className="pilula__conta">{editais.length}</span>
        </button>
        <button type="button" className="pilula" aria-pressed={filtro === 'andamento'} onClick={() => setFiltro('andamento')}>
          Com projetos em andamento <span className="pilula__conta">{comAndamento}</span>
        </button>
        <button type="button" className="pilula" aria-pressed={filtro === 'ano'} onClick={() => setFiltro('ano')}>
          Deste ano <span className="pilula__conta">{desteAno}</span>
        </button>
        <span className="filtros-pilulas__fio" />
        <SeletorPilula rotulo="Ano" valor={ano || 'Todos'} value={ano} onChange={(evento) => setAno(evento.target.value)}>
          <option value="">Todos</option>
          {anos.map((valor) => <option value={valor} key={valor}>{valor}</option>)}
        </SeletorPilula>
        {filtrosAtivos && <button type="button" className="pilula pilula--limpar" onClick={() => { setBusca(''); setFiltro(''); setAno(''); }}>Limpar</button>}
        <span className="filtros-pilulas__resumo">{filtrados.length} resultados</span>
      </div>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando editais...</p>}
      {!carregando && !erro && filtrados.length === 0 && <div className="aviso-central"><p>Nenhum edital corresponde aos filtros escolhidos.</p></div>}

      {!carregando && !erro && agrupados.map((grupo) => (
        <section className="grupo-ano" key={grupo.ano}>
          <CabecalhoGrupo nome={grupo.ano} quantidade={plural(grupo.itens.length, 'edital', 'editais')} />
          <ul className="lista-acervo">
            {grupo.itens.map((edital) => (
              <li key={edital.id}>
                <button type="button" className="linha-acervo linha-edital" aria-current={selecionado?.id === edital.id} onClick={() => setSelecionado(edital)}>
                  <SeloSigla>{siglaEdital(edital.nome)}</SeloSigla>
                  <span className="linha-exploracao__corpo">
                    <span className="linha-exploracao__titulo">{edital.nome}</span>
                    <span className="linha-exploracao__subtitulo">{resumoDosGrupos(edital.grupos)}</span>
                  </span>
                  <span className="linha-edital__dado">{plural(edital.totalProjetos, 'projeto', 'projetos')}</span>
                  <span className="linha-edital__dado">{projetosEmAndamento(edital)} em andamento</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {selecionado && (
        <PainelRapido
          rotulo={`Edital · ${selecionado.ano}`}
          titulo={selecionado.nome}
          fatos={fatosDoEdital(selecionado)}
          aoFechar={() => setSelecionado(null)}
        />
      )}
    </section>
  );
}

function fatosDoEdital(edital) {
  return [
    {
      termo: 'Grupos',
      valor: edital.grupos?.length
        ? <ul className="lista-chips">{edital.grupos.map((grupo) => <li className="chip" key={grupo.id}>{grupo.nome}</li>)}</ul>
        : 'Nenhum grupo vinculado.',
    },
    {
      termo: plural(edital.projetos?.length, 'Projeto', 'Projetos'),
      valor: edital.projetos?.length
        ? <ul className="lista-pessoas">{edital.projetos.map((projeto) => (
          <li className="lista-pessoas__item" key={projeto.id}>
            <Link className="lista-pessoas__nome" to={`/projetos/${projeto.id}`}>{projeto.titulo}</Link>
            <span className={`etiqueta etiqueta--situacao etiqueta--${projeto.status}`}>{ROTULOS_STATUS[projeto.status] ?? projeto.status}</span>
          </li>
        ))}</ul>
        : 'Nenhum projeto vinculado.',
    },
  ];
}

function temProjetoEmAndamento(edital) {
  return edital.projetos?.some((projeto) => projeto.status === 'em_andamento');
}

function projetosEmAndamento(edital) {
  return edital.projetos?.filter((projeto) => projeto.status === 'em_andamento').length ?? 0;
}

function resumoDosGrupos(grupos = []) {
  if (!grupos.length) return 'Sem grupos vinculados';
  return grupos.length > 1 ? `${grupos[0].nome} +${grupos.length - 1}` : grupos[0].nome;
}

function siglaEdital(nome = '') {
  return nome.replace(/ nº.*$/, '').split(/\s+/).filter((parte) => parte.length > 2).map((parte) => parte[0]).join('').slice(0, 3).toUpperCase();
}

function plural(total = 0, singular, pluralizado) {
  return `${total} ${total === 1 ? singular : pluralizado}`;
}

function resumoEditais(editais) {
  const anos = editais.map((edital) => edital.ano);
  const periodo = Math.min(...anos) === Math.max(...anos) ? String(anos[0]) : `${Math.min(...anos)}–${Math.max(...anos)}`;
  const projetos = editais.reduce((total, edital) => total + (edital.totalProjetos ?? 0), 0);
  return `${plural(editais.length, 'edital', 'editais')} · ${periodo} · ${plural(projetos, 'projeto financiado', 'projetos financiados')}`;
}
