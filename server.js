const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const upload = multer({ dest: 'uploads/' });
const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(__dirname));

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const businessManagerId = process.env.BUSINESS_MANAGER_ID;

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Endpoint para listar contas (versão fixa)
app.get('/api/accounts', async (req, res) => {
  console.log('[LOG] Recebida requisição para /api/accounts.');
  const accounts = [
    { id: '348456320153271', name: 'Lidere seu Projeto' },
    { id: '655540412948729', name: 'Paparoto' },
  ];
  res.json(accounts);
});

// Endpoint para listar campanhas
app.get('/api/campaigns', async (req, res) => {
  const { accountId } = req.query;
  console.log(`[LOG] Recebida requisição para /api/campaigns com a conta: ${accountId}`);
  
  if (!accountId) {
    console.log('[ERRO] ID da conta não fornecido.');
    return res.status(400).json({ error: 'O ID da conta de anúncios é obrigatório.' });
  }
  try {
    const url = `${BASE_URL}/act_${accountId}/campaigns`;
    const params = { access_token: accessToken, fields: 'id,name,effective_status', limit: 200 };
    
    console.log(`[LOG] Buscando campanhas em: ${url}`);
    const response = await axios.get(url, { params });
    console.log('[LOG] Resposta da API recebida com sucesso.');

    const activeCampaigns = response.data.data.filter(campaign => campaign.effective_status === 'ACTIVE');
    console.log(`[LOG] Encontradas ${activeCampaigns.length} campanhas ativas.`);
    
    res.json(activeCampaigns);
  } catch (error) {
    console.error(`[ERRO] Falha ao buscar campanhas para a conta ${accountId}:`, error.response?.data?.error || error.message);
    res.status(500).json({ error: 'Falha ao buscar campanhas.' });
  }
});

// Endpoint para criar o anúncio
app.post('/api/create-ad', upload.single('creativeFile'), async (req, res) => {
    // ... (lógica de criação de anúncio permanece a mesma)
});

app.listen(port, () => {
  console.log(`--- SERVIDOR INICIADO ---`);
  console.log(`Acesse o Criador de Anúncios em http://localhost:${port}/creator.html`);
});
