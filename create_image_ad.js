const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
const campaignId = '120230741844490776';
const newAdName = 'Criativo Teste Master Imagem';
const creativePath = path.join(process.env.HOME, 'Downloads', 'criativos lsp', 'master.jpeg');
const destinationUrl = 'https://pack.lidereseuprojeto.com/';

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  try {
    // 1. Fazer o upload da IMAGEM
    console.log('Fazendo upload da imagem...');
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('source', fs.createReadStream(creativePath));
    const uploadResponse = await axios.post(`${BASE_URL}/${adAccountId}/adimages`, form, { headers: form.getHeaders() });
    const imageFileName = Object.keys(uploadResponse.data.images)[0];
    const imageHash = uploadResponse.data.images[imageFileName].hash;
    console.log(`Imagem enviada com sucesso. Image Hash: ${imageHash}`);

    // 2. Obter o Page ID a partir de um anúncio existente na campanha
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
        if (adInfoResponse.data.ad_creative && adInfoResponse.data.ad_creative.object_story_spec && adInfoResponse.data.ad_creative.object_story_spec.page_id) {
          pageId = adInfoResponse.data.ad_creative.object_story_spec.page_id;
          break;
        }
      } catch (e) { /* Ignorar e tentar o próximo anúncio */ }
    }

    if (!pageId) {
      throw new Error('Não foi possível encontrar um Page ID válido em nenhum dos anúncios da campanha.');
    }
    console.log(`Page ID encontrado: ${pageId}`);

    // 3. Criar o AdCreative do zero
    console.log('Criando novo AdCreative do zero...');
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

    // 4. Buscar um Ad Set da campanha
    console.log('Buscando um Ad Set na campanha...');
    const adsetsUrl = `${BASE_URL}/${campaignId}/adsets`;
    const adsetsParams = { access_token: accessToken, filtering: "[{'field':'status','operator':'IN','value':['ACTIVE']}]" };
    const adsetsResponse = await axios.get(adsetsUrl, { params: adsetsParams });
    if (!adsetsResponse.data.data || adsetsResponse.data.data.length === 0) throw new Error('Nenhum Ad Set ativo encontrado na campanha.');
    const adsetId = adsetsResponse.data.data[0].id;
    console.log(`Ad Set encontrado: ${adsetId}`);

    // 5. Criar o novo anúncio
    console.log('Criando o novo anúncio...');
    const newAdUrl = `${BASE_URL}/${adAccountId}/ads`;
    const newAdData = { access_token: accessToken, name: newAdName, adset_id: adsetId, creative: { creative_id: newCreativeId }, status: 'PAUSED' };
    const newAdResponse = await axios.post(newAdUrl, newAdData);
    console.log(`\n✅ Anúncio "${newAdName}" criado com sucesso! ID do Anúncio: ${newAdResponse.data.id}`);
    console.log('O anúncio foi criado com o status "PAUSADO".');

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
