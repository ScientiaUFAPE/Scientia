import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PainelRapido } from '../componentes/PainelRapido.jsx';
import * as editalService from '../servicos/editalService.js';
import { ROTULOS_STATUS } from '../utils/acervo.js';

export function Editais() {
  const [editais, setEditais] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [ano, setAno] = useState('');
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    let atual = true;

    editalService
      .listar({ comProjetos: 1 })
      .then((dados) => atual && setEditais(dados.editais))
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, []);

  const anos = [...new Set(editais.map((edital) => edital.ano))].sort((um, outro) => outro - um);
  const termo = busca.trim().toLowerCase();
  const filtrados = editais.filter(
    (edital) =>
      (!ano || String(edital.ano) === ano) &&
      (!termo || edital.nome.toLowerCase().includes(termo)),
  );
  const filtrosAtivos = Boolean(termo || ano);

  return (
    <section>
      <div className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Editais</h1>
          <p className="pagina__descricao">
            Os editais que originaram os projetos de pesquisa do curso.
          </p>
        </div>
      </div>

      <form
        className="filtros-acervo filtros-acervo--duplo"
        onSubmit={(evento) => evento.preventDefault()}
      >
        <label className="campo filtros-acervo__busca">
          <span>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome do edital"
          />
        </label>

        <label className="campo">
          <span>Ano</span>
          <select value={ano} onChange={(evento) => setAno(evento.target.value)}>
            <option value="">Todos</option>
            {anos.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="botao botao--discreto"
          onClick={() => {
            setBusca('');
            setAno('');
          }}
          disabled={!filtrosAtivos}
        >
          Limpar
        </button>
      </form>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando editais...</p>}

      {!carregando && !erro && filtrados.length === 0 && (
        <div className="aviso-central">
          {editais.length === 0 ? (
            <p>Nenhum edital cadastrado até agora.</p>
          ) : (
            <p>Nenhum edital corresponde aos filtros escolhidos.</p>
          )}
        </div>
      )}

      {!carregando && !erro && filtrados.length > 0 && (
        <ul className="lista-acervo">
          {filtrados.map((edital) => (
            <li key={edital.id}>
              <button
                type="button"
                className="linha-acervo"
                aria-current={selecionado?.id === edital.id}
                onClick={() => setSelecionado(edital)}
              >
                <span className="linha-acervo__area">{edital.ano}</span>
                <span className="linha-acervo__titulo">{edital.nome}</span>
                <span className="linha-acervo__grupo">{resumoDosGrupos(edital.grupos)}</span>
                <span className="linha-acervo__meta">{contarProjetos(edital.totalProjetos)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

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
    { termo: 'Ano', valor: edital.ano },
    { termo: 'Grupos', valor: gruposDoEdital(edital.grupos) },
    { termo: 'Projetos', valor: projetosDoEdital(edital.projetos) },
  ];
}

function gruposDoEdital(grupos = []) {
  if (grupos.length === 0) {
    return 'Nenhum grupo vinculado.';
  }

  return (
    <ul className="lista-chips">
      {grupos.map((grupo) => (
        <li className="chip" key={grupo.id}>
          {grupo.nome}
        </li>
      ))}
    </ul>
  );
}

function projetosDoEdital(projetos = []) {
  if (projetos.length === 0) {
    return 'Nenhum projeto vinculado.';
  }

  return (
    <ul className="lista-pessoas">
      {projetos.map((projeto) => (
        <li className="lista-pessoas__item" key={projeto.id}>
          <Link className="lista-pessoas__nome" to={`/projetos/${projeto.id}`}>
            {projeto.titulo}
          </Link>
          <span className={`etiqueta etiqueta--situacao etiqueta--${projeto.status}`}>
            {ROTULOS_STATUS[projeto.status] ?? projeto.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

function resumoDosGrupos(grupos = []) {
  if (grupos.length === 0) {
    return '';
  }

  return grupos.length > 1 ? `${grupos[0].nome} +${grupos.length - 1}` : grupos[0].nome;
}

function contarProjetos(total = 0) {
  return `${total} ${total === 1 ? 'projeto' : 'projetos'}`;
}
