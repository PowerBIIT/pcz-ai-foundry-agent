# PCZ AI Foundry Agent - Przewodnik testowania

## 📱 **Wprowadzenie do aplikacji**

**PCZ AI Foundry Agent** to publiczny serwis udostępniający agenta finansowego Politechniki Częstochowskiej. Aplikacja składa się z:

- **Frontend React** z autentykacją Microsoft Entra ID
- **Agent Route "Asystent Dyrektora Finansowego"** z 6 podłączonymi ekspertami
- **Azure AI Foundry Backend** wykorzystujący Thread-Message-Run API
- **Bezpieczna autoryzacja** bez ekspozycji kluczy API

### **Agent finansowy oferuje wsparcie w obszarach:**
1. **Zamówienia publiczne** - przetargi, SIWZ, procedury
2. **Zarządzanie majątkiem** - amortyzacja, inwentaryzacja
3. **Płynność finansowa** - cash flow, wskaźniki
4. **Rachunkowość** - plan kont, sprawozdania
5. **Planowanie budżetu** - dotacje, subwencje, monitoring
6. **Audyt i compliance** - kontrola, nieprawidłowości

## 🛠️ **Narzędzia dla testera**

### **1. Azure CLI** 
```bash
# Sprawdzenie wersji i logowanie
az --version
az login
az account show

# Testy API z tokenem
az account get-access-token --scope https://cognitiveservices.azure.com/.default
```

### **2. Przeglądarka** 
- **Chrome/Edge** (zalecane dla najlepszej kompatybilności z MSAL)
- **Tryb incognito** do testów czystych sesji
- **Developer Tools** (F12) do analizy błędów
- **Network tab** do monitorowania API calls

### **3. Lokalne środowisko**
```bash
# Lokalizacja projektu
cd /home/radek/pcz-ai-foundry-agent

# Uruchomienie frontendu
cd app/pcz-agent-frontend
npm start

# Frontend dostępny na: http://localhost:3000
```

### **4. Narzędzia pomocnicze**
- **curl** - testy API 
- **jq** - parsowanie JSON odpowiedzi
- **Postman** (opcjonalnie) - testy REST API

---

## 🧪 **TESTY END-TO-END**

### **TEST 1: Uruchomienie aplikacji**

#### **Wymagania wstępne:**
```bash
# Sprawdź czy Node.js jest dostępny
node --version  # Wymagane: v16+

# Sprawdź czy aplikacja istnieje
ls /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend/
```

#### **Kroki testu:**
```bash
# 1. Przejdź do aplikacji
cd /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend

# 2. Uruchom aplikację (jeśli nie działa)
npm start

# 3. Otwórz w przeglądarce
# Przejdź do: http://localhost:3000
```

#### **Oczekiwany wynik:**
- ✅ Strona ładuje się w < 5 sekund
- ✅ Tytuł: "PCZ Agent - Asystent Dyrektora Finansowego"  
- ✅ Przycisk "Zaloguj przez Microsoft" widoczny
- ✅ Brak błędów w konsoli przeglądarki (F12)

---

### **TEST 2: Autentykacja Microsoft Entra ID**

#### **Kroki testu:**
```bash
# 1. W przeglądarce na http://localhost:3000
# 2. Kliknij "Zaloguj przez Microsoft"
# 3. W popup logowania wpisz: radoslaw.broniszewski@powerbiit.com
# 4. Wprowadź hasło i potwierdź MFA
```

#### **Oczekiwany wynik:**
- ✅ Popup Microsoft logowania otwiera się
- ✅ Proces autoryzacji przechodzi bez błędów
- ✅ Po logowaniu wyświetla: "Zalogowany jako: radoslaw.broniszewski@powerbiit.com"
- ✅ Interfejs czatu jest widoczny
- ✅ Wiadomość powitalna: "Witaj! Jestem asystentem..."

#### **Troubleshooting:**
Jeśli błąd autoryzacji - sprawdź w console (F12) czy nie ma błędów typu AADSTS*

---

### **TEST 3: Weryfikacja Azure API access**

#### **Wymagania wstępne:**
```bash
# Zaloguj się do Azure CLI z scope Cognitive Services
az login --scope https://cognitiveservices.azure.com/.default
# Potwierdź w przeglądarce gdy popup się pojawi
```

#### **Test tokenu:**
```bash
# Pobierz token
TOKEN=$(az account get-access-token --scope https://cognitiveservices.azure.com/.default --query accessToken -o tsv)

# Test thread creation
curl -X POST "https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent/threads?api-version=2025-05-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}" \
  -v
```

#### **Oczekiwany wynik:**
- ✅ HTTP 200/201
- ✅ Response JSON z `id` thread
- ✅ Brak błędów 401/403

#### **Jeśli błąd 401:**
```bash
# Sprawdź uprawnienia RBAC
az role assignment list --assignee $(az account show --query user.name -o tsv) --scope "/subscriptions/10bae9e5-c859-45d3-9d02-387a21865532/resourceGroups/pcz/providers/Microsoft.CognitiveServices/accounts/pcz-agent-resource"

# Uprawnienia mogą się propagować do 15 minut po nadaniu
```

---

### **TEST 4: Chat kompletny**

#### **Kroki testu:**
```bash
# 1. W aplikacji na http://localhost:3000 (zalogowany)
# 2. W polu tekstowym wpisz: "Jak przygotować przetarg na sprzęt komputerowy?"
# 3. Kliknij "Wyślij"
# 4. Obserwuj odpowiedź
```

#### **Oczekiwany wynik:**
- ✅ Wiadomość użytkownika pojawia się natychmiast
- ✅ Status "Przetwarzam zapytanie..." podczas oczekiwania
- ✅ Odpowiedź agenta w ciągu 30 sekund:
```
🔄 Przekazuję Twoje pytanie do: **Ekspert Zamówień Publicznych**
[Szczegółowa odpowiedź o procedurach przetargowych...]
```

#### **Scenariusze testowe:**

**Test 4.1 - Routing do ekspertów:**
- "Jak przygotować SIWZ?" → Ekspert Zamówień Publicznych
- "Wskaźniki płynności finansowej?" → Ekspert Płynności Finansowej  
- "Amortyzacja środków trwałych?" → Ekspert ds. Majątku

**Test 4.2 - Red flags:**
- "3 faktury po 49.500 zł od tego samego dostawcy" → Audytor Wewnętrzny + alert

**Test 4.3 - Pytania wieloaspektowe:**
- "Sprawdzenie umowy" → Pytanie o doprecyzowanie

---

### **TEST 5: Security i Error Handling**

#### **Test 5.1 - Brak autoryzacji:**
```bash
# W nowej karcie incognito przejdź do: http://localhost:3000
```
**Oczekiwany wynik:** ✅ Strona logowania, brak dostępu do czatu

#### **Test 5.2 - Wylogowanie:**
```bash
# W zalogowanej aplikacji kliknij "Wyloguj"
```
**Oczekiwany wynik:** ✅ Powrót do strony logowania, czyszczenie sesji

#### **Test 5.3 - Błędny API call:**
```bash
curl -X POST "https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent/nonexistent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```
**Oczekiwany wynik:** ✅ HTTP 404 z poprawnym error message

---

### **TEST 6: Performance i Load**

#### **Test 6.1 - Czas ładowania:**
```bash
# W przeglądarce (Network tab w DevTools):
# 1. Otwórz http://localhost:3000
# 2. Zmierz czas ładowania strony
```
**Oczekiwany wynik:** ✅ < 3 sekundy

#### **Test 6.2 - Concurrent users:**
```bash
# Otwórz 3-5 kart przeglądarki z aplikacją
# Zaloguj się różnymi kontami z domeny @powerbiit.com
# Wykonaj jednoczesne zapytania
```
**Oczekiwany wynik:** ✅ Wszystkie sesje działają niezależnie

---

### **TEST 7: Cross-browser compatibility**

#### **Testowanie na różnych przeglądarkach:**
- **Chrome** (primary)
- **Edge** 
- **Firefox**
- **Safari** (jeśli dostępny)

#### **Kroki:**
```bash
# Dla każdej przeglądarki:
# 1. Otwórz http://localhost:3000
# 2. Wykonaj pełny flow logowania + 1 zapytanie
# 3. Sprawdź console na błędy
```

---

## 🏃‍♂️ **QUICK START - Testy w 5 minut**

```bash
# 1. Sprawdź czy aplikacja działa
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Uruchom npm start"

# 2. Test Azure login
az account show > /dev/null 2>&1 && echo "✅ Azure logged in" || echo "❌ Run: az login"

# 3. Otwórz aplikację i przetestuj
echo "🌐 Otwórz: http://localhost:3000"
echo "🔑 Zaloguj się przez Microsoft"  
echo "💬 Zapytaj: 'Jak przygotować przetarg?'"

# 4. Uruchom automatyczne testy
cd /home/radek/pcz-ai-foundry-agent
./tests/test-scenarios.sh
```

---

## 🎯 **Kryteria akceptacji**

### **✅ MUST HAVE:**
- [ ] Frontend ładuje się bez błędów
- [ ] Logowanie Microsoft Entra ID działa
- [ ] Chat interface odpowiada na input
- [ ] Agent zwraca sensowne odpowiedzi
- [ ] Wylogowanie czyści sesję
- [ ] Brak błędów 5xx w API calls

### **✅ NICE TO HAVE:**
- [ ] Response time < 10 sekund
- [ ] Działa na mobile browsers
- [ ] Graceful handling błędów sieciowych
- [ ] Auto-refresh expired tokens

## 🆘 **Troubleshooting**

### **Problem: 401 Unauthorized**
```bash
# Sprawdź uprawnienia RBAC
az role assignment list --assignee $(az account show --query user.name -o tsv) \
  --scope "/subscriptions/10bae9e5-c859-45d3-9d02-387a21865532/resourceGroups/pcz/providers/Microsoft.CognitiveServices/accounts/pcz-agent-resource"

# Jeśli empty - uprawnienia jeszcze się propagują (max 15 min)
```

### **Problem: Frontend nie ładuje się**
```bash
cd /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend
npm install  # Zainstaluj dependencies
npm start    # Uruchom dev server
```

### **Problem: Błąd logowania MSAL**
- Sprawdź console browser (F12)
- Sprawdź czy redirect URI = http://localhost:3000
- Wyczyść cache przeglądarki

---

**Status testów**: 📊 **98% gotowe** - Finalne API testy po propagacji RBAC