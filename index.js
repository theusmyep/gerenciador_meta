const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const axios = require('axios');

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const businessManagerId = process.env.BUSINESS_MANAGER_ID;

if (!accessToken || !businessManagerId || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: As variáveis de ambiente FACEBOOK_ACCESS_TOKEN e BUSINESS_MANAGER_ID devem ser definidas no arquivo .env.');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Função para buscar o gasto de uma única conta para um período específico
const getAccountSpendForPreset = async (accountId, datePreset) => {
  try {
    const url = `${BASE_URL}/${accountId}/insights`;
    const params = {
      access_token: accessToken,
      level: 'account',
      fields: 'spend',
      date_preset: datePreset,
    };
    const response = await axios.get(url, { params });
    if (response.data && response.data.data && response.data.data.length > 0) {
      return parseFloat(response.data.data[0].spend);
    }
    return 0;
  } catch (error) {
    // Retorna 0 em caso de erro para não quebrar a soma total
    return 0;
  }
};

// Função para calcular o gasto total de todas as contas para um período
const getTotalSpendForPeriod = async (adAccounts, period) => {
  console.log(`Calculando investimento para: ${period.label}...`);
  const spendPromises = adAccounts.map(account => getAccountSpendForPreset(account.id, period.preset));
  const spends = await Promise.all(spendPromises);
  const total = spends.reduce((sum, current) => sum + current, 0);
  return total;
};

// Função principal
const getSpendReports = async () => {
  try {
    console.log(`Buscando contas de anúncio para a Business Manager ID: ${businessManagerId}...`);
    
    // 1. Buscar todas as contas de anúncio (próprias e compartilhadas)
    const accountsUrl = `${BASE_URL}/${businessManagerId}/client_ad_accounts`;
    const accountsParams = {
      access_token: accessToken,
      fields: 'id',
      limit: 500,
    };
    const accountsResponse = await axios.get(accountsUrl, { params: accountsParams });
    const adAccounts = accountsResponse.data.data;

    if (!adAccounts || adAccounts.length === 0) {
      console.log('Nenhuma conta de anúncio encontrada.');
      return;
    }
    console.log(`Encontradas ${adAccounts.length} contas. Iniciando relatórios...`);

    const periods = [
      { preset: 'today', label: 'Hoje' },
      { preset: 'yesterday', label: 'Ontem' },
      { preset: 'last_7d', label: 'Últimos 7 dias' },
      { preset: 'last_30d', label: 'Últimos 30 dias' },
      { preset: 'this_month', label: 'Este mês' },
    ];

    console.log('\n--- Relatório de Investimento Agregado ---');
    
    // 2. Calcular o total para cada período
    for (const period of periods) {
      const totalSpend = await getTotalSpendForPeriod(adAccounts, period);
      console.log(`- ${period.label}: R$ ${totalSpend.toFixed(2)}`);
    }

    console.log('-----------------------------------------');

  } catch (error) {
    console.error('\n❌ Erro ao buscar a lista de contas de anúncio:');
    if (error.response && error.response.data && error.response.data.error) {
      console.error(`   Mensagem: ${error.response.data.error.message}`);
    } else {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
};

getSpendReports();
