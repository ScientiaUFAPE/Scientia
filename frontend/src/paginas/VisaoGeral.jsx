import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as editalService from '../servicos/editalService.js';
import * as publicacaoService from '../servicos/publicacaoService.js';
import * as relatorioService from '../servicos/relatorioService.js';
import * as vagaService from '../servicos/vagaService.js';
import {
  juntarNomes,
  percentualRelativo,
  periodoDosAnos,
  ROTULOS_TIPO,
} from '../utils/acervo.js';

const AREAS_VISIVEIS = 8;
const SEM_PUBLICACOES = { publicacoes: [] };
const SEM_VAGAS = { vagas: [], paginacao: { total: 0 } };
const SEM_EDITAIS = { editais: [] };

export function VisaoGeral({ anoAtual = new Date().getFullYear() }) {
  const [indicadores, setIndicadores] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [vagas, setVagas] = useState([]);
  const [totalVagas, setTotalVagas] = useState(0);
  const [editais, setEditais] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let atual = true;

    relatorioService
      .obterIndicadoresProducoes()
      .then((dados) => atual && setIndicadores(dados.indicadores))
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    publicacaoService
      .listar({ pagina: 1, porPagina: 5 })
      .catch(() => SEM_PUBLICACOES)
      .then((dados) => atual && setRecentes(dados.publicacoes));

    vagaService
      .listar({ status: 'aberta', pagina: 1, porPagina: 5 })
      .catch(() => SEM_VAGAS)
      .then((dados) => {
        if (!atual) {
          return;
        }

        setVagas(dados.vagas);
        setTotalVagas(dados.paginacao.total);
      });

    editalService
      .listar()
      .catch(() => SEM_EDITAIS)
      .then((dados) => {
        if (!atual) {
          return;
        }

        setEditais(dados.editais.filter((edital) => edital.ano === anoAtual));
      });

    return () => {
      atual = false;
    };
  }, [anoAtual]);

  if (carregando) {
    return <p className="aviso-carregando">Carregando a visão geral...</p>;
  }

  return (
    <section className="visao-geral">
      <p className="rotulo">Panorama · {anoAtual}</p>

      {erro && <p className="alerta alerta--erro">{erro}</p>}

      {indicadores && (
        <Sintese
          indicadores={indicadores}
          totalVagas={totalVagas}
          totalEditais={editais.length}
          anoAtual={anoAtual}
        />
      )}

      {indicadores && indicadores.totalProducoes > 0 && (
        <div className="editorial">
          <Ranking indicadores={indicadores} />
          <Apoio indicadores={indicadores} />
        </div>
      )}

      <div className="colunas">
        <Recentes publicacoes={recentes} />
        <Agora
          vagas={vagas}
          totalVagas={totalVagas}
          editais={editais}
          anoAtual={anoAtual}
        />
      </div>
    </section>
  );
}

function Sintese({ indicadores, totalVagas, totalEditais, anoAtual }) {
  if (indicadores.totalProducoes === 0) {
    return (
      <h1 className="sintese">
        O acervo ainda não tem produções científicas cadastradas — e, agora, há{' '}
        <b>{contarVagas(totalVagas)}</b> {totalVagas === 1 ? 'aberta' : 'abertas'} e{' '}
        <b>{contarEditais(totalEditais)}</b> de {anoAtual}.
      </h1>
    );

  }

  const destaques = indicadores.areasDestaque.map((area) => area.nome);

  return (
    <h1 className="sintese">
      São <b>{indicadores.totalProducoes} produções</b> científicas no acervo, cobrindo{' '}
      <b>{periodoDosAnos(indicadores.porAno)}</b>
      {destaques.length > 0 && (
        <>
          , com <b>{juntarNomes(destaques)}</b>{' '}
          {destaques.length > 1 ? 'empatadas na liderança' : 'na liderança'}
        </>
      )}{' '}
      — e, agora, <b>{contarVagas(totalVagas)}</b> {totalVagas === 1 ? 'aberta' : 'abertas'} e{' '}
      <b>{contarEditais(totalEditais)}</b> de {anoAtual}.
    </h1>
  );
}

function Ranking({ indicadores }) {
  const [todas, setTodas] = useState(false);
  const maior = Math.max(...indicadores.porArea.map((area) => area.quantidade), 0);
  const destaques = indicadores.areasDestaque.map((area) => area.idArea);
  const total = indicadores.porArea.length;
  const areas = todas ? indicadores.porArea : indicadores.porArea.slice(0, AREAS_VISIVEIS);

  return (
    <section>
      <div className="secao__topo">
        <span className="rotulo">Áreas de pesquisa</span>
        <span className="secao__extra">
          {total} {total === 1 ? 'área' : 'áreas'} · {indicadores.totalProducoes} produções
        </span>
      </div>

      <div className="ranking">
        {areas.map((area) => (
          <div className="rank" key={area.idArea}>
            <span className="rank__nome">{area.nome}</span>
            <span className="rank__trilha">
              <span
                className="rank__barra"
                style={{ width: `${percentualRelativo(area.quantidade, maior)}%` }}
              />
            </span>
            <span className="rank__conta">{area.quantidade}</span>
            <span className="rank__destaque">
              {destaques.includes(area.idArea) ? 'destaque' : ''}
            </span>
          </div>
        ))}
      </div>

      {total > AREAS_VISIVEIS && (
        <button className="ligacao ranking__mais" type="button" onClick={() => setTodas(!todas)}>
          {todas ? 'Mostrar menos' : `Ver todas as ${total} áreas`}
        </button>
      )}
    </section>
  );
}

function Apoio({ indicadores }) {
  const maiorAno = Math.max(...indicadores.porAno.map((item) => item.quantidade), 0);
  const maiorTipo = Math.max(...indicadores.porTipo.map((item) => item.quantidade), 0);
  const primeiroAno = indicadores.porAno[0]?.ano;
  const ultimoAno = indicadores.porAno[indicadores.porAno.length - 1]?.ano;
  const pico = anoDePico(indicadores.porAno);

  return (
    <aside className="apoio">
      <section>
        <div className="secao__topo">
          <span className="rotulo">Por ano</span>
        </div>

        <div className="mini">
          {indicadores.porAno.map((item) => (
            <span className="mini__col" key={item.ano} title={`${item.ano}: ${item.quantidade}`}>
              <span
                className="mini__barra"
                style={{ height: `${percentualRelativo(item.quantidade, maiorAno)}%` }}
              />
            </span>
          ))}
        </div>

        <div className="mini__eixo">
          <span>{primeiroAno}</span>
          <span>{ultimoAno}</span>
        </div>

        {pico && (
          <p className="mini__nota">
            Pico em {pico.ano}, com {pico.quantidade}{' '}
            {pico.quantidade === 1 ? 'registro' : 'registros'}.
          </p>
        )}
      </section>

      <section>
        <div className="secao__topo">
          <span className="rotulo">Por tipo</span>
        </div>

        <div className="tipos">
          {indicadores.porTipo.map((item) => (
            <div className="tipo-linha" key={item.tipo}>
              <span className="tipo-nome">{ROTULOS_TIPO[item.tipo] ?? item.tipo}</span>
              <span className="tipo-trilha">
                <span
                  className="tipo-barra"
                  style={{ width: `${percentualRelativo(item.quantidade, maiorTipo)}%` }}
                />
              </span>
              <span className="tipo-conta">{item.quantidade}</span>
            </div>
          ))}
        </div>
      </section>

      <Link className="ligacao" to="/relatorios">
        Relatórios completos
      </Link>
    </aside>
  );
}

function Recentes({ publicacoes }) {
  return (
    <section>
      <div className="secao__topo">
        <span className="rotulo">Recentes</span>
        <Link className="secao__extra ligacao" to="/publicacoes">
          Ver todas as publicações
        </Link>
      </div>

      {publicacoes.length === 0 ? (
        <p className="secao__vazio">Nenhuma publicação cadastrada ainda.</p>
      ) : (
        <ul className="lista-acervo">
          {publicacoes.map((publicacao) => (
            <li
              className="linha-acervo linha-acervo--dupla linha-acervo--navega"
              key={publicacao.id}
            >
              <span className="linha-acervo__corpo">
                <Link
                  className="linha-acervo__alvo linha-acervo__titulo"
                  to={`/publicacoes/${publicacao.id}`}
                >
                  {publicacao.titulo}
                </Link>
                <span className="linha-acervo__resumo">
                  {ROTULOS_TIPO[publicacao.tipo] ?? publicacao.tipo} · {publicacao.ano}
                  {publicacao.areas?.[0] && ` · ${publicacao.areas[0].nome}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Agora({ vagas, totalVagas, editais, anoAtual }) {
  const vazio = vagas.length === 0 && editais.length === 0;

  return (
    <section>
      <div className="secao__topo">
        <span className="ponto-acento" />
        <span className="rotulo">Agora</span>
        <span className="secao__extra">
          {contarVagas(totalVagas)} {totalVagas === 1 ? 'aberta' : 'abertas'} ·{' '}
          {contarEditais(editais.length)} de {anoAtual}
        </span>
      </div>

      {vazio ? (
        <p className="secao__vazio">Nenhuma vaga aberta nem edital deste ano.</p>
      ) : (
        <ul className="lista-acervo">
          {vagas.map((vaga) => (
            <li className="linha-acervo linha-acervo--dupla" key={`vaga-${vaga.id}`}>
              <span className="linha-acervo__corpo">
                <span className="linha-acervo__titulo">{vaga.titulo}</span>
                <span className="linha-acervo__resumo">
                  <Link to={`/projetos/${vaga.projeto.id}`}>{vaga.projeto.titulo}</Link>
                </span>
              </span>
              <span className="linha-acervo__meta">
                {vaga.qtdVagas} {vaga.qtdVagas === 1 ? 'vaga' : 'vagas'}
              </span>
            </li>
          ))}

          {editais.map((edital) => (
            <li className="linha-acervo linha-acervo--dupla" key={`edital-${edital.id}`}>
              <span className="linha-acervo__corpo">
                <span className="linha-acervo__titulo">{edital.nome}</span>
                <span className="linha-acervo__resumo">Edital · {edital.ano}</span>
              </span>
              <span className="linha-acervo__meta">
                {edital.totalProjetos ?? 0}{' '}
                {edital.totalProjetos === 1 ? 'projeto' : 'projetos'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function anoDePico(porAno) {
  return porAno.reduce((pico, item) => {
    if (!pico || item.quantidade > pico.quantidade) {
      return item;
    }

    return item.quantidade === pico.quantidade && item.ano > pico.ano ? item : pico;
  }, null);
}

function contarVagas(total) {
  return `${total} ${total === 1 ? 'vaga' : 'vagas'}`;
}

function contarEditais(total) {
  return `${total} ${total === 1 ? 'edital' : 'editais'}`;
}
