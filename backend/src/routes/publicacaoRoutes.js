import { Router } from 'express';

import * as publicacaoController from '../controllers/publicacaoController.js';
import { exigeTipo } from '../middlewares/autorizacao.js';

const rotas = Router();

rotas.get('/', publicacaoController.listar);
rotas.post('/', exigeTipo('pesquisador', 'admin'), publicacaoController.cadastrar);
rotas.get('/:id', publicacaoController.detalhar);
rotas.get('/:id/relacionadas', publicacaoController.relacionadas);
rotas.put('/:id', exigeTipo('pesquisador', 'admin'), publicacaoController.atualizar);
rotas.delete('/:id', exigeTipo('pesquisador', 'admin'), publicacaoController.excluir);

export default rotas;
