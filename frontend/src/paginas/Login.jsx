import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import lockup from '../assets/lockup-horizontal.png';

export function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      await entrar(email, senha);
      // Se o guard interrompeu o caminho do usuário, devolvemos ele para lá.
      navegar(local.state?.destino ?? '/', { replace: true });
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  }

  return (
    <div className="tela-auth">
      <form className="cartao-auth" onSubmit={enviar}>
        <img className="cartao-auth__marca" src={lockup} alt="Scientia — Hub de Produção Científica do BCC" />
        <h1 className="cartao-auth__titulo">Entrar</h1>
        <p className="cartao-auth__subtitulo">
          Acesse com sua conta para usar as áreas restritas do hub.
        </p>

        {erro && <p className="alerta alerta--erro">{erro}</p>}

        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="voce@ufape.br"
            autoComplete="email"
            required
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="cartao-auth__rodape">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>

        <p className="cartao-auth__rodape">
          Só quer consultar? <Link to="/publicacoes">Veja o acervo</Link>
        </p>
      </form>
    </div>
  );
}
