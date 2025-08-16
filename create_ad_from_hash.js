const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
const campaignId = '120230741844490776';
const newAdName = 'Anúncio Final com Imagem Existente';
const imageHash = '058f6870ade966600e8a76b2d76ae317'; // Hash da imagem que já subimos
const destinationUrl = 'https://pack.lidereseuprojeto.com/';

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  try {
    // 1. Obter o Page ID a partir de um anúncio existente na campanha
    console.log('Buscando Page ID de um anúncio existente...');
    const adsUrl = `${BASE_URL}/${campaignId}/ads`;
    const adsParams = { access_token: accessToken, fields: 'id' };
    const adsResponse = await axios.get(adsUrl, { params: adsParams });
    const ads = adsResponse.data.data;
    if (!ads || ads.length === 0) throw new Error('Nenhum anúncio encontrado na campanha para obter o Page ID.');

    let pageId = null;
    for (const ad of ads) {
      try {
        const adInfoUrl = `${BASE_URL}/${ad.id}`;
        const adInfoParams = { access_token: accessToken, fields: 'ad_creative{object_story_spec}' };
        const adInfoResponse = await axios.get(adInfoUrl, { params: adInfoParams });
        if (adInfoResponse.data.ad_creative?.object_story_spec?.page_id) {
          pageId = adInfoResponse.data.ad_creative.object_story_spec.page_id;
          break;
        }
      } catch (e) { /* Ignorar */ }
    }
    if (!pageId) throw new Error('Não foi possível encontrar um Page ID válido na campanha.');
    console.log(`Page ID encontrado: ${pageId}`);

    // 2. Criar o AdCreative do zero usando o hash existente
    console.log('Criando novo AdCreative com hash de imagem existente...');
    const objectStorySpec = {
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link: destinationUrl,
        message: ' ',
        call_to_action: { type: 'LEARN_MORE' },
      }
    };
    const newCreativeUrl = `${BASE_URL}/${adAccountId}/adcreatives`;
    const newCreativeData = { access_token: accessToken, name: `Creative for ${newAdName}`, object_story_spec: objectStorySpec };
    const newCreativeResponse = await axios.post(newCreativeUrl, newCreativeData);
    const newCreativeId = newCreativeResponse.data.id;
    console.log(`Novo AdCreative criado com sucesso. Creative ID: ${newCreativeId}`);

    // 3. Buscar um Ad Set da campanha
    console.log('Buscando um Ad Set na campanha...');
    const adsetsUrl = `${BASE_URL}/${campaignId}/adsets`;
    const adsetsParams = { access_token: accessToken, fields: 'id,status' };
    const adsetsResponse = await axios.get(adsetsUrl, { params: adsetsParams });
    const adsets = adsetsResponse.data.data;
    if (!adsets || adsets.length === 0) throw new Error('Nenhum Ad Set ativo encontrado na campanha.');
    const activeAdset = adsets.find(adset => adset.status === 'ACTIVE');
    const adsetId = activeAdset ? activeAdset.id : adsets[0].id;
    console.log(`Ad Set encontrado: ${adsetId}`);

    // 4. Criar o novo anúncio
    console.log('Criando o novo anúncio...');
    const newAdUrl = `${BASE_URL}/${adAccountId}/ads`;
    const newAdData = { access_token: accessToken, name: newAdName, adset_id: adsetId, creative: { creative_id: newCreativeId }, status: 'PAUSED' };
    const newAdResponse = await axios.post(newAdUrl, newAdData);
    
    console.log(`\n✅ Anúncio "${newAdName}" criado com sucesso! ID do Anúncio: ${newAdResponse.data.id}`);

  } catch (error) {
    console.error('\n❌ Erro durante o processo:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data.error, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
