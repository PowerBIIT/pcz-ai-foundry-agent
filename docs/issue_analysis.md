# Problem z dokumentacją Azure AI Foundry Agents

## Data: 2025-09-05
## Status: BLOKADA - wymagana analiza ścieżek alternatywnych

## Opis problemu
Podczas próby znalezienia dokumentacji do tworzenia agentów w Azure AI Foundry napotkano następujące problemy:

1. **404 Not Found** na standardowych ścieżkach dokumentacji:
   - https://learn.microsoft.com/en-us/azure/ai-studio/how-to/develop/create-agent
   - https://learn.microsoft.com/en-us/azure/ai-studio/concepts/agents

2. **Rozjazd między dokumentacją a rzeczywistością**:
   - Główna strona Azure AI Studio mówi o "agent factory" ale brak szczegółowej dokumentacji
   - Azure CLI ma rozszerzenie `ml` ale nie zawiera komend specyficznych dla agentów

## Dwie alternatywne ścieżki

### Ścieżka A: Portal Azure AI Foundry (Zalecana)
**Analiza ryzyka**: NISKIE
- Wykorzystanie portalu https://ai.azure.com do ręcznego utworzenia agenta
- Udokumentowanie kroków przez zrzuty ekranu
- Następnie wdrożenie agenta jako endpoint przez portal

**Analiza kosztu**: NISKI
- Czas: ~30-45 minut na eksplorację i dokumentację
- Może być mniej automatyczny, ale zawsze aktualny

**Następne kroki**:
1. Login do https://ai.azure.com 
2. Nawigacja do projektu pcz-agent-project
3. Eksploracja opcji tworzenia agenta
4. Dokumentacja procesu w docs/create_agent_portal.md

### Ścieżka B: Azure AI Services API (Alternatywna)
**Analiza ryzyka**: ŚREDNIE
- Wykorzystanie REST API Azure AI Services bezpośrednio
- Może wymagać dużej ilości eksperymentowania z API
- Brak gwarancji kompatybilności z Azure AI Foundry

**Analiza kosztu**: WYSOKI  
- Czas: ~2-3 godziny na research i implementację
- Może nie być kompatybilne z ekosystemem AI Foundry

## Rekomendacja
Wybieram **Ścieżkę A** - portal Azure AI Foundry, ponieważ:
1. Najmniejsze ryzyko i koszt
2. Najbardziej aktualny interfejs
3. Możliwość dokumentowania każdego kroku
4. Zgodność z Azure AI Foundry ekosystemem