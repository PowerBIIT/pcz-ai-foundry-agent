# 🚨 CRITICAL BUG REPORT - PCZ Agent Testing

## Bug Report #1

**Test Phase**: KRYTYCZNY TEST WYKRYWANIA FRAUDÓW
**Priority**: 🔴 CRITICAL 
**Component**: Azure AI Foundry Backend / Audytor_Tool Agent

## Description
System wykrywania fraudów używa **ZŁEGO PROGU 50k PLN** zamiast wymaganego **1000 PLN** dla Politechniki Częstochowskiej.

## Steps to Reproduce
1. Zaloguj się do aplikacji (http://localhost:3000)
2. Wpisz zapytanie: "Mamy 3 faktury po 999 zł od tego samego dostawcy. Czy to może być problem?"
3. Wyślij zapytanie
4. Obserwuj odpowiedź

## Expected Behavior
Audytor_Tool powinien wspomnieć próg **1000 PLN** dla Politechniki Częstochowskiej i wygenerować ostrzeżenie o potencjalnym dzieleniu zamówień.

## Actual Behavior
Agent odpowiada: "Choć pojedyncze kwoty są znacznie poniżej progu **50 000 PLN**" - używa nieprawidłowy próg!

## Console Errors
Brak błędów konsoli - problem w konfiguracji agenta Azure AI Foundry.

## Network Errors
- Response time: ~31 sekund (OK, < 60s)
- HTTP Status: 200 OK
- Agent routing: ✅ Poprawnie przekazał do Audytora Wewnętrznego

## Screenshot
![Critical Bug](02-CRITICAL-BUG-wrong-threshold.png)

## Suggested Fix
Należy zaktualizować prompt Audytor_Tool w Azure AI Foundry, aby używał progu 1000 PLN zamiast 50k PLN.

## Impact
**KRYTYCZNY** - Może prowadzić do niewykrycia naruszeń PZP w Politechnice Częstochowskiej, co ma poważne konsekwencje prawne i finansowe.

---

## Bug Report #2

**Test Phase**: PHASE 3 (Connected Agent Routing)
**Priority**: 🔴 CRITICAL 
**Component**: Azure AI Foundry Backend / Main Router

## Description
Connected Agents routing nie działa poprawnie - główny router przekazuje tylko komunikat "[Deleguj do Connected Agent - pozwól mu odpowiedzieć]" ale nie pokazuje rzeczywistej odpowiedzi od Connected Agent.

## Steps to Reproduce
1. Wyślij zapytanie o fraud detection
2. Agent przekazuje do "Audytor Wewnętrzny"
3. Odpowiedź kończy się na "[Deleguj do Connected Agent - pozwól mu odpowiedzieć]"
4. Brak pełnej odpowiedzi od Connected Agent

## Expected Behavior
Powinien pokazać pełną odpowiedź od Connected Agent z analizą progów i ostrzeżeniami.

## Actual Behavior
Routing działa (przekazuje do Audytora) ale nie ma pełnej odpowiedzi od Connected Agent.

## Suggested Fix
Sprawdzić i naprawić konfigurację Connected Agents w głównym router agent (asst_iEwikcIGZdvImKNmalHfSHGm).

## Impact
**KRYTYCZNY** - System multi-agent nie funkcjonuje, użytkownicy nie otrzymują kompletnych odpowiedzi.

---

## Status
❌ **SYSTEM FAILING** - 2 krytyczne błędy wykryte:
1. ✅ NAPRAWIONY: Próg fraudów (50k→1000 PLN) 
2. ❌ AKTYWNY: Connected Agent routing nie działa