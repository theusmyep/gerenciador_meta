const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
const campaignId = '120230741844490776';
const newAdName = 'Criativo Teste Master Imagem com IG';
const pageNameToFind = 'Lidere Seu Projeto';
const instagramActorId = '17841448832294543';
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
    // 1. Encontrar o Page ID através da Business Manager da conta de anúncios
    console.log(`Buscando o Page ID para "${pageNameToFind}" via Business Manager...`);
    const accountInfo = await axios.get(`${BASE_URL}/${adAccountId}`, { params: { access_token: accessToken, fields: 'business' } });
    const businessId = accountInfo.data.business?.id;
    if (!businessId) {
      throw new Error('Não foi possível encontrar uma Business Manager associada a esta conta de anúncios.');
    }
    
    const pagesResponse = await axios.get(`${BASE_URL}/${businessId}/owned_pages`, { params: { access_token: accessToken, fields: 'id,name' } });
    const pages = pagesResponse.data.data;
    const targetPage = pages.find(page => page.name.toLowerCase() === pageNameToFind.toLowerCase());
    if (!targetPage) {
      throw new Error(`Não foi possível encontrar a página "${pageNameToFind}" na Business Manager ${businessId}.`);
    }
    const pageId = targetPage.id;
    console.log(`Page ID encontrado: ${pageId}`);

    // 2. Fazer o upload da IMAGEM
    console.log('Fazendo upload da imagem...');
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('source', fs.createReadStream(creativePath));
    const uploadResponse = await axios.post(`${BASE_URL}/${adAccountId}/adimages`, form, { headers: form.getHeaders() });
    const imageFileName = Object.keys(uploadResponse.data.images)[0];
    const imageHash = uploadResponse.data.images[imageFileName].hash;
    console.log(`Imagem enviada com sucesso. Image Hash: ${imageHash}`);

    // 3. Criar o AdCreative do zero
    console.log('Criando novo AdCreative do zero com Instagram ID...');
    const objectStorySpec = {
      page_id: pageId,
      instagram_actor_id: instagramActorId, // Adicionar o ID do Instagram
      link_data: { image_hash: imageHash, link: destinationUrl, message: ' ', call_to_action: { type: 'LEARN_MORE' } }
    };
    const newCreativeUrl = `${BASE_URL}/${adAccountId}/adcreatives`;
    const newCreativeData = { access_token: accessToken, name: `Creative for ${newAdName}`, object_story_spec: objectStorySpec };
    const newCreativeResponse = await axios.post(newCreativeUrl, newCreativeData);
    const newCreativeId = newCreativeResponse.data.id;
    console.log(`Novo AdCreative criado com sucesso. Creative ID: ${newCreativeId}`);

    // 4. Buscar um Ad Set da campanha
    console.log('Buscando um Ad Set na campanha...');
    const adsetsUrl = `${BASE_URL}/${campaignId}/adsets`;
    // CORREÇÃO: Remover filtro da API e pedir o status para filtrar no código
    const adsetsParams = { access_token: accessToken, fields: 'id,status' };
    const adsetsResponse = await axios.get(adsetsUrl, { params: adsetsParams });
    const adsets = adsetsResponse.data.data;
    if (!adsets || adsets.length === 0) throw new Error('Nenhum Ad Set encontrado na campanha.');
    
    // Filtrar no código para encontrar um Ad Set ativo
    const activeAdset = adsets.find(adset => adset.status === 'ACTIVE');
    const adsetId = activeAdset ? activeAdset.id : adsets[0].id; // Usa o ativo, ou o primeiro como fallback
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
