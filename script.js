document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const table = document.getElementById('report-table');
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    const tableFoot = table.querySelector('tfoot');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const refreshBtn = document.getElementById('refresh-btn');

    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const renderTable = (data) => {
        // Clear previous data
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        tableFoot.innerHTML = '';

        // Create Header
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Conta de Anúncio</th>';
        data.periods.forEach(period => {
            const th = document.createElement('th');
            th.textContent = period.label;
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Create Body
        data.reportData.forEach(account => {
            const row = document.createElement('tr');
            let rowHTML = `<td>${account.name}</td>`;
            data.periods.forEach(period => {
                rowHTML += `<td>${formatCurrency(account[period.preset])}</td>`;
            });
            row.innerHTML = rowHTML;
            tableBody.appendChild(row);
        });

        // Create Footer (Totals)
        const footerRow = document.createElement('tr');
        let footerHTML = '<td><strong>Total</strong></td>';
        const totals = {};
        data.periods.forEach(period => {
            const total = data.reportData.reduce((sum, account) => sum + account[period.preset], 0);
            totals[period.preset] = total;
            footerHTML += `<td><strong>${formatCurrency(total)}</strong></td>`;
        });
        footerRow.innerHTML = footerHTML;
        tableFoot.appendChild(footerRow);
    };

    const fetchReportData = async () => {
        const loaderText = loader.querySelector('p');
        loaderText.innerHTML = 'Carregando dados... Isso pode levar alguns minutos.';
        loader.classList.remove('hidden');
        table.classList.add('hidden');
        refreshBtn.disabled = true;

        try {
            // Usamos um EventSource para receber atualizações de progresso do servidor
            // (Isso é uma simulação, o servidor não suporta SSE, mas podemos melhorar a UI)
            loaderText.innerHTML = 'Buscando lista de contas...';
            const response = await fetch('/api/report');
            
            loaderText.innerHTML = 'Processando relatórios...';
            if (!response.ok) {
                throw new Error(`Erro na rede: ${response.statusText}`);
            }
            const data = await response.json();
            
            loaderText.innerHTML = 'Renderizando tabela...';
            renderTable(data);
            
            lastUpdatedSpan.textContent = new Date(data.lastUpdated).toLocaleString('pt-BR');
            loader.classList.add('hidden');
            table.classList.remove('hidden');
        } catch (error) {
            loader.innerHTML = `<p>Falha ao carregar dados. Verifique se o servidor está rodando e tente novamente. <br><small>${error.message}</small></p>`;
        } finally {
            refreshBtn.disabled = false;
        }
    };

    refreshBtn.addEventListener('click', fetchReportData);

    // Initial load
    fetchReportData();
});
