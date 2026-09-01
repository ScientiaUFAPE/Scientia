import { Link } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import { podeCadastrarNoAcervo } from '../utils/acervo.js';

export function Painel() {
  const { usuario } = useAuth();

  return (
    <section className="painel">
      <h1 className="pagina__titulo">Painel</h1>
      <p className="pagina__descricao">
        Você está autenticado no Scientia. Esta tela só é alcançada com um token válido.
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

        <article className="cartao">
          <h2>O que você pode acessar</h2>
          {usuario.tipo === 'admin' ? (
            <p>
              Como administrador, você também tem acesso à{' '}
              <Link to="/usuarios">lista de usuários</Link> do sistema.
            </p>
          ) : (
            <p>
              Seu perfil consulta o <Link to="/publicacoes">acervo do curso</Link>. As telas
              de administração ficam disponíveis apenas para contas do tipo admin.
            </p>
          )}
        </article>

        {podeCadastrarNoAcervo(usuario) && (
          <article className="cartao">
            <h2>Alimentar o acervo</h2>
            <p>
              Seu perfil pode registrar produções no acervo relacional do curso.
            </p>
            <div className="painel__atalhos">
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
