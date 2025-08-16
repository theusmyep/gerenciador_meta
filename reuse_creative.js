const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
const campaignId = '120230741844490776';
const creativeNameToFind = 'Creative for Criativo Teste Master Imagem';
const newAdName = 'Anúncio Reutilizado Teste';

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  try {
    // 1. Encontrar o AdCreative que já subimos
    console.log(`Buscando o criativo existente: "${creativeNameToFind}"...`);
    const creativeUrl = `${BASE_URL}/${adAccountId}/adcreatives`;
    const creativeParams = { access_token: accessToken, fields: 'id,name' };
    const creativeResponse = await axios.get(creativeUrl, { params: creativeParams });
    const creatives = creativeResponse.data.data;
    const targetCreative = creatives.find(c => c.name === creativeNameToFind);

    if (!targetCreative) {
      throw new Error(`Não foi possível encontrar um criativo com o nome "${creativeNameToFind}".`);
    }
    const creativeId = targetCreative.id;
    console.log(`Criativo encontrado. ID: ${creativeId}`);

    // 2. Buscar um Ad Set ativo na campanha
    console.log(`Buscando um Ad Set ativo na campanha ${campaignId}...`);
    const adsetsUrl = `${BASE_URL}/${campaignId}/adsets`;
    const adsetsParams = { access_token: accessToken, fields: 'id,status' };
    const adsetsResponse = await axios.get(adsetsUrl, { params: adsetsParams });
    const adsets = adsetsResponse.data.data;
    if (!adsets || adsets.length === 0) throw new Error('Nenhum Ad Set encontrado na campanha.');
    const activeAdset = adsets.find(adset => adset.status === 'ACTIVE');
    const adsetId = activeAdset ? activeAdset.id : adsets[0].id;
    console.log(`Ad Set encontrado: ${adsetId}`);

    // 3. Criar o novo anúncio usando o criativo existente
    console.log('Criando o novo anúncio...');
    const newAdUrl = `${BASE_URL}/${adAccountId}/ads`;
    const newAdData = {
      access_token: accessToken,
      name: newAdName,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED',
    };
    const newAdResponse = await axios.post(newAdUrl, newAdData);
    
    console.log('\n--- SUCESSO ---');
    console.log(`Anúncio "${newAdName}" criado com sucesso! ID do Anúncio: ${newAdResponse.data.id}`);
    console.log('O anúncio foi criado com o status "PAUSADO".');

  } catch (error) {
    console.error('\n--- FALHA ---');
    console.error('Ocorreu um erro:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data.error, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
