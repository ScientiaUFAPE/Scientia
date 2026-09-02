import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App.jsx';
import { AuthProvider } from './contexto/AuthContext.jsx';
import './estilos/global.css';
import './estilos/indicadores.css';
import './estilos/autenticacao.css';
import './estilos/painel.css';
import './estilos/painel-rapido.css';
import './estilos/publicacoes.css';
import './estilos/projetos.css';
import './estilos/cadastro-acervo.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
