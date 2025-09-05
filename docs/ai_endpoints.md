# Azure AI Foundry Endpoints

## Data utworzenia: 2025-09-05

## Główny Agent Route
- **Nazwa**: Asystent Dyrektora Finansowego
- **ID**: asst_iEwikcIGZdvImKNmalHfSHGm
- **Model**: gpt-4.1-mini
- **Utworzony**: 3 września 2025 10:56
- **Tools**: Files, OpenAPI, Connected agents (6)

## Podłączeni eksperci
1. Mentor_Expert
2. Audytor_Expert  
3. Strateg_Expert
4. Prawnik_Expert
5. Zarzadzenia_Expert
6. Budzet_Expert

## Endpoint projektu Azure AI Foundry
- **URL**: https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent
- **Typ autentykacji**: API Key + Token AAD (docelowo)
- **Region**: swedencentral

## Dostępne modele w deployment
- gpt-4.1 (50 TPM, 50k limit)
- gpt-4.1-mini (100 TPM, 100k limit) - używany przez agentów
- gpt-4.1-nano (200 TPM, 200k limit)
- gpt-4o (50 TPM, 50k limit)
- gpt-5-mini (20 TPM, 20k limit)

## Następne kroki
1. Konfiguracja Microsoft Entra ID dla autentykacji
2. Utworzenie aplikacji serwerowej i klienckiej
3. Frontend z logowaniem MSAL