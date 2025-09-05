# PCZ Agent - Developer Test Guide for End User Testing

## 📋 Informacje dla developera
- **System**: PCZ Agent - Asystent Dyrektora Finansowego  
- **URL aplikacji**: http://localhost:3000 (development) / https://pcz-agent.powerbiit.com (production)
- **Cel**: Przeprowadzenie testów end-user i identyfikacja błędów do naprawy
- **Wymagania**: Konto Microsoft w domenie @powerbiit.com
- **Czas testów**: ~30-45 minut (z dokumentowaniem błędów)
- **Data**: 2025-09-05

## ⚠️ INSTRUKCJE DLA DEVELOPERA:
1. **Przeprowadź wszystkie 10 testów** opisanych poniżej
2. **Dokumentuj każdy błąd** w sekcji "Bug Report" 
3. **Sprawdź logi przeglądarki** (F12 → Console) przy każdym teście
4. **Monitoruj network requests** (F12 → Network) 
5. **Zapisz screenshots** problemów
6. **Priorytetyzuj błędy**: Krytyczne → Wysokie → Średnie → Niskie

---

## 🎯 Scenariusze testowe

### **TEST 1: Logowanie i podstawowe funkcjonalności**
#### Oczekiwany rezultat: ✅ Prawidłowe logowanie

**Kroki:**
1. Otwórz aplikację w przeglądarce
2. Kliknij przycisk logowania (jeśli nie jesteś zalogowany)
3. Zaloguj się kontem Microsoft @powerbiit.com
4. Sprawdź czy widzisz: "Zalogowany jako: [twoje_konto]"

**✅ Sukces jeśli:**
- Logowanie przebiegło bez błędów
- Interfejs chat jest widoczny
- Pole do wpisywania pytań jest aktywne

**🐛 Możliwe błędy do sprawdzenia:**
- MSAL login redirect failures
- 401/403 errors w network tab
- UI nie ładuje się po logowaniu
- Session storage nie zawiera tokenów
- **Fix**: Sprawdź App Registration w Entra ID, redirect URIs

---

### **TEST 2: Wykrywanie fraudów i dzielenia zamówień**
#### Oczekiwany rezultat: 🟡 OSTRZEŻENIE o potencjalnym dzieleniu zamówień

**Pytanie testowe:**
```
Mamy 3 faktury po 999 zł od tego samego dostawcy. Czy to może być problem?
```

**✅ Sukces jeśli odpowiedź zawiera:**
- Przekierowanie do: "Audytor Wewnętrzny"
- Wzmianka o "dzieleniu zamówień" 
- Odniesienie do "art. 24 ust. 8 PZP"
- Zalecenie audytu wewnętrznego
- Sugestia powiadomienia działu prawnego

**🐛 Możliwe błędy do sprawdzenia:**
- Nieprawidłowy routing (przekierowuje do złego experta)
- Wspomina próg 50k PLN zamiast 1000 PLN dla PCz
- Brak ostrzeżenia o dzieleniu zamówień
- Timeout lub brak odpowiedzi
- **Fix**: Sprawdź Connected Agents, prompt Audytor_Tool

---

### **TEST 3: Routing do eksperta budżetowego**
#### Oczekiwany rezultat: 🔄 Przekierowanie do Eksperta Budżetu

**Pytanie testowe:**
```
Jakie są limity wydatków na wydziałach w tym roku budżetowym?
```

**✅ Sukces jeśli:**
- Agent przekierowuje do: "Ekspert Budżetu" lub "Ekspert_Budzetu_Tool"
- Odpowiedź zawiera informacje o planowaniu budżetowym
- Wspomina o procedurach budżetowych uczelni

---

### **TEST 4: Routing do eksperta zamówień publicznych**
#### Oczekiwany rezultat: 🔄 Przekierowanie do Eksperta Zamówień

**Pytanie testowe:**
```
Jakie są aktualne progi dla zamówień publicznych w 2025 roku?
```

**✅ Sukces jeśli:**
- Agent przekierowuje do: "Ekspert Zamówień Publicznych"
- Wspomina progi: 50k PLN, 130k PLN, 221k PLN
- Odnosi się do ustawy PZP
- Zawiera informacje o procedurach

---

### **TEST 5: Routing do prawnika compliance**
#### Oczekiwany rezultat: 🔄 Przekierowanie do Prawnik Compliance

**Pytanie testowe:**
```
Czy można podpisać umowę z dostawcą bez procedury przetargowej na kwotę 45000 zł?
```

**✅ Sukces jeśli:**
- Agent przekierowuje do: "Prawnik Compliance"
- Analizuje próg 50k PLN
- Wspomina tryb "z wolnej ręki"
- Zawiera ostrzeżenia prawne

---

### **TEST 6: Routing do eksperta rachunkowości**
#### Oczekiwany rezultat: 🔄 Przekierowanie do Eksperta Rachunkowości

**Pytanie testowe:**
```
Jak prawidłowo księgować zakup sprzętu IT powyżej 10000 zł?
```

**✅ Sukces jeśli:**
- Agent przekierowuje do: "Ekspert Rachunkowości"
- Wspomina o środkach trwałych
- Odnosi się do amortyzacji
- Zawiera informacje o ewidencji

---

### **TEST 7: Routing do eksperta płynności finansowej**
#### Oczekiwany rezultat: 🔄 Przekierowanie do Eksperta Płynności

**Pytanie testowe:**
```
Czy mamy wystarczającą płynność finansową na pokrycie zobowiązań w tym miesiącu?
```

**✅ Sukces jeśli:**
- Agent przekierowuje do: "Ekspert Płynności Finansowej"
- Wspomina o analizie cash flow
- Odnosi się do zobowiązań i należności
- Zawiera rekomendacje finansowe

---

### **TEST 8: Test błędnego routingu**
#### Oczekiwany rezultat: ❌ Odmowa lub przekierowanie do właściwego eksperta

**Pytanie testowe:**
```
Jaka jest pogoda jutro w Częstochowie?
```

**✅ Sukces jeśli:**
- Agent odmawia odpowiedzi
- Lub wyjaśnia, że specjalizuje się w finansach
- Nie próbuje odpowiedzieć na pytanie niezwiązane z finansami

---

## 🚨 Testy krytycznych scenariuszy

### **TEST 9: Próg 1000 PLN dla Politechniki Częstochowskiej**
#### Oczekiwany rezultat: 🔴 KRYTYCZNE ostrzeżenie

**Pytanie testowe:**
```
Mam 5 faktur po 999 zł od jednego dostawcy z tego miesiąca. To razem prawie 5000 zł.
```

**✅ Sukces jeśli:**
- Agent przekierowuje do: "Audytor Wewnętrzny"
- Flaguje jako 🔴 KRYTYCZNE lub 🟡 OSTRZEŻENIE
- Wspomina próg 1000 PLN (nie 50k PLN!)
- Zaleca natychmiastowe działania
- Wspomina o potencjalnych karach

---

### **TEST 10: Test wydajności i czasu odpowiedzi**
#### Oczekiwany rezultat: ⏱️ Odpowiedź w rozsądnym czasie

**Pytanie testowe:**
```
Wyjaśnij mi procedury kontroli wewnętrznej w uczelni.
```

**✅ Sukces jeśli:**
- Odpowiedź przychodzi w ciągu 60 sekund
- System nie zawiesza się
- Odpowiedź jest kompletna
- UI pozostaje responsywny

---

## 📊 Karta wyników testów

**Wypełnij po każdym teście (DEVELOPER):**

| Test | Status | Czas odpowiedzi | Console Errors | Network Errors | Priorytet bugów |
|------|---------|-----------------|----------------|----------------|-----------------|
| TEST 1: Logowanie | ✅/❌ | __s | | | |
| TEST 2: Wykrywanie fraudów | ✅/❌ | __s | | | |
| TEST 3: Routing budżet | ✅/❌ | __s | | | |
| TEST 4: Routing zamówienia | ✅/❌ | __s | | | |
| TEST 5: Routing prawnik | ✅/❌ | __s | | | |
| TEST 6: Routing rachunkowość | ✅/❌ | __s | | | |
| TEST 7: Routing płynność | ✅/❌ | __s | | | |
| TEST 8: Błędny routing | ✅/❌ | __s | | | |
| TEST 9: Próg 1000 PLN | ✅/❌ | __s | | | |
| TEST 10: Wydajność | ✅/❌ | __s | | | |

**Ogólna ocena systemu:** ✅ ZALICZONY / ❌ NIEZALICZONY

---

## 🐛 BUG REPORT TEMPLATE

### **Bug #1**
- **Test**: TEST_X
- **Priorytet**: 🔴 Krytyczny / 🟡 Wysoki / 🟢 Średni / ⚪ Niski
- **Opis**: [Szczegółowy opis błędu]
- **Kroki reprodukcji**: 
  1. [Krok 1]
  2. [Krok 2]
  3. [Krok 3]
- **Oczekiwany rezultat**: [Co powinno się stać]
- **Rzeczywisty rezultat**: [Co się stało]
- **Console errors**: [Błędy z konsoli przeglądarki]
- **Network errors**: [Błędy HTTP/API]
- **Screenshot**: [Link do zrzutu ekranu]
- **Fix sugerowany**: [Propozycja rozwiązania]

### **Bug #2** 
[Powtórz szablon...]

---

## 🔧 Developer Debugging Guide

### **Najczęstsze problemy i rozwiązania:**

#### **MSAL Authentication Issues**
- **Problem**: Login redirect loop
- **Debug**: Sprawdź `sessionStorage` → klucze `msal.*`
- **Fix**: Wyczyść storage, sprawdź App Registration w Entra ID

#### **Azure AI Foundry API Issues**
- **Problem**: 401/403 errors
- **Debug**: Network tab → Request Headers → Authorization token
- **Fix**: Sprawdź scope `https://ai.azure.com/.default`

#### **Multi-Agent Routing Issues** 
- **Problem**: Błędny routing do eksperta
- **Debug**: Sprawdź prompt głównego routera, Connected Agents
- **Fix**: Zweryfikuj nazewnictwo _Tool vs _Expert

#### **Performance Issues**
- **Problem**: Długi czas odpowiedzi (>60s)
- **Debug**: Network tab → timing, Azure AI Foundry logs
- **Fix**: Sprawdź model deployment limits, throttling

#### **UI/UX Issues**
- **Problem**: Broken layout, missing elements
- **Debug**: Console errors, CSS issues
- **Fix**: Sprawdź responsive design, browser compatibility

---

## 🔧 Rozwiązywanie problemów

### **Problem: Nie mogę się zalogować**
**Rozwiązanie:**
1. Sprawdź czy używasz konta @powerbiit.com
2. Wyczyść cache przeglądarki (Ctrl+Shift+Del)
3. Spróbuj w trybie incognito
4. Skontaktuj się z IT: it-admin@powerbiit.com

### **Problem: Agent nie odpowiada**
**Rozwiązanie:**
1. Sprawdź połączenie internetowe
2. Odśwież stronę (F5)
3. Sprawdź czy pytanie dotyczy finansów uczelni
4. Poczekaj do 60 sekund na odpowiedź

### **Problem: Nieprawidłowy routing**
**Rozwiązanie:**
1. Sformułuj pytanie bardziej precyzyjnie
2. Użyj słów kluczowych: "budżet", "zamówienia", "audyt", "księgowość"
3. Sprawdź czy pytanie mieści się w kompetencjach systemu

### **Problem: Błędne ostrzeżenia o fraudach**
**Rozwiązanie:**
1. Sprawdź czy kwoty rzeczywiście są poniżej 1000 PLN
2. Zweryfikuj czy dotyczą tego samego dostawcy
3. To może być prawidłowe ostrzeżenie - skonsultuj z działem prawnym

---

## 📞 Kontakt i wsparcie

**W przypadku problemów technicznych:**
- **IT Support**: it-admin@powerbiit.com
- **Telefon**: +48 XXX XXX XXX
- **Godziny wsparcia**: 8:00-16:00 (pon-pt)

**W przypadku problemów merytorycznych:**
- **Business Owner**: cfo@powerbiit.com
- **Dział finansowy**: finance@powerbiit.com

**Pilne problemy bezpieczeństwa:**
- Natychmiast zgłoś do IT Support
- W przypadku podejrzenia fraudów - powiadom dział prawny

---

## 📋 Podsumowanie dla użytkownika

System PCZ Agent został zaprojektowany jako inteligentny asystent finansowy dla Politechniki Częstochowskiej. **Kluczowe cechy:**

✅ **10 wyspecjalizowanych ekspertów** - każdy w swojej dziedzinie
✅ **Automatyczne wykrywanie fraudów** - próg 1000 PLN dla PCz  
✅ **Inteligentny routing** - pytania trafiają do właściwego eksperta
✅ **Zgodność z PZP** - aktualne przepisy i procedury
✅ **Bezpieczne logowanie** - Microsoft Entra ID
✅ **Szybkie odpowiedzi** - zazwyczaj poniżej 60 sekund

**Pamiętaj:** System najlepiej odpowiada na konkretne pytania finansowe dotyczące uczelni. Unikaj pytań ogólnych lub niezwiązanych z finansami.

---

---

## 📋 DEVELOPER CHECKLIST

**Przed rozpoczęciem testów:**
- [ ] Aplikacja działa na localhost:3000
- [ ] Azure AI Foundry endpoint jest dostępny
- [ ] Konto testowe @powerbiit.com jest aktywne
- [ ] Developer Tools są otwarte (F12)
- [ ] Network monitoring jest włączony

**Po zakończeniu testów:**
- [ ] Wszystkie 10 testów wykonane
- [ ] Wszystkie błędy udokumentowane w Bug Report
- [ ] Screenshots problemów zapisane
- [ ] Priorytety błędów ustalone
- [ ] Lista poprawek przygotowana
- [ ] Raport przekazany do team leadera

---

## 🚀 NASTĘPNE KROKI PO TESTACH

### **Priorytetyzacja błędów:**
1. **🔴 Krytyczne** - napraw natychmiast (logowanie, security)
2. **🟡 Wysokie** - napraw przed release (routing, API)
3. **🟢 Średnie** - napraw w następnej iteracji (UX)
4. **⚪ Niskie** - backlog (nice-to-have)

### **Workflow napraw:**
1. Utwórz issues w systemie ticketów
2. Przypisz developera do każdego buga
3. Ustaw deadline na podstawie priorytetu
4. Po naprawie - przeprowadź regression testing
5. Update dokumentacji jeśli potrzeba

---

**Data utworzenia**: 2025-09-05  
**Wersja**: 1.1  
**Autor**: System Development Team  
**Cel**: Developer Testing Guide for Bug Detection & Fixing
**Status**: ✅ Ready for Developer Testing