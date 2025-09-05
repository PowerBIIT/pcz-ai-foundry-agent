# Azure AI Foundry Agent - Runbook Operacyjny

## Data utworzenia: 2025-09-05

## Rotacja sekretów

### API Keys Azure Cognitive Services
```bash
# Regeneracja primary key
az cognitiveservices account keys regenerate --name pcz-agent-resource --resource-group pcz --key-name Key1

# Regeneracja secondary key  
az cognitiveservices account keys regenerate --name pcz-agent-resource --resource-group pcz --key-name Key2
```

**Częstotliwość**: Co 90 dni
**Odpowiedzialność**: IT Administrator

### Certyfikaty Entra ID
```bash
# Dodanie nowego certyfikatu
az ad app credential reset --id 1d311f71-ff00-4ac9-8012-614b53e8d722 --create-cert

# Usunięcie starego certyfikatu
az ad app credential delete --id 1d311f71-ff00-4ac9-8012-614b53e8d722 --key-id OLD_KEY_ID
```

**Częstotliwość**: Co 365 dni
**Odpowiedzialność**: Security Administrator

## Zasady aktualizacji

### Frontend
1. Test na środowisku dev
2. Deploy na staging 
3. Testy UAT przez użytkowników biznesowych
4. Deploy na production w oknie maintenance

### Azure AI Foundry projekt
- Aktualizacje automatyczne przez Microsoft
- Monitoring po aktualizacjach modeli
- Backup konfiguracji agentów przed zmianami

## Procedura rollback

### Frontend
```bash
# Rollback do poprzedniej wersji
cd /home/radek/deployment/app/pcz-agent-frontend
git checkout tags/v1.0.0
npm run build
# Deploy poprzedniej wersji
```

### Konfiguracja Entra ID
```bash
# Przywrócenie poprzednich uprawnień
az ad app permission grant --id CLIENT_APP_ID --api SERVER_APP_ID --scope Agent.Access
```

## RACI Matrix

| Zadanie | Responsible | Accountable | Consulted | Informed |
|---------|-------------|-------------|-----------|----------|
| Rotacja API Keys | IT Admin | IT Manager | Security | Business |
| Aktualizacja frontendu | Developer | Tech Lead | Business | End Users |
| Monitoring błędów | DevOps | IT Manager | Developer | Business |
| Backup konfiguracji | IT Admin | IT Manager | - | Security |
| Incydenty security | Security Admin | CISO | IT Manager | Board |

## Kontakty alarmowe

- **IT Manager**: manager@powerbiit.com
- **Security Administrator**: security@powerbiit.com  
- **Business Owner**: cfo@powerbiit.com
- **Microsoft Support**: Portal Azure

## Procedury awaryjne

### Agent nie odpowiada
1. Sprawdzić status Azure AI Foundry w portal.azure.com
2. Zweryfikować logi Application Insights
3. Sprawdzić limity usage w Cognitive Services
4. Kontakt z Microsoft Support jeśli potrzebne

### Błędy autentykacji
1. Sprawdzić status Entra ID w admin.microsoft.com
2. Zweryfikować uprawnienia aplikacji
3. Sprawdzić certyfikaty i ich ważność
4. Przeprowadzić test logowania

### Problemy z frontendem
1. Sprawdzić dostępność hosting environment
2. Zweryfikować konfigurację DNS
3. Sprawdzić logi aplikacji
4. Rollback do stabilnej wersji jeśli potrzebne