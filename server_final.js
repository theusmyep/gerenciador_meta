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
const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Endpoint ÚNICO para criar o anúncio
app.post('/api/create-ad', upload.single('creativeFile'), async (req, res) => {
  const { accountId, campaignId, adName, headline, primaryText, url, cta } = req.body;
  const creativeFile = req.file;

  if (!creativeFile) {
    return res.status(400).json({ error: 'Arquivo do criativo é obrigatório.' });
  }

  const fullAdAccountId = `act_${accountId}`;

  try {
    // 1. Usar Page ID e Instagram ID fornecidos diretamente
    const pageId = '113699370977272';
    const instagramActorId = '17841448832294543';
    console.log(`Usando Page ID: ${pageId} e Instagram ID: ${instagramActorId}`);

    // 2. Fazer upload do criativo
    let creativePayload = {};
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('source', fs.createReadStream(creativeFile.path));

    if (creativeFile.mimetype.startsWith('image/')) {
      const response = await axios.post(`${BASE_URL}/${fullAdAccountId}/adimages`, form, { headers: form.getHeaders() });
      const imageFileName = Object.keys(response.data.images)[0];
      creativePayload.image_hash = response.data.images[imageFileName].hash;
    } else if (creativeFile.mimetype.startsWith('video/')) {
      const response = await axios.post(`https://graph-video.facebook.com/${API_VERSION}/${fullAdAccountId}/advideos`, form, { headers: form.getHeaders() });
      creativePayload.video_id = response.data.id;
    } else {
      throw new Error('Tipo de arquivo de criativo não suportado.');
    }

    // 3. Criar AdCreative
    const objectStorySpec = {
      page_id: pageId,
      instagram_actor_id: instagramActorId,
      link_data: { ...creativePayload, link: url, message: primaryText || ' ', name: headline || ' ', call_to_action: { type: cta } }
    };
    const creativeResponse = await axios.post(`${BASE_URL}/${fullAdAccountId}/adcreatives`, { access_token: accessToken, name: `Creative for ${adName}`, object_story_spec: objectStorySpec });
    const creativeId = creativeResponse.data.id;

    // 4. Buscar Ad Set
    const adsetsResponse = await axios.get(`${BASE_URL}/${campaignId}/adsets`, { params: { access_token: accessToken, fields: 'id,status' } });
    const adsets = adsetsResponse.data.data;
    if (!adsets || adsets.length === 0) throw new Error('Nenhum Ad Set encontrado na campanha.');
    const activeAdset = adsets.find(adset => adset.status === 'ACTIVE');
    const adsetId = activeAdset ? activeAdset.id : adsets[0].id;

    // 5. Criar Anúncio
    const adResponse = await axios.post(`${BASE_URL}/${fullAdAccountId}/ads`, { access_token: accessToken, name: adName, adset_id: adsetId, creative: { creative_id: creativeId }, status: 'PAUSED' });
    
    res.json({ success: true, adId: adResponse.data.id });

  } catch (error) {
    console.error('Erro na criação do anúncio:', error.response ? error.response.data.error : error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  } finally {
    fs.unlinkSync(creativeFile.path);
  }
});

app.listen(port, () => {
  console.log(`--- SERVIDOR FINAL INICIADO ---`);
  console.log(`Abra o arquivo 'creator_final.html' no seu navegador.`);
});
