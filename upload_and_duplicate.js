const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271'; // A conta de "Lidere seu Projeto"
const campaignId = '120230741844490776'; // Campanha alvo
const newAdName = 'Criativo Teste Master';
const creativePath = path.join(process.env.HOME, 'Downloads', 'criativos lsp', 'AD Dash 01.MOV');

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  try {
    // 1. Fazer o upload do vídeo
    console.log('Fazendo upload do vídeo...');
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('source', fs.createReadStream(creativePath));
    const uploadResponse = await axios.post(`https://graph-video.facebook.com/${API_VERSION}/${adAccountId}/advideos`, form, { headers: form.getHeaders() });
    const videoId = uploadResponse.data.id;
    console.log(`Vídeo enviado com sucesso. Video ID: ${videoId}`);

    // 2. Buscar IDs de anúncios na campanha
    console.log('Buscando anúncios na campanha para encontrar um modelo...');
    const adsUrl = `${BASE_URL}/${campaignId}/ads`;
    const adsParams = { access_token: accessToken, fields: 'id' };
    const adsResponse = await axios.get(adsUrl, { params: adsParams });
    const ads = adsResponse.data.data;
    if (!ads || ads.length === 0) {
      throw new Error('Nenhum anúncio encontrado na campanha.');
    }

    // 2.5. Iterar sobre os anúncios para encontrar um com criativo válido
    let sourceCreativeId = null;
    for (const ad of ads) {
      try {
        const adInfoUrl = `${BASE_URL}/${ad.id}`;
        const adInfoParams = { access_token: accessToken, fields: 'ad_creative{id}' };
        const adInfoResponse = await axios.get(adInfoUrl, { params: adInfoParams });
        if (adInfoResponse.data.ad_creative && adInfoResponse.data.ad_creative.id) {
          sourceCreativeId = adInfoResponse.data.ad_creative.id;
          break; // Encontramos um, podemos parar
        }
      } catch (e) { /* Ignorar anúncios que falham ao buscar criativo */ }
    }

    if (!sourceCreativeId) {
      throw new Error('Não foi possível encontrar um anúncio com criativo válido na campanha para usar como modelo.');
    }
    
    // 3. Buscar os dados do criativo do anúncio modelo
    console.log(`Usando criativo modelo: ${sourceCreativeId}`);
    const creativeUrl = `${BASE_URL}/${sourceCreativeId}`;
    const creativeParams = { access_token: accessToken, fields: 'object_story_spec' };
    const creativeResponse = await axios.get(creativeUrl, { params: creativeParams });
    const sourceObjectStorySpec = creativeResponse.data.object_story_spec;

    // 4. Criar um novo AdCreative, substituindo o vídeo
    console.log('Criando novo AdCreative com o vídeo recém-enviado...');
    const newObjectStorySpec = { ...sourceObjectStorySpec };
    if (!newObjectStorySpec.video_data) {
        throw new Error('O criativo modelo não é um vídeo. Não é possível duplicar com o novo vídeo.');
    }
    newObjectStorySpec.video_data.video_id = videoId;
    delete newObjectStorySpec.video_data.creative_id;

    const newCreativeUrl = `${BASE_URL}/${adAccountId}/adcreatives`;
    const newCreativeData = { access_token: accessToken, name: `Creative for ${newAdName}`, object_story_spec: newObjectStorySpec };
    const newCreativeResponse = await axios.post(newCreativeUrl, newCreativeData);
    const newCreativeId = newCreativeResponse.data.id;
    console.log(`Novo AdCreative criado com sucesso. Creative ID: ${newCreativeId}`);

    // 5. Buscar um Ad Set da campanha
    console.log('Buscando um Ad Set na campanha...');
    const adsetsUrl = `${BASE_URL}/${campaignId}/adsets`;
    const adsetsParams = { access_token: accessToken, filtering: "[{'field':'status','operator':'IN','value':['ACTIVE']}]" };
    const adsetsResponse = await axios.get(adsetsUrl, { params: adsetsParams });
    if (!adsetsResponse.data.data || adsetsResponse.data.data.length === 0) {
      throw new Error('Nenhum Ad Set ativo encontrado na campanha.');
    }
    const adsetId = adsetsResponse.data.data[0].id;
    console.log(`Ad Set encontrado: ${adsetId}`);

    // 6. Criar o novo anúncio
    console.log('Criando o novo anúncio...');
    const newAdUrl = `${BASE_URL}/${adAccountId}/ads`;
    const newAdData = { access_token: accessToken, name: newAdName, adset_id: adsetId, creative: { creative_id: newCreativeId }, status: 'PAUSED' };
    const newAdResponse = await axios.post(newAdUrl, newAdData);
    console.log(`\n✅ Anúncio "${newAdName}" criado com sucesso! ID do Anúncio: ${newAdResponse.data.id}`);
    console.log('O anúncio foi criado com o status "PAUSADO". Por favor, ative-o manualmente no Gerenciador de Anúncios.');

  } catch (error) {
    console.error('\n❌ Erro durante o processo:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
