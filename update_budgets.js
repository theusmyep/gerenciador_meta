const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const axios = require('axios');

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271'; // ID da conta fornecido pelo usuário

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: A variável de ambiente FACEBOOK_ACCESS_TOKEN deve ser definida no arquivo .env.');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
const BUDGET_INCREASE_BRL = 10; // Aumento de 10 BRL
const BUDGET_INCREASE_CENTS = BUDGET_INCREASE_BRL * 100; // Converter para centavos

const updateCampaignBudgets = async () => {
  try {
    console.log(`Buscando campanhas ativas na conta de anúncio: ${adAccountId}...`);

    // 1. Buscar todas as campanhas ativas
    const campaignsUrl = `${BASE_URL}/${adAccountId}/campaigns`;
    const campaignsParams = {
      access_token: accessToken,
      fields: 'id,name,daily_budget',
      filtering: `[
        {'field':'effective_status','operator':'IN','value':['ACTIVE']}
      ]`,
      limit: 200,
    };
    const campaignsResponse = await axios.get(campaignsUrl, { params: campaignsParams });
    const campaigns = campaignsResponse.data.data;

    if (!campaigns || campaigns.length === 0) {
      console.log('Nenhuma campanha ativa encontrada nesta conta.');
      return;
    }

    console.log(`Encontradas ${campaigns.length} campanhas ativas. Aumentando o orçamento em R$ ${BUDGET_INCREASE_BRL} para cada uma...`);

    // 2. Atualizar o orçamento de cada campanha
    for (const campaign of campaigns) {
      const currentBudget = parseInt(campaign.daily_budget, 10);
      const newBudget = currentBudget + BUDGET_INCREASE_CENTS;

      const updateUrl = `${BASE_URL}/${campaign.id}`;
      const updateParams = {
        access_token: accessToken,
        daily_budget: newBudget,
      };

      try {
        await axios.post(updateUrl, null, { params: updateParams });
        console.log(`- Campanha "${campaign.name}" (${campaign.id}): Orçamento atualizado de R$ ${(currentBudget / 100).toFixed(2)} para R$ ${(newBudget / 100).toFixed(2)}`);
      } catch (updateError) {
        console.error(`- Erro ao atualizar a campanha "${campaign.name}" (${campaign.id}): ${updateError.response?.data?.error?.message || updateError.message}`);
      }
    }

    console.log('\n✅ Processo de atualização de orçamentos concluído.');

  } catch (error) {
    console.error('\n❌ Erro ao processar a solicitação:');
    if (error.response) {
      const apiError = error.response.data.error;
      console.error(`Status: ${error.response.status}`);
      console.error(`Mensagem: ${apiError.message}`);
      if (apiError.code === 200) {
        console.error('\n[DICA] Este erro geralmente indica falta de permissão. Verifique se o seu Token de Acesso possui a permissão "ads_management".');
      }
    } else {
      console.error('Mensagem:', error.message);
    }
  }
};

updateCampaignBudgets();
