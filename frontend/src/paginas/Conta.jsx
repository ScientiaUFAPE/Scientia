import { Link } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import { podeCadastrarNoAcervo } from '../utils/acervo.js';

export function Conta() {
  const { usuario } = useAuth();

  return (
    <section className="conta">
      <h1 className="pagina__titulo">Conta</h1>
      <p className="pagina__descricao">
        Os dados da sua sessão no Scientia e os atalhos que o seu perfil abre.
      </p>

      <div className="cartoes">
        <article className="cartao">
          <h2>Seus dados</h2>
          <dl className="lista-dados">
            <dt>Nome</dt>
            <dd>{usuario.nome}</dd>
            <dt>E-mail</dt>
            <dd>{usuario.email}</dd>
            <dt>Tipo</dt>
            <dd>
              <span className={`etiqueta etiqueta--${usuario.tipo}`}>
                {usuario.tipo}
              </span>
            </dd>
          </dl>
        </article>

        {podeCadastrarNoAcervo(usuario) && (
          <article className="cartao">
            <h2>Alimentar o acervo</h2>
            <p>
              Seu perfil pode registrar produções no acervo relacional do curso.
            </p>
            <div className="conta__atalhos">
              <Link to="/publicacoes/cadastro" className="botao botao--discreto">
                Cadastrar publicação
              </Link>
              <Link to="/projetos/cadastro" className="botao botao--discreto">
                Cadastrar projeto
              </Link>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
