import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './componentes/Layout.jsx';
import { RotaProtegida } from './componentes/RotaProtegida.jsx';
import { Cadastro } from './paginas/Cadastro.jsx';
import { CadastroProjeto } from './paginas/CadastroProjeto.jsx';
import { CadastroPublicacao } from './paginas/CadastroPublicacao.jsx';
import { Candidaturas } from './paginas/Candidaturas.jsx';
import { DetalheGrupo } from './paginas/DetalheGrupo.jsx';
import { DetalheProjeto } from './paginas/DetalheProjeto.jsx';
import { DetalhePublicacao } from './paginas/DetalhePublicacao.jsx';
import { EditarProjeto } from './paginas/EditarProjeto.jsx';
import { EditarPublicacao } from './paginas/EditarPublicacao.jsx';
import { Grupos } from './paginas/Grupos.jsx';
import { IndicadoresProducoes } from './paginas/IndicadoresProducoes.jsx';
import { FormularioGrupo } from './paginas/FormularioGrupo.jsx';
import { FormularioVaga } from './paginas/FormularioVaga.jsx';
import { Login } from './paginas/Login.jsx';
import { Painel } from './paginas/Painel.jsx';
import { PerfilPesquisador } from './paginas/PerfilPesquisador.jsx';
import { Projetos } from './paginas/Projetos.jsx';
import { Publicacoes } from './paginas/Publicacoes.jsx';
import { Relatorios } from './paginas/Relatorios.jsx';
import { SemPermissao } from './paginas/SemPermissao.jsx';
import { Usuarios } from './paginas/Usuarios.jsx';
import { Vagas } from './paginas/Vagas.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />

      <Route element={<Layout />}>
        <Route path="/publicacoes" element={<Publicacoes />} />
        <Route path="/projetos" element={<Projetos />} />
        <Route path="/projetos/:id" element={<DetalheProjeto />} />
        <Route path="/grupos" element={<Grupos />} />
        <Route path="/grupos/:id" element={<DetalheGrupo />} />
        <Route path="/pesquisadores/:id" element={<PerfilPesquisador />} />
        <Route path="/vagas" element={<Vagas />} />
        <Route path="/relatorios" element={<Relatorios />} />
      </Route>

      {/* Daqui para baixo tudo exige sessão; a rota de usuários pede também o
          tipo admin, com um segundo guard por dentro. */}
      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/painel" element={<Painel />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />
          <Route path="/candidaturas" element={<Candidaturas />} />
          <Route path="/indicadores" element={<IndicadoresProducoes />} />
          <Route path="/publicacoes/:id" element={<DetalhePublicacao />} />

          <Route element={<RotaProtegida tipos={['pesquisador', 'admin']} />}>
            <Route path="/publicacoes/cadastro" element={<CadastroPublicacao />} />
            <Route path="/projetos/cadastro" element={<CadastroProjeto />} />
            <Route path="/projetos/:id/editar" element={<EditarProjeto />} />
            <Route path="/publicacoes/:id/editar" element={<EditarPublicacao />} />
            <Route path="/grupos/cadastro" element={<FormularioGrupo />} />
            <Route path="/grupos/:id/editar" element={<FormularioGrupo />} />
            <Route path="/vagas/cadastro" element={<FormularioVaga />} />
            <Route path="/vagas/:id/editar" element={<FormularioVaga />} />
          </Route>

          <Route element={<RotaProtegida tipos={['admin']} />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/publicacoes" replace />} />
    </Routes>
  );
}
