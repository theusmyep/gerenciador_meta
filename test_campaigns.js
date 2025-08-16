const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271'; // Lidere Seu Projeto

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  console.log(`Testando a busca de campanhas para a conta ${adAccountId}...`);
  try {
    const url = `${BASE_URL}/${adAccountId}/campaigns`;
    const params = {
      access_token: accessToken,
      fields: 'id,name,effective_status',
      limit: 200,
    };
    const response = await axios.get(url, { params });
    
    const activeCampaigns = response.data.data.filter(campaign => campaign.effective_status === 'ACTIVE');
    
    console.log(`\n--- SUCESSO ---`);
    console.log(`Encontradas ${activeCampaigns.length} campanhas ativas:`);
    activeCampaigns.forEach(c => console.log(`- ${c.name} (${c.id})`));

  } catch (error) {
    console.error('\n--- FALHA ---');
    console.error('Ocorreu um erro ao tentar buscar as campanhas:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
