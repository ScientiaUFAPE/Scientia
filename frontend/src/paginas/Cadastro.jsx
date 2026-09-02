import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import lockup from '../assets/lockup-horizontal.png';
import * as cursoService from '../servicos/cursoService.js';
import { ROTULOS_VINCULO } from '../utils/acervo.js';

const DADOS_INICIAIS = {
  tipo: 'aluno',
  nome: '',
  email: '',
  senha: '',
  matricula: '',
  idCurso: '',
  numeroLattes: '',
  vinculo: 'docente',
};

export function Cadastro() {
  const { usuario, registrar } = useAuth();
  const navegar = useNavigate();

  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [cursos, setCursos] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cursoService
      .listar()
      .then((resposta) => setCursos(resposta.cursos))
      .catch(() => setCursos([]));
  }, []);

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  function alterar(evento) {
    const { name, value } = evento.target;
    setDados((anterior) => ({ ...anterior, [name]: value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);

    const dadosDoCadastro =
      dados.tipo === 'aluno'
        ? {
            tipo: 'aluno',
            nome: dados.nome,
            email: dados.email,
            senha: dados.senha,
            matricula: dados.matricula,
            idCurso: dados.idCurso,
          }
        : {
            tipo: 'pesquisador',
            nome: dados.nome,
            email: dados.email,
            senha: dados.senha,
            numeroLattes: dados.numeroLattes,
            vinculo: dados.vinculo,
          };

    try {
      await registrar(dadosDoCadastro);
      navegar('/', { replace: true });
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  }

  return (
    <div className="tela-auth">
      <form className="cartao-auth" onSubmit={enviar}>
        <img className="cartao-auth__marca" src={lockup} alt="Scientia — Hub de Produção Científica do BCC" />
        <h1 className="cartao-auth__titulo">Criar conta</h1>
        <p className="cartao-auth__subtitulo">
          Preencha os dados abaixo para começar a usar o sistema.
        </p>

        {erro && <p className="alerta alerta--erro">{erro}</p>}

        <label className="campo">
          <span>Tipo de conta</span>
          <select name="tipo" value={dados.tipo} onChange={alterar}>
            <option value="aluno">Aluno - consulta o acervo do curso</option>
            <option value="pesquisador">Pesquisador - publica produções científicas</option>
          </select>
        </label>

        <label className="campo">
          <span>Nome</span>
          <input
            type="text"
            name="nome"
            value={dados.nome}
            onChange={alterar}
            placeholder="Como você quer ser identificado"
            required
          />
        </label>

        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            name="email"
            value={dados.email}
            onChange={alterar}
            placeholder="voce@ufape.br"
            autoComplete="email"
            required
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            name="senha"
            value={dados.senha}
            onChange={alterar}
            placeholder="No mínimo 6 caracteres"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        {dados.tipo === 'aluno' ? (
          <>
            <label className="campo">
              <span>Matrícula</span>
              <input
                type="text"
                name="matricula"
                value={dados.matricula}
                onChange={alterar}
                placeholder="Número da matrícula"
                required
              />
            </label>

            <label className="campo">
              <span>Curso</span>
              <select name="idCurso" value={dados.idCurso} onChange={alterar} required>
                <option value="">Selecione um curso</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="campo">
              <span>Número Lattes</span>
              <input
                type="text"
                name="numeroLattes"
                value={dados.numeroLattes}
                onChange={alterar}
                placeholder="Identificador do currículo Lattes"
                required
              />
            </label>

            <label className="campo">
              <span>Vínculo</span>
              <select name="vinculo" value={dados.vinculo} onChange={alterar}>
                {Object.entries(ROTULOS_VINCULO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Cadastrando...' : 'Cadastrar'}
        </button>

        <p className="cartao-auth__rodape">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
