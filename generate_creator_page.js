const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271'; // Lidere Seu Projeto

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  console.log('Buscando a lista de campanhas ANTES de criar a página...');
  try {
    // 1. Buscar os dados das campanhas (lógica do test_campaigns.js)
    const url = `${BASE_URL}/${adAccountId}/campaigns`;
    const params = { access_token: accessToken, fields: 'id,name,effective_status', limit: 200 };
    const response = await axios.get(url, { params });
    const activeCampaigns = response.data.data.filter(c => c.effective_status === 'ACTIVE');
    console.log(`Encontradas ${activeCampaigns.length} campanhas ativas.`);

    // 2. Gerar o conteúdo HTML com os dados pré-carregados
    const preloadedData = JSON.stringify(activeCampaigns);
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Criador de Anúncios (Pré-carregado)</title>
    <style>
        /* CSS embutido para simplicidade */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        :root { --background-color: #121212; --surface-color: #1e1e1e; --primary-text-color: #e0e0e0; --secondary-text-color: #a0a0a0; --border-color: #333; --accent-color: #007bff; --hover-color: #333; }
        body { font-family: 'Inter', sans-serif; background-color: var(--background-color); color: var(--primary-text-color); margin: 0; padding: 20px; font-size: 14px; }
        .container { max-width: 1200px; margin: 0 auto; background-color: var(--surface-color); border-radius: 8px; padding: 20px; }
        .form-step { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        label { font-weight: 600; color: var(--secondary-text-color); }
        input, select, textarea { width: 100%; padding: 10px; background-color: #2c2c2c; border: 1px solid var(--border-color); border-radius: 5px; color: var(--primary-text-color); font-size: 14px; }
        button { background-color: var(--accent-color); color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Criador de Anúncios (Pré-carregado)</h1>
        <p>Conta: Lidere Seu Projeto</p>
        <form id="ad-creator-form">
            <div class="form-step">
                <label for="campaign-select">Selecione a Campanha</label>
                <select id="campaign-select" name="campaignId" required></select>
            </div>
            <!-- Outros campos do formulário aqui -->
        </form>
    </div>

    <script>
        // Dados das campanhas pré-carregados pelo script Node.js
        const PRELOADED_CAMPAIGNS = ${preloadedData};

        document.addEventListener('DOMContentLoaded', () => {
            const campaignSelect = document.getElementById('campaign-select');
            
            const populateCampaigns = (campaigns) => {
                if (!campaigns || campaigns.length === 0) {
                    campaignSelect.innerHTML = '<option value="">Nenhuma campanha ativa encontrada</option>';
                    return;
                }
                campaignSelect.innerHTML = '<option value="">Selecione uma campanha</option>';
                campaigns.forEach(campaign => {
                    const option = document.createElement('option');
                    option.value = campaign.id;
                    option.textContent = \`\${campaign.name} (\${campaign.id})\`;
                    campaignSelect.appendChild(option);
                });
            };

            // Popula o dropdown com os dados pré-carregados
            populateCampaigns(PRELOADED_CAMPAIGNS);
        });
    </script>
</body>
</html>`;

    // 3. Salvar o novo arquivo HTML
    fs.writeFileSync(path.join(__dirname, 'creator_standalone.html'), htmlContent);
    console.log('\n--- SUCESSO ---');
    console.log('A página "creator_standalone.html" foi criada com as campanhas já carregadas.');
    console.log('Por favor, abra este novo arquivo no seu navegador.');

  } catch (error) {
    console.error('\n--- FALHA ---');
    console.error('Ocorreu um erro ao gerar a página:', error.message);
  }
};

main();
