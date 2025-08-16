const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const adAccountId = 'act_348456320153271';
const audienceNameToFind = 'Envolvimento IG - 7 dias';

if (!accessToken || accessToken === 'COLOQUE_SEU_TOKEN_DE_ACESSO_AQUI') {
  console.error('Erro: FACEBOOK_ACCESS_TOKEN não definido no .env');
  process.exit(1);
}

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const main = async () => {
  try {
    console.log(`Buscando o público "${audienceNameToFind}"...`);
    
    const url = `${BASE_URL}/${adAccountId}/customaudiences`;
    const params = {
      access_token: accessToken,
      fields: 'id,name',
      limit: 500,
    };
    const response = await axios.get(url, { params });
    const audiences = response.data.data;
    
    const targetAudience = audiences.find(aud => aud.name === audienceNameToFind);
    
    if (!targetAudience) {
      throw new Error(`Público "${audienceNameToFind}" não encontrado.`);
    }
    
    console.log(`Público encontrado. ID: ${targetAudience.id}. Buscando a regra...`);
    
    const ruleUrl = `${BASE_URL}/${targetAudience.id}`;
    const ruleParams = {
      access_token: accessToken,
      // Não especificar campos para obter a estrutura completa do objeto
    };
    const ruleResponse = await axios.get(ruleUrl, { params: ruleParams });
    
    console.log('\n--- ESTRUTURA COMPLETA DO PÚBLICO ENCONTRADA ---');
    console.log(JSON.stringify(ruleResponse.data, null, 2));
    console.log('----------------------------------------------------');
    console.log('\nAnalisando esta estrutura para a tentativa final.');

  } catch (error) {
    console.error(`\n❌ Erro:`);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

main();
