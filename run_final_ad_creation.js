const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- DADOS FORNECIDOS ---
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
const campaignId = '120230741844490776'; // Campanha onde o anúncio será criado
const pageId = '113699370977272';
const instagramActorId = '17841448832294543';
const creativePath = path.join(process.env.HOME, 'Downloads', 'criativos lsp', 'master.jpeg');
const newAdName = 'Anúncio Definitivo Master';
const destinationUrl = 'https://pack.lidereseuprojeto.com/';
const cta = 'LEARN_MORE';
// --------------------------

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  if (!accessToken || accessToken.includes('COLOQUE')) {
    console.error('ERRO: Token de acesso inválido no arquivo .env');
    return;
  }

  try {
    // 1. Fazer upload do criativo
    console.log('Passo 1/4: Fazendo upload da imagem...');
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('source', fs.createReadStream(creativePath));
    const uploadResponse = await axios.post(`${BASE_URL}/${adAccountId}/adimages`, form, { headers: form.getHeaders() });
    const imageHash = uploadResponse.data.images[Object.keys(uploadResponse.data.images)[0]].hash;
    console.log(`-> Upload concluído. Hash: ${imageHash}`);

    // 2. Criar AdCreative
    console.log('Passo 2/4: Criando o criativo do anúncio...');
    const objectStorySpec = {
      page_id: pageId,
      link_data: { image_hash: imageHash, link: destinationUrl, message: ' ', call_to_action: { type: cta } }
    };
    const creativeResponse = await axios.post(`${BASE_URL}/${adAccountId}/adcreatives`, { access_token: accessToken, name: `Creative for ${newAdName}`, object_story_spec: objectStorySpec });
    const creativeId = creativeResponse.data.id;
    console.log(`-> Criativo criado. ID: ${creativeId}`);

    // 3. Buscar Ad Set
    console.log('Passo 3/4: Buscando um conjunto de anúncios ativo...');
    const adsetsResponse = await axios.get(`${BASE_URL}/${campaignId}/adsets`, { params: { access_token: accessToken, fields: 'id,status' } });
    const adsets = adsetsResponse.data.data;
    if (!adsets || adsets.length === 0) throw new Error('Nenhum conjunto de anúncios encontrado na campanha.');
    const activeAdset = adsets.find(adset => adset.status === 'ACTIVE');
    const adsetId = activeAdset ? activeAdset.id : adsets[0].id;
    console.log(`-> Conjunto de anúncios encontrado. ID: ${adsetId}`);

    // 4. Criar Anúncio
    console.log('Passo 4/4: Criando o anúncio final...');
    const adResponse = await axios.post(`${BASE_URL}/${adAccountId}/ads`, { access_token: accessToken, name: newAdName, adset_id: adsetId, creative: { creative_id: creativeId }, status: 'PAUSED' });
    
    console.log('\n--- SUCESSO! ---');
    console.log(`Anúncio "${newAdName}" foi criado com sucesso!`);
    console.log(`ID do Anúncio: ${adResponse.data.id}`);
    console.log('Ele está com o status "PAUSADO" na sua conta.');

  } catch (error) {
    console.error('\n--- FALHA ---');
    console.error('Ocorreu um erro no processo:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data.error, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
