# Regras de renovação e reajuste (SIGACON)

Referência para o uso do sistema em contratos de prefeitura: regime da licitação e limite de reajuste anual.

## Regime da licitação

Cada contrato deve ser classificado em uma das leis:

- **Lei 8.666/93 (antiga)** – contratos regidos pela Lei nº 8.666, de 21 de junho de 1993.
- **Lei 14.133/2021 (nova)** – contratos regidos pela Lei nº 14.133, de 1º de abril de 2021.

Isso define quantas renovações/prorrogações são permitidas.

## Renovações permitidas

### Lei 8.666/93

- **Art. 57, §5º**: o contrato pode ser prorrogado até **4 (quatro) vezes**, cada uma por até 12 meses.
- O sistema considera: **número de renovações &lt; 4** → ainda pode renovar; **≥ 4** → necessário nova licitação.

### Lei 14.133/2021

- **Art. 149**: o contrato pode ser prorrogado até **2 (duas) vezes**, cada uma por até 12 meses.
- O sistema considera: **número de renovações &lt; 2** → ainda pode renovar; **≥ 2** → necessário nova licitação.

## Limite de reajuste anual (25%)

- A soma dos percentuais de reajuste aplicados ao contrato **nos últimos 12 meses** não deve ultrapassar **25%** ao ano, conforme orientação usual na administração pública.
- No SIGACON, o “Reajuste acumulado nos últimos 12 meses” é calculado somando o campo **percentual aplicado** de todos os reajustes cuja **data do reajuste** esteja dentro do último ano.
- Se o acumulado superar 25%, o sistema exibe o alerta: **“Atenção: acima do limite de 25% ao ano”**.

## Onde isso aparece no sistema

- **Cadastro/edição de contrato**: Lei de licitação, Data de assinatura, Nº de renovações já realizadas.
- **Detalhe do contrato**: bloco “Regime e renovação” (lei, data de assinatura, renovações, indicação “Pode renovar?” ou “Necessário nova licitação”).
- **Histórico de reajustes**: lista de reajustes, reajuste acumulado nos últimos 12 meses e alerta quando &gt; 25%.
