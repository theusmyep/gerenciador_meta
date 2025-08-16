const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
// CORREÇÃO: Usar o ID correto da fonte de eventos, descoberto pela leitura da API
const igBusinessId = '3980294778759350'; 

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const createAudience = async (days) => {
  const audienceName = `Envolvimento IG - ${days} dias`;
  console.log(`Criando público: "${audienceName}"...`);

  const url = `${BASE_URL}/${adAccountId}/customaudiences`;
  
  // CORREÇÃO: Usar a estrutura de regra exata que a API espera
  const rule = {
    "inclusions": {
      "operator": "or",
      "rules": [
        {
          "event_sources": [
            {
              "type": "ig_business",
              "id": igBusinessId
            }
          ],
          "retention_seconds": days * 24 * 60 * 60,
          "filter": {
            "operator": "and",
            "filters": [
              {
                "field": "event",
                "operator": "eq",
                "value": "ig_business_profile_all"
              }
            ]
          }
        }
      ]
    }
  };

  const data = {
    access_token: accessToken,
    name: audienceName,
    subtype: 'CUSTOM',
    description: `Pessoas que se envolveram com o Instagram nos últimos ${days} dias.`,
    rule: rule, // Tentar passar a regra como um objeto em vez de string
    prefill: true,
  };

  try {
    const response = await axios.post(url, data);
    console.log(`✅ Público "${audienceName}" criado com sucesso. ID: ${response.data.id}`);
  } catch (error) {
    console.error(`❌ Erro ao criar o público "${audienceName}":`);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

const main = async () => {
  // O de 7 dias já foi criado, então criamos os restantes
  const dayIntervals = [30, 90, 120];
  for (const days of dayIntervals) {
    await createAudience(days);
  }
  console.log('\nProcesso de criação de públicos concluído.');
};

main();
