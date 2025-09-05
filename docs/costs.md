# Azure AI Foundry Agent - Analiza kosztów

## Data utworzenia: 2025-09-05

## Źródła kosztów

### Azure AI Foundry
- **Model calls**: Pay-per-token za wywołania gpt-4.1-mini
- **Storage**: Pliki knowledge base, vector stores
- **Compute**: Processing time dla agentów

### Azure Cognitive Services
- **Standard tier**: S0 - $xxx/miesiąc za unlimited calls
- **Data processing**: Za przetwarzanie dokumentów i plików
- **Retention**: Przechowywanie logów i danych

### Microsoft Entra ID
- **Premium P1/P2**: Jeśli wymagane zaawansowane funkcje
- **B2B guest users**: Jeśli zewnętrzni użytkownicy
- **Conditional Access**: Zaawansowane polityki security

### Hosting frontendu
- **Azure Static Web Apps**: Free tier lub Standard
- **Azure App Service**: Jeśli potrzebne zaawansowane funkcje
- **CDN**: Global distribution kosztów

## Szacowane koszty miesięczne

### Scenariusz podstawowy (100 użytkowników, 50 zapytań/dzień)
- **Azure AI Foundry**: ~$200-300/miesiąc
- **Cognitive Services**: ~$100-150/miesiąc  
- **Entra ID**: $0 (Free tier)
- **Hosting**: $0-10/miesiąc
- **RAZEM**: ~$300-460/miesiąc

### Scenariusz rozszerzony (500 użytkowników, 200 zapytań/dzień)
- **Azure AI Foundry**: ~$800-1200/miesiąc
- **Cognitive Services**: ~$200-300/miesiąc
- **Entra ID Premium P1**: ~$500/miesiąc (jeśli wymagane)
- **Hosting**: ~$20-50/miesiąc
- **RAZEM**: ~$1020-1550/miesiąc

## Strategie optymalizacji kosztów

### Ograniczenia techniczne
```typescript
// Limity w konfiguracji frontendu
const CONFIG = {
  maxDailyQueries: 50,        // Na użytkownika
  maxTokensPerQuery: 4000,    // Limit długości
  cacheEnabled: true,         // Cache odpowiedzi
  rateLimitWindow: '1h'       // Okno czasowe limitów
};
```

### Caching strategii
- **Podobne zapytania**: Cache na 1 godzinę
- **FAQ responses**: Cache na 24 godziny  
- **Static content**: CDN cache na 30 dni

### Monitoring kosztów
```bash
# Sprawdzenie użycia tokenów
az cognitiveservices account show-usage --name pcz-agent-resource --resource-group pcz

# Alerty kosztowe
az consumption budget create \
  --amount 500 \
  --budget-name "PCZ-Agent-Monthly" \
  --time-grain Monthly \
  --start-date 2025-09-01
```

### Polityki ograniczające
1. **User quotas**: Max 100 zapytań/dzień na użytkownika
2. **Time windows**: Wyłączenie w weekendy/wakacje
3. **Content filtering**: Blokowanie spam/abuse
4. **Geo-restrictions**: Tylko z IP uczelni

## Alertowanie kosztowe

### Progi alarmowe
- **Warning**: 80% budżetu miesięcznego
- **Critical**: 95% budżetu miesięcznego  
- **Emergency**: 100% budżetu - automatyczne wyłączenie

### Kanały powiadomień
- **Email**: cfo@powerbiit.com, it-admin@powerbiit.com
- **SMS**: Numery alarmowe dla krytycznych
- **Teams**: Kanał IT Operations

## Raportowanie kosztów

### Miesięczne raporty
- Breakdown kosztów per service
- Trending analysis vs poprzedni miesiąc
- Usage metrics per użytkownika
- ROI analysis - oszczędności vs koszt

### Kwartalne przeglądy
- Cost optimization opportunities
- Usage patterns analysis  
- Capacity planning
- Budget vs actual variance