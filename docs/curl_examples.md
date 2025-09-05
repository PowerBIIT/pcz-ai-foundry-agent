# Azure AI Foundry Agent - Przykłady testów curl

## Data utworzenia: 2025-09-05

## Test z API Key (Tymczasowo)

### Pobieranie API Key
```bash
# Pobierz API key z Azure portal lub CLI
az cognitiveservices account keys list --name pcz-agent-resource --resource-group pcz
```

### Test wywołania agenta
```bash
curl -X POST https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent/agents/asst_iEwikcIGZdvImKNmalHfSHGm/chat/completions \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Jak przygotować przetarg na sprzęt IT?"
      }
    ],
    "stream": false
  }'
```

## Test z tokenem Azure AD (Docelowo)

### Pobieranie tokenu przez Device Code Flow
```bash
# Zainstaluj Azure CLI i zaloguj się
az login --scope api://1d311f71-ff00-4ac9-8012-614b53e8d722/Agent.Access

# Pobierz token
TOKEN=$(az account get-access-token --scope api://1d311f71-ff00-4ac9-8012-614b53e8d722/Agent.Access --query accessToken -o tsv)
```

### Test z tokenem AAD
```bash
curl -X POST https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent/agents/asst_iEwikcIGZdvImKNmalHfSHGm/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Jakie są limity dla zamówień publicznych?"
      }
    ],
    "stream": false
  }'
```

## Scenariusze testowe

### 1. Test pozytywny - poprawne zapytanie
**Zapytanie**: "Jak przygotować SIWZ?"
**Oczekiwana odpowiedź**: HTTP 200, routing do Eksperta Zamówień Publicznych

### 2. Test pozytywny - zapytanie wieloaspektowe
**Zapytanie**: "Sprawdzenie umowy z wykonawcą"
**Oczekiwana odpowiedź**: HTTP 200, zapytanie o doprecyzowanie obszaru

### 3. Test negatywny - brak tokenu
**Zapytanie**: Bez nagłówka Authorization
**Oczekiwana odpowiedź**: HTTP 401 Unauthorized

### 4. Test negatywny - token wygasły
**Zapytanie**: Z wygasłym tokenem
**Oczekiwana odpowiedź**: HTTP 401 Unauthorized

### 5. Test negatywny - niepoprawny scope
**Zapytanie**: Token bez scope Agent.Access
**Oczekiwana odpowiedź**: HTTP 403 Forbidden

## Monitoring błędów
- Sprawdzanie logów w Azure portal
- Monitoring Application Insights
- Alertowanie przy błędach 4xx/5xx