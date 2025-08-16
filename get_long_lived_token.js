const axios = require('axios');

// --- PREENCHA ESTAS INFORMAÇÕES ---
const appId = 'COLOQUE_SEU_APP_ID_AQUI';
const appSecret = 'COLOQUE_SEU_APP_SECRET_AQUI';
const shortLivedToken = 'COLOQUE_O_TOKEN_DE_CURTA_DURAÇÃO_AQUI';
// ------------------------------------

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  if (appId.includes('COLOQUE') || appSecret.includes('COLOQUE') || shortLivedToken.includes('COLOQUE')) {
    console.error('ERRO: Por favor, edite este arquivo e preencha as variáveis appId, appSecret e shortLivedToken.');
    return;
  }

  console.log('Trocando o token de curta duração por um de longa duração...');

  try {
    const url = `${BASE_URL}/oauth/access_token`;
    const params = {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    };

    const response = await axios.get(url, { params });
    const longLivedToken = response.data.access_token;

    console.log('\n--- SUCESSO ---');
    console.log('Seu token de longa duração foi gerado. Copie a linha abaixo e cole no seu arquivo .env');
    console.log('\n----------------------------------------------------');
    console.log(`FACEBOOK_ACCESS_TOKEN=${longLivedToken}`);
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('\n--- FALHA ---');
    console.error('Ocorreu um erro ao gerar o token:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
