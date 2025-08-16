const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Vercel roda a partir da raiz do projeto, então o .env está um nível acima
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const router = express.Router();

app.use(cors());
const upload = multer({ dest: '/tmp/uploads' }); // Usar o diretório /tmp do Vercel

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const businessManagerId = process.env.BUSINESS_MANAGER_ID;

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// --- LÓGICA DO DASHBOARD ---
const getAggregatedReport = async (datePreset) => {
    try {
        const url = `${BASE_URL}/${businessManagerId}/insights`;
        const params = { access_token: accessToken, level: 'business', fields: 'spend,ad_account_id', breakdowns: 'ad_account', date_preset: datePreset, limit: 500 };
        const response = await axios.get(url, { params });
        return response.data.data || [];
    } catch (error) { return []; }
};

router.get('/report', async (req, res) => {
    try {
        const accountsUrl = `${BASE_URL}/${businessManagerId}/client_ad_accounts`;
        const accountsParams = { access_token: accessToken, fields: 'id,name', limit: 500 };
        const accountsResponse = await axios.get(accountsUrl, { params: accountsParams });
        const adAccountsMap = new Map(accountsResponse.data.data.map(acc => [acc.id, acc.name]));
        const periods = [{ preset: 'today', label: 'Hoje' }, { preset: 'yesterday', label: 'Ontem' }, { preset: 'last_7d', label: 'Últimos 7 dias' }, { preset: 'last_30d', label: 'Últimos 30 dias' }];
        const reportPromises = periods.map(p => getAggregatedReport(p.preset));
        const results = await Promise.all(reportPromises);
        const combinedData = new Map();
        results.forEach((periodResult, periodIndex) => {
            const periodPreset = periods[periodIndex].preset;
            periodResult.forEach(item => {
                const accountId = `act_${item.ad_account_id}`;
                if (!combinedData.has(accountId)) combinedData.set(accountId, { id: accountId, name: adAccountsMap.get(accountId) || `Conta ${item.ad_account_id}` });
                combinedData.get(accountId)[periodPreset] = parseFloat(item.spend);
            });
        });
        const reportData = Array.from(combinedData.values());
        reportData.forEach(acc => periods.forEach(p => { if (!acc[p.preset]) acc[p.preset] = 0; }));
        reportData.sort((a, b) => b.last_30d - a.last_30d);
        res.json({ periods, reportData, lastUpdated: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: 'Falha ao buscar dados.' }); }
});

// --- LÓGICA DO CRIADOR DE ANÚNCIOS ---
router.get('/accounts', async (req, res) => {
    try {
        const url = `${BASE_URL}/${businessManagerId}/client_ad_accounts`;
        const params = { access_token: accessToken, fields: 'id,name', limit: 500 };
        const response = await axios.get(url, { params });
        const accounts = response.data.data.map(acc => ({ id: acc.id.replace('act_', ''), name: acc.name }));
        res.json(accounts);
    } catch (error) { res.status(500).json({ error: 'Falha ao buscar contas.' }); }
});

router.get('/campaigns', async (req, res) => {
    const { accountId } = req.query;
    if (!accountId) return res.status(400).json({ error: 'ID da conta obrigatório.' });
    try {
        const url = `${BASE_URL}/act_${accountId}/campaigns`;
        const params = { access_token: accessToken, fields: 'id,name,effective_status', limit: 200 };
        const response = await axios.get(url, { params });
        const activeCampaigns = response.data.data.filter(c => c.effective_status === 'ACTIVE');
        res.json(activeCampaigns);
    } catch (error) { res.status(500).json({ error: 'Falha ao buscar campanhas.' }); }
});

router.post('/create-ad', upload.single('creativeFile'), async (req, res) => {
    const { accountId, campaignId, adName, headline, primaryText, url, cta } = req.body;
    const creativeFile = req.file;
    if (!creativeFile) return res.status(400).json({ error: 'Arquivo do criativo obrigatório.' });
    const fullAdAccountId = `act_${accountId}`;
    try {
        const adsUrl = `${BASE_URL}/${campaignId}/ads`;
        const adsParams = { access_token: accessToken, fields: 'id' };
        const adsResponse = await axios.get(adsUrl, { params: adsParams });
        const ads = adsResponse.data.data;
        if (!ads || ads.length === 0) throw new Error('Nenhum anúncio na campanha para obter o Page ID.');
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
            } catch (e) {}
        }
        if (!pageId) throw new Error('Não foi possível encontrar um Page ID válido na campanha.');
        
        let creativePayload = {};
        const form = new FormData();
        form.append('access_token', accessToken);
        form.append('source', fs.createReadStream(creativeFile.path));
        if (creativeFile.mimetype.startsWith('image/')) {
            const response = await axios.post(`${BASE_URL}/${fullAdAccountId}/adimages`, form, { headers: form.getHeaders() });
            creativePayload.image_hash = response.data.images[Object.keys(response.data.images)[0]].hash;
        } else {
            const response = await axios.post(`https://graph-video.facebook.com/${API_VERSION}/${fullAdAccountId}/advideos`, form, { headers: form.getHeaders() });
            creativePayload.video_id = response.data.id;
        }
        
        const objectStorySpec = { page_id: pageId, link_data: { ...creativePayload, link: url, message: primaryText || ' ', name: headline || ' ', call_to_action: { type: cta } } };
        const creativeResponse = await axios.post(`${BASE_URL}/${fullAdAccountId}/adcreatives`, { access_token: accessToken, name: `Creative for ${adName}`, object_story_spec: objectStorySpec });
        const creativeId = creativeResponse.data.id;
        
        const adsetsResponse = await axios.get(`${BASE_URL}/${campaignId}/adsets`, { params: { access_token: accessToken, fields: 'id,status' } });
        const adsets = adsetsResponse.data.data;
        if (!adsets || adsets.length === 0) throw new Error('Nenhum Ad Set encontrado.');
        const activeAdset = adsets.find(adset => adset.status === 'ACTIVE');
        const adsetId = activeAdset ? activeAdset.id : adsets[0].id;
        
        const adResponse = await axios.post(`${BASE_URL}/${fullAdAccountId}/ads`, { access_token: accessToken, name: adName, adset_id: adsetId, creative: { creative_id: creativeId }, status: 'PAUSED' });
        
        res.json({ success: true, adId: adResponse.data.id });
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    } finally {
        fs.unlinkSync(creativeFile.path);
    }
});

app.use('/api', router);

module.exports = app;
