# PCZ Agent - Asystent Dyrektora Finansowego

Aplikacja React do komunikacji z Azure AI Foundry Agent służąca jako asystent finansowy dla Politechniki Częstochowskiej.

## 📋 Spis treści

- [Opis projektu](#opis-projektu)
- [Architektura](#architektura)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Konfiguracja](#konfiguracja)
- [Uruchomienie](#uruchomienie)
- [Deployment](#deployment)
- [Bezpieczeństwo](#bezpieczeństwo)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)
- [API Reference](#api-reference)

## 🎯 Opis projektu

PCZ Agent to aplikacja Single-Page Application (SPA) zbudowana w React + TypeScript, która zapewnia bezpieczny dostęp do AI Agent działającego na platformie Azure AI Foundry. Agent specjalizuje się w zagadnieniach finansowych uczelni i posiada dostęp do 10 wyspecjalizowanych ekspertów z poprawioną konfiguracją Connected Agents.

### Główne funkcjonalności:
- ✅ **Multi-user support** - Izolacja sesji między użytkownikami
- ✅ **File attachments** - Upload i analiza dokumentów (PDF, DOCX, XLSX, TXT, MD)
- ✅ **Document analysis** - Connected Agents analizują przesłane pliki
- ✅ **Expert routing** - 10 wyspecjalizowanych ekspertów finansowych
- ✅ **Fraud detection** - Automatyczne wykrywanie dzielenia zamówień (próg 1000 PLN)
- ✅ **Citations display** - Professional wyświetlanie źródeł i referencji
- ✅ **Compact UI** - Modern chat interface z attachment icon
- ✅ **Session management** - Persistent sessions z localStorage
- ✅ **Real-time progress** - Multi-step progress tracking
- ✅ **Error handling** - Graceful degradation i user feedback
- ✅ **MSAL authentication** - Secure Microsoft Entra ID integration
- ✅ **Azure AI Foundry** - Real-time communication z Connected Agents
- ✅ **Toast notifications** - Professional user feedback system
- ✅ **Responsive design** - Mobile-friendly interface
- ✅ **TypeScript** - Full type safety i developer experience

## 🏗️ Architektura

### Komponenty systemu:
- **Frontend**: React 19.x + TypeScript + MSAL
- **Autentykacja**: Microsoft Entra ID (OAuth 2.0 + PKCE)
- **Backend AI**: Azure AI Foundry Multi-Agent Service
- **Main Router**: GPT-4.1 (Asystent Dyrektora Finansowego)
- **Connected Agents**: 10x GPT-4.1-mini experts (wszystkie z dynamicznymi promptami)
- **Search Integration**: GoogleSearch action dla internetu
- **Hosting**: Azure Static Web Apps (docelowo)

### Przepływ autentykacji i routing:
1. Użytkownik loguje się przez Microsoft Entra ID (MSAL)
2. Frontend uzyskuje token Azure AI scope
3. Token jest używany do wywołań API agenta
4. Main Router (GPT-4.1) analizuje zapytanie i przekazuje do odpowiedniego Connected Agent
5. Connected Agent (GPT-4.1-mini) odpowiada z identyfikacją 🔍 i cytowaniem źródeł
6. W razie potrzeby agent używa GoogleSearch dla aktualnych informacji

## 🔧 Wymagania

### Wymagania systemowe:
- Node.js >= 16.x
- npm >= 8.x
- Nowoczesna przeglądarka z obsługą ES2020

### Wymagania Azure:
- Subskrypcja Azure z dostępem do AI Foundry
- Microsoft Entra ID tenant
- Skonfigurowane App Registration (SPA)

## 📦 Instalacja

1. **Klonowanie repozytorium:**
```bash
git clone <repository-url>
cd pcz-ai-foundry-agent/app/pcz-agent-frontend
```

2. **Instalacja zależności:**
```bash
npm install
```

3. **Weryfikacja instalacji:**
```bash
npm audit --audit-level=moderate
```

## ⚙️ Konfiguracja

### 1. Zmienne środowiskowe

Utwórz pliki `.env.development` i `.env.production`:

**`.env.development`:**
```env
REACT_APP_CLIENT_ID=0f20f494-53de-4cb2-b5ec-44fabfc31272
REACT_APP_TENANT_ID=e1a9f8ae-3694-47c3-b535-24915a84b304
REACT_APP_AUTHORITY=https://login.microsoftonline.com/e1a9f8ae-3694-47c3-b535-24915a84b304
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_AGENT_ENDPOINT=https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent
REACT_APP_AGENT_ID=asst_iEwikcIGZdvImKNmalHfSHGm
REACT_APP_SCOPE=https://ai.azure.com/.default
```

**`.env.production`:**
```env
REACT_APP_CLIENT_ID=0f20f494-53de-4cb2-b5ec-44fabfc31272
REACT_APP_TENANT_ID=e1a9f8ae-3694-47c3-b535-24915a84b304
REACT_APP_AUTHORITY=https://login.microsoftonline.com/e1a9f8ae-3694-47c3-b535-24915a84b304
REACT_APP_REDIRECT_URI=https://pcz-agent.powerbiit.com
REACT_APP_AGENT_ENDPOINT=https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent
REACT_APP_AGENT_ID=asst_iEwikcIGZdvImKNmalHfSHGm
REACT_APP_SCOPE=https://ai.azure.com/.default
```

### 2. Konfiguracja Microsoft Entra ID

**App Registration Settings:**
- **Nazwa**: PCZ Agent Frontend Client
- **Client ID**: `0f20f494-53de-4cb2-b5ec-44fabfc31272`
- **Typ**: Single-page application (SPA)
- **Redirect URIs SPA**: 
  - `http://localhost:3000` (development)
  - `https://pcz-agent.azurewebsites.net` (staging)
  - `https://pcz-agent.powerbiit.com` (production)
- **Implicit Grant**: Access tokens + ID tokens enabled

### 3. Konfiguracja Azure AI Foundry

**Szczegóły usługi:**
- **Resource**: pcz-agent-resource
- **Endpoint**: https://pcz-agent-resource.services.ai.azure.com/
- **Main Router Agent ID**: asst_iEwikcIGZdvImKNmalHfSHGm
- **Router Model**: GPT-4.1 (inteligentny routing z instrukcjami dla sub-agentów)
- **Connected Agents Model**: GPT-4.1-mini (10 ekspertów - wszystkie z dynamicznymi promptami)
- **API Version**: 2025-05-01 (GA)
- **Special Features**: GoogleSearch, agent identification, citations, NO hardcoded data

## 🚀 Uruchomienie

### Development Server
```bash
npm start
```
Aplikacja będzie dostępna na `http://localhost:3000`

### Production Build
```bash
npm run build
```
Build zostanie utworzony w folderze `build/`

### Testy
```bash
npm test
```

### Linting & Type Check
```bash
npm run build  # Zawiera type checking
```

## 🌐 Deployment

### Azure Static Web Apps (Zalecane)

1. **Przygotowanie buildu:**
```bash
npm run build
```

2. **Deploy przez Azure CLI:**
```bash
az staticwebapp create \
  --name pcz-agent-frontend \
  --resource-group pcz \
  --location "West Europe" \
  --source ./build \
  --branch main
```

3. **Konfiguracja Custom Domain:**
```bash
# Dodaj CNAME record: pcz-agent.powerbiit.com -> <static-web-app-url>
az staticwebapp hostname set \
  --name pcz-agent-frontend \
  --hostname pcz-agent.powerbiit.com
```

### Inne opcje hostingu:
- **Azure App Service**
- **Netlify**
- **Vercel**
- **GitHub Pages**

## 🔐 Bezpieczeństwo

### Implemented Security Features:

1. **Key-less Authentication**
   - Brak kluczy API w kodzie frontend
   - Wszystkie wywołania używają user context tokens

2. **MSAL Security**
   - PKCE (Proof Key for Code Exchange)
   - Secure token storage w sessionStorage
   - Automatic token refresh

3. **CORS & CSP**
   - Proper origin validation
   - Content Security Policy headers (w hosting)

4. **Environment Isolation**
   - Osobne konfiguracje dla dev/staging/prod
   - Secure secrets management

### Security Best Practices:

```typescript
// ✅ Prawidłowo - bez kluczy API
const response = await instance.acquireTokenSilent({
  scopes: ["https://ai.azure.com/.default"],
  account: accounts[0]
});

// ❌ Nieprawidłowo - nie rób tego!
const API_KEY = "sk-xxxxxxxxxxxxx"; // NIGDY!
```

## 🐛 Rozwiązywanie problemów

### Problemy z logowaniem

**Error: AADSTS9002326 - Cross-origin token redemption**
```bash
# Rozwiązanie: Sprawdź konfigurację SPA w Entra ID
az ad app show --id 0f20f494-53de-4cb2-b5ec-44fabfc31272 --query "spa.redirectUris"

# Upewnij się, że redirect URIs są w sekcji SPA, nie Web
```

**Error: Token refresh failed**
```typescript
// Rozwiązanie: Wyczyść cache i zaloguj ponownie
localStorage.clear();
sessionStorage.clear();
// Odśwież stronę
```

### Problemy z Azure AI Foundry

**Error: 401 Unauthorized**
```typescript
// Sprawdź scope w token request
const response = await instance.acquireTokenSilent({
  scopes: ["https://ai.azure.com/.default"], // Prawidłowy scope
  account: accounts[0]
});
```

**Error: 404 Not Found**
```bash
# Sprawdź endpoint i agent ID
echo "Endpoint: $REACT_APP_AGENT_ENDPOINT"
echo "Agent ID: $REACT_APP_AGENT_ID"
```

### Diagnostyka

```bash
# Sprawdzenie logów
npm start
# Otwórz Developer Tools -> Console

# Sprawdzenie network requests
# Developer Tools -> Network -> Filter by "foundry" or "ai.azure"

# Sprawdzenie MSAL cache
# sessionStorage -> klucze rozpoczynające się od "msal"
```

## 📡 API Reference

### Azure AI Foundry Agent API

**Base URL:** `https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent`

**Authentication:** Bearer Token (Azure AD)

**API Version:** `2025-05-01`

#### Endpoints:

1. **Create Thread**
```http
POST /threads?api-version=2025-05-01
Authorization: Bearer {token}
Content-Type: application/json

{}
```

2. **Add Message**
```http
POST /threads/{thread_id}/messages?api-version=2025-05-01
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "user",
  "content": "Twoje pytanie"
}
```

3. **Create Run**
```http
POST /threads/{thread_id}/runs?api-version=2025-05-01
Authorization: Bearer {token}
Content-Type: application/json

{
  "assistant_id": "asst_iEwikcIGZdvImKNmalHfSHGm"
}
```

4. **Get Run Status**
```http
GET /threads/{thread_id}/runs/{run_id}?api-version=2025-05-01
Authorization: Bearer {token}
```

5. **Get Messages**
```http
GET /threads/{thread_id}/messages?api-version=2025-05-01
Authorization: Bearer {token}
```

### Response Example:

```json
{
  "data": [
    {
      "id": "msg_xxx",
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": {
            "value": "Odpowiedź asystenta finansowego..."
          }
        }
      ],
      "created_at": 1725557951
    }
  ]
}
```

## 📚 Dodatkowe zasoby

### Dokumentacja techniczna:
- [Azure AI Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/)
- [MSAL React Guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)
- [Microsoft Entra ID Best Practices](https://learn.microsoft.com/en-us/entra/identity-platform/)

### Monitoring i koszty:
- Szczegóły kosztów: `../docs/costs.md`
- Procedury operacyjne: `../docs/runbook.md`
- Testy końcowe: `../docs/curl_examples.md`

### Kontakt:
- **IT Administrator**: it-admin@powerbiit.com
- **Business Owner**: cfo@powerbiit.com
- **Microsoft Support**: Portal Azure

---

## 📄 Licencja

Projekt wewnętrzny Politechniki Częstochowskiej.

**Ostatnia aktualizacja**: 2025-09-07  
**Wersja**: 2.0.0 ENTERPRISE  
**Status**: 🏆 ALL SPRINTS COMPLETE - Enterprise-grade multi-user CFO tool

### 🏆 Changelog v2.0.0 ENTERPRISE COMPLETE (2025-09-07):

**🎯 ALL DEVELOPMENT SPRINTS COMPLETED:**

**SPRINT 1 - Core Enhancements:**
- ✅ **Multi-user support** - Complete session isolation z localStorage
- ✅ **File attachments** - Real Azure AI Foundry integration + document analysis  
- ✅ **Enhanced chat** - New conversation + progress tracking + error handling

**SPRINT 2A - Advanced Features:**  
- ✅ **Citations display** - Professional source management infrastructure
- ✅ **Error handling** - Clean operation bez false warnings
- ✅ **Streaming architecture** - Infrastructure z proper Azure fallbacks

**SPRINT 2B - Visual Experience:**
- ✅ **Agent avatars** - Visual identification (💰 📋 🔍) z animations
- ✅ **Enhanced loading** - Multi-step progress visualization  
- ✅ **Chat history** - Complete service layer implemented

**SPRINT 3 - Professional Tools:**
- ✅ **PDF Export** - Working report generation z PCz branding
- ✅ **Saved responses** - Bookmark system z categorization
- ✅ **Power user features** - Keyboard shortcuts + slash commands infrastructure

**🧪 COMPREHENSIVE BROWSER TESTING:**
- ✅ All features verified working w real environment
- ✅ PDF export: 7.5KB professional report generated  
- ✅ File upload: Real Azure IDs + agent analysis
- ✅ Expert routing: Multiple agents tested + working
- ✅ Visual indicators: Agent avatars + typing animations
- ✅ Session management: Multi-user isolation verified

**📊 AKTUALNE NAZWY CONNECTED AGENTS (wszystkie z dynamicznymi promptami):**
1. **Ekspert_Zamowien_Tool** - Zamówienia publiczne (GoogleSearch dla progów PZP)
2. **Ekspert_Majatku_Tool** - Środki trwałe (dynamiczne dane amortyzacji)
3. **Ekspert_Plynnosci_Tool** - Cash flow (real-time analiza)
4. **Ekspert_Rachunkowosci_Tool** - Księgowość (aktualne plany kont)
5. **Ekspert_Budzetu_Tool** - Planowanie budżetu (live dane budżetowe)
6. **Ekspert_Zarzadzen_Tool** - Procedury (aktualne zarządzenia)
7. **Prawnik_Compliance_Tool** - Aspekty prawne (najnowsze prawo PZP)
8. **Strateg_Tool** - Strategia finansowa (trendy rynkowe)
9. **Audytor_Tool** - Kontrola wewnętrzna (dynamiczne progi fraudów)
10. **Mentor_Tool** - Szkolenia, onboarding CFO (najnowsze metodologie)

**🎯 KLUCZOWE INSTRUKCJE DLA CONNECTED AGENTS:**
- **Identyfikacja**: Zawsze rozpoczynaj od "🔍 [Nazwa Eksperta] odpowiada:"
- **GoogleSearch**: Użyj internetu gdy informacje nieaktualne lub brakujące
- **Citations**: Cytuj źródła w formacie [Dokument.pdf, str X] lub [URL]
- **Specificity**: Odpowiadaj tylko na zapytania z Twojej domeny eksperckiej
- **NO HARDCODED DATA**: Wszystkie wartości pobierane dynamicznie!
