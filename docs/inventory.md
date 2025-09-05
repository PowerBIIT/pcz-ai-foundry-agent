# Azure AI Foundry - Inwentaryzacja zasobów

## Data utworzenia: 2025-09-05

## Typ projektu Azure AI Foundry
Zgodnie z dokumentacją Microsoft zalecany jest **Azure AI Foundry project** (nie hub-based) dla:
- Tworzenia agentów
- Pracy z modelami
- Dostępu do Azure AI Foundry API
- Natywnego wsparcia dla agentów w wersji GA

## Wymagane zasoby do utworzenia

### Podstawowe zasoby Azure
- **Subskrypcja Azure**: Wymagana
- **Grupa zasobów**: Do utworzenia lub istniejąca
- **Region**: Zalecany West Europe lub inny zgodny z Azure AI Foundry

### Azure AI Foundry
- **Azure AI Foundry project**: Do utworzenia (nie hub-based)
- **Agent**: Do utworzenia w projekcie
- **Endpoint**: Do utworzenia z autentykacją Entra ID

### Microsoft Entra ID
- **Server App Registration**: Do utworzenia z API scope
- **Client App Registration**: Do utworzenia dla SPA
- **Admin consent**: Wymagany dla uprawnień API

### Opcjonalne zasoby
- **API Management**: Warstwa Consumption dla dodatkowej ochrony i limitów

## Status zasobów
✅ **Zweryfikowane**:

### Subskrypcja Azure
- **Subscription ID**: 10bae9e5-c859-45d3-9d02-387a21865532
- **Name**: Pay-As-You-Go
- **Tenant ID**: e1a9f8ae-3694-47c3-b535-24915a84b304
- **User**: radoslaw.broniszewski@powerbiit.com

### Grupy zasobów
- **pcz** (swedencentral) - zawiera istniejące zasoby AI
- **Test_SQL** (polandcentral) - grupa testowa

### Istniejące zasoby AI
- **Nazwa**: pcz-agent-resource
- **Typ**: AIServices (multi-service account)  
- **Lokalizacja**: swedencentral
- **Grupa zasobów**: pcz
- **Identity**: SystemAssigned (Principal ID: 6a4462a7-f10b-4dbd-909a-1085baa8e397)

### Narzędzia Azure CLI
- **Wersja**: 2.72.0
- **Rozszerzenia zainstalowane**:
  - ml (2.38.1) - Azure Machine Learning/AI Foundry
  - ai-examples (0.2.5) - Preview

## Decyzje architektoniczne
Będę wykorzystywać istniejącą grupę zasobów "pcz" i region "swedencentral" dla spójności z istniejącymi zasobami AI.

## Następne kroki
1. ✅ Weryfikacja narzędzi Azure CLI - zakończona
2. Utworzenie projektu Azure AI Foundry w grupie "pcz"
3. Sprawdzenie czy można wykorzystać istniejący zasób AIServices