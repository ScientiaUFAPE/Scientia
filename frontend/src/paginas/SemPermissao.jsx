import { Link } from 'react-router-dom';

export function SemPermissao() {
  return (
    <section className="aviso-central">
      <h1 className="pagina__titulo">Acesso negado</h1>
      <p className="pagina__descricao">
        Sua conta está autenticada, mas o papel dela não permite abrir essa página.
      </p>
      <Link className="botao botao--primario" to="/">
        Voltar para a visão geral
      </Link>
    </section>
  );
}
