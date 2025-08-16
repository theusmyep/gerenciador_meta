document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ad-creator-form');
    const accountIdInput = document.getElementById('account-id');
    const campaignSelect = document.getElementById('campaign-select');
    const submitBtn = document.getElementById('submit-btn');
    const logsContainer = document.getElementById('logs-container');
    const logsPre = document.getElementById('logs');

    const log = (message) => {
        logsPre.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
        logsContainer.classList.remove('hidden');
        logsPre.scrollTop = logsPre.scrollHeight;
    };

    const populateCampaigns = async (accountId) => {
        console.log(`Buscando campanhas para a conta ID: ${accountId}`); // DEBUG
        campaignSelect.disabled = true;
        campaignSelect.innerHTML = '<option value="">Carregando campanhas...</option>';
        if (!accountId) {
            campaignSelect.innerHTML = '<option value="">Selecione uma conta primeiro</option>';
            return;
        }
        try {
            const response = await fetch(`/api/campaigns?accountId=${accountId}`);
            const campaigns = await response.json();
            campaignSelect.innerHTML = '<option value="">Selecione uma campanha</option>';
            campaigns.forEach(campaign => {
                const option = document.createElement('option');
                option.value = campaign.id;
                option.textContent = `${campaign.name} (${campaign.id})`;
                campaignSelect.appendChild(option);
            });
            campaignSelect.disabled = false;
        } catch (error) {
            log('Erro ao carregar campanhas.');
            campaignSelect.innerHTML = '<option value="">Falha ao carregar</option>';
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        logsPre.textContent = '';
        log('Iniciando criação do anúncio...');

        const formData = new FormData(form);
        
        try {
            // O endpoint /api/create-ad ainda precisa ser criado no server.js
            log('Enviando dados para o servidor...');
            const response = await fetch('/api/create-ad', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro desconhecido no servidor.');
            }
            
            log('----- PROCESSO CONCLUÍDO -----');
            log(`Anúncio criado com sucesso! ID: ${result.adId}`);
            log('Lembre-se de ativá-lo no Gerenciador de Anúncios.');
            form.reset();

        } catch (error) {
            log('----- ERRO -----');
            log(error.message);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Load campaigns for the hardcoded account on page load
    const defaultAccountId = accountIdInput.value;
    populateCampaigns(defaultAccountId);
});
