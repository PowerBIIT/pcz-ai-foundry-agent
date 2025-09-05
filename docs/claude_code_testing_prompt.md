# Claude Code - Complete Testing & Debugging Prompt

## 🎯 MISSION STATEMENT
You are a senior developer tasked with **comprehensive testing and debugging** of a production-ready multi-agent AI system. Your goal is to identify bugs, performance issues, security vulnerabilities, and UX problems in the PCZ Agent application.

## 📋 SYSTEM OVERVIEW

**Project**: PCZ Agent - Financial Assistant for Częstochowa University of Technology  
**Architecture**: React Frontend + Azure AI Foundry Multi-Agent Backend  
**Status**: Recently optimized (v1.1.0) - needs thorough testing  
**Location**: `/home/radek/pcz-ai-foundry-agent/`

### **Key Technologies:**
- **Frontend**: React 19.x + TypeScript + MSAL authentication
- **Backend**: Azure AI Foundry with 10 Connected Agents
- **Authentication**: Microsoft Entra ID (OAuth 2.0 + PKCE)
- **Models**: GPT-4.1 (main router) + GPT-4.1-mini (10 experts)

### **Critical Features to Test:**
1. **Multi-Agent Routing** - 1 main router + 10 specialized experts
2. **Fraud Detection** - **CRITICAL**: 1000 PLN threshold for Politechnika Częstochowska (NOT 50k!)
3. **MSAL Authentication** - Secure login with @powerbiit.com accounts
4. **Connected Agents** - All 10 agents properly configured
5. **Performance** - Response times < 60 seconds

---

## 📁 KEY FILES & LOCATIONS

### **Frontend Application:**
```
/home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend/
├── src/ (React components)
├── public/ (static files)  
├── package.json (dependencies)
├── README.md (detailed documentation)
└── .env files (environment config)
```

### **Documentation:**
```
/home/radek/pcz-ai-foundry-agent/docs/
├── end_user_test_guide.md (testing scenarios)
├── issue_analysis.md (previous problems)
├── inventory.md (Azure resources)
└── ai_endpoints.md (API details)
```

### **Project Configuration:**
```
/home/radek/pcz-ai-foundry-agent/
├── CLAUDE.md (system documentation - READ THIS FIRST!)
└── README.md (project overview)
```

---

## 🚀 TESTING PROTOCOL

### **PHASE 1: System Analysis & Setup**

1. **Read Project Documentation:**
   - Start with `/home/radek/pcz-ai-foundry-agent/CLAUDE.md`
   - Review `/home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend/README.md`
   - Understand the architecture and recent changes (v1.1.0)

2. **Check Application Status:**
   - Verify if React app is running on localhost:3000
   - If not running: `cd /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend && npm start`
   - Check compilation errors and warnings

3. **Environment Validation:**
   - Verify `.env.development` file exists with correct configuration
   - Check Azure AI Foundry endpoint connectivity
   - Validate Microsoft Entra ID configuration

### **PHASE 2: Authentication & Security Testing**

4. **MSAL Authentication Flow:**
   - Navigate to localhost:3000
   - Test login with Microsoft account
   - Verify token acquisition and storage
   - Check for CORS/security issues
   - **Look for**: AADSTS errors, token refresh failures, redirect loops

5. **Security Validation:**
   - Confirm NO API keys in frontend code (key-less architecture)
   - Verify secure token handling in sessionStorage
   - Test unauthorized access scenarios

### **PHASE 3: Multi-Agent System Testing**

6. **Agent Routing Tests** (Use these exact test cases):

**TEST A - Fraud Detection (CRITICAL):**
```
Prompt: "Mamy 3 faktury po 999 zł od tego samego dostawcy. Czy to może być problem?"
Expected: Route to "Audytor Wewnętrzny", mention 1000 PLN threshold, PZP violation warning
CRITICAL: Must NOT mention 50k PLN - should use PCz-specific 1000 PLN limit!
```

**TEST B - Budget Routing:**
```  
Prompt: "Jakie są limity wydatków na wydziałach w tym roku budżetowym?"
Expected: Route to "Ekspert Budżetu" or "Ekspert_Budzetu_Tool"
```

**TEST C - Public Procurement:**
```
Prompt: "Jakie są aktualne progi dla zamówień publicznych w 2025 roku?"  
Expected: Route to "Ekspert Zamówień Publicznych"
```

**TEST D - Legal Compliance:**
```
Prompt: "Czy można podpisać umowę bez procedury przetargowej na kwotę 45000 zł?"
Expected: Route to "Prawnik Compliance"  
```

**TEST E - Accounting:**
```
Prompt: "Jak prawidłowo księgować zakup sprzętu IT powyżej 10000 zł?"
Expected: Route to "Ekspert Rachunkowości"
```

**TEST F - Cash Flow:**
```
Prompt: "Czy mamy wystarczającą płynność finansową na pokrycie zobowiązań?"
Expected: Route to "Ekspert Płynności Finansowej"
```

**TEST G - Invalid Query:**
```
Prompt: "Jaka jest pogoda jutro w Częstochowie?"
Expected: Polite refusal or clarification that system handles only financial queries
```

7. **Connected Agents Verification:**
   - Confirm all 10 Connected Agents are properly configured
   - Expected agents: Mentor_Tool, Audytor_Tool, Strateg_Tool, Prawnik_Compliance_Tool, Ekspert_Budzetu_Tool, Ekspert_Zarzadzen_Tool, Ekspert_Rachunkowosci_Tool, Ekspert_Plynnosci_Tool, Ekspert_Majatku_Tool, Ekspert_Zamowien_Tool
   - Check naming convention: **_Tool** (not _Expert)

### **PHASE 4: Performance & Error Testing**

8. **Performance Testing:**
   - Measure response times for each test case
   - Flag any responses taking > 60 seconds
   - Test multiple concurrent requests
   - Monitor browser memory usage

9. **Error Handling:**
   - Test network disconnection scenarios  
   - Test Azure AI Foundry service unavailability
   - Test malformed inputs and edge cases
   - Verify graceful error messages

10. **Browser Compatibility:**
    - Test in Chrome, Firefox, Edge, Safari
    - Check mobile responsiveness  
    - Verify accessibility features

### **PHASE 5: Critical Security Tests**

11. **Fraud Detection Validation (ULTRA CRITICAL):**
```
Test Scenario: "Mam 5 faktur po 999 zł od jednego dostawcy z tego miesiąca. To razem prawie 5000 zł."
CRITICAL CHECK: Response MUST mention 1000 PLN threshold for Politechnika Częstochowska
FAILURE INDICATOR: If mentions 50k PLN threshold - this is a CRITICAL BUG!
Expected: 🔴 CRITICAL or 🟡 WARNING alert, immediate escalation recommended
```

12. **PZP Compliance Testing:**
    - Test scenarios around article 24.8 PZP (order splitting)
    - Verify legal references are accurate
    - Check if recommendations align with university policies

---

## 🐛 BUG DETECTION & REPORTING

### **What to Look For:**

**🔴 CRITICAL BUGS:**
- Authentication failures preventing system access
- Wrong fraud detection thresholds (50k instead of 1000 PLN)
- Security vulnerabilities (exposed API keys, CORS issues)
- Multi-agent routing completely broken
- System crashes or unhandled exceptions

**🟡 HIGH PRIORITY BUGS:**
- Incorrect agent routing (wrong expert selected)
- Performance issues (>60s response times)
- Missing or broken Connected Agents
- API call failures or timeouts
- UI broken on mobile/different browsers

**🟢 MEDIUM PRIORITY BUGS:**
- Minor UI/UX issues
- Inconsistent messaging
- Suboptimal user experience flows
- Missing loading indicators
- Non-critical validation issues

**⚪ LOW PRIORITY BUGS:**
- Cosmetic issues
- Nice-to-have feature gaps
- Minor text/translation issues

### **Documentation Format:**

For each bug found, create this report:

```markdown
## Bug Report #X

**Test Phase**: [PHASE_X]
**Priority**: 🔴/🟡/🟢/⚪ 
**Component**: Frontend/Backend/Authentication/Multi-Agent/Performance

**Description**: [Clear description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2] 
3. [Step 3]

**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happens]

**Console Errors**: [Browser console errors]
**Network Errors**: [HTTP/API errors]
**Screenshot**: [If applicable]

**Suggested Fix**: [Your recommendation for fixing]
**Impact**: [How this affects end users]
```

---

## 📊 SUCCESS CRITERIA

### **System is PASSING if:**
- ✅ All 7 routing tests work correctly  
- ✅ Fraud detection uses 1000 PLN threshold (NOT 50k!)
- ✅ Authentication flow works without errors
- ✅ All 10 Connected Agents are functional
- ✅ Response times are < 60 seconds consistently
- ✅ No console errors during normal operation
- ✅ Mobile responsive design works
- ✅ No security vulnerabilities detected

### **System is FAILING if:**
- ❌ Fraud detection mentions 50k PLN instead of 1000 PLN (CRITICAL)
- ❌ Multi-agent routing is broken or inconsistent
- ❌ Authentication doesn't work
- ❌ Major performance issues (>60s consistently)
- ❌ Security vulnerabilities present
- ❌ System crashes or unhandled exceptions

---

## 🛠️ AVAILABLE TOOLS & RESOURCES

### **Browser Tools (MCP Playwright):**
You have full access to browser automation through MCP Playwright tools:
- **Navigate**: `mcp__playwright__browser_navigate` - Go to any URL
- **Interact**: Click buttons, fill forms, type text
- **Screenshot**: Take screenshots of issues for documentation  
- **Wait**: Wait for elements to load or time delays
- **Console**: Access browser console messages and errors
- **Network**: Monitor network requests and API calls

**Usage Examples:**
```
# Navigate to application
mcp__playwright__browser_navigate → http://localhost:3000

# Fill test query and submit
mcp__playwright__browser_type → "Mamy 3 faktury po 999 zł od tego samego dostawcy"
mcp__playwright__browser_click → Submit button

# Take screenshot of bug
mcp__playwright__browser_take_screenshot → save evidence
```

### **Azure CLI Tools:**
You have access to Azure CLI for backend verification:
- **Check deployments**: `az cognitiveservices account list`
- **Verify endpoints**: `az cognitiveservices account show`
- **Test connectivity**: `az account show`
- **Check App Registrations**: `az ad app show`

**Usage Examples:**
```bash
# Check Azure AI resource status  
az cognitiveservices account show --name pcz-agent-resource --resource-group pcz

# Verify App Registration
az ad app show --id 0f20f494-53de-4cb2-b5ec-44fabfc31272

# Check subscription access
az account show --query "id,name,user.name"
```

### **File System Access:**
You can read/write files to document findings:
- **Read**: Configuration files, logs, documentation  
- **Write**: Bug reports, test results, screenshots
- **Edit**: Fix configuration issues if found
- **Glob**: Search for files by pattern
- **Grep**: Search content within files

### **Command Line Tools (Bash):**
Full terminal access for system operations:
- **npm commands**: `npm start`, `npm install`, `npm run build`
- **git operations**: Check commit history, status
- **curl**: Test API endpoints directly
- **ps/top**: Monitor system resources
- **tail/cat**: Read log files

**Usage Examples:**
```bash
# Start React application
cd /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend && npm start

# Check if processes are running
ps aux | grep node

# Test API directly
curl -H "Authorization: Bearer TOKEN" https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent/threads
```

### **Context7 Documentation Access:**
Access to up-to-date library documentation:
- **resolve-library-id**: Find library documentation
- **get-library-docs**: Get detailed docs for React, Azure, MSAL

### **Web Research Tools:**
- **WebFetch**: Fetch content from URLs for research
- **WebSearch**: Search for current issues and solutions

---

## 🔍 DEBUGGING TOOLS & TECHNIQUES

### **Browser Developer Tools:**
- **Console Tab**: Look for JavaScript errors, MSAL logs, API errors
- **Network Tab**: Monitor Azure AI Foundry API calls, check response times
- **Application Tab**: Verify MSAL tokens in sessionStorage
- **Security Tab**: Check certificate and connection security

### **Key Log Patterns to Watch:**
```
✅ Good: "@azure/msal-browser: Info - handleRedirectPromise resolved"
❌ Bad: "AADSTS9002326 - Cross-origin token redemption"
✅ Good: "🔄 Przekazuję do: **Audytor Wewnętrzny**" 
❌ Bad: Long delays without routing indication
```

### **Azure AI Foundry Monitoring:**
- Check if endpoint `https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent` is responsive
- Monitor for 401/403 authentication errors
- Watch for timeout or rate limiting issues

---

## 📋 FINAL DELIVERABLES

After completing all tests, provide:

1. **Executive Summary**: Overall system health (PASS/FAIL)
2. **Critical Issues List**: All 🔴 CRITICAL bugs that must be fixed immediately  
3. **Complete Bug Report**: All issues found with priority levels
4. **Performance Analysis**: Response times and bottlenecks
5. **Security Assessment**: Any vulnerabilities or concerns
6. **Recommendations**: Prioritized list of fixes and improvements

---

## ⚡ ULTRA CRITICAL REMINDERS

1. **FRAUD THRESHOLD**: The system MUST use 1000 PLN for Politechnika Częstochowska, NOT 50k PLN. If you see 50k mentioned in fraud detection responses, this is a CRITICAL BUG that needs immediate attention.

2. **Connected Agents**: All 10 agents must be properly configured. Missing agents = broken routing.

3. **Security First**: Any exposed API keys, authentication bypasses, or CORS issues are CRITICAL.

4. **Performance**: >60 second response times are unacceptable for production.

5. **Documentation**: Every bug must be documented with clear reproduction steps.

---

## 🎬 ACTION PLAN - START HERE

### **IMMEDIATE FIRST STEPS:**

1. **Read System Documentation (5 mins):**
   ```
   Read /home/radek/pcz-ai-foundry-agent/CLAUDE.md
   Read /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend/README.md  
   ```

2. **Check Application Status (2 mins):**
   ```bash
   # Check if app is already running
   ps aux | grep node
   
   # Navigate to frontend directory
   cd /home/radek/pcz-ai-foundry-agent/app/pcz-agent-frontend
   
   # Start if not running
   npm start
   ```

3. **Open Browser and Navigate (1 min):**
   ```
   mcp__playwright__browser_navigate → http://localhost:3000
   mcp__playwright__browser_take_screenshot → baseline_screenshot.png
   ```

4. **Verify Azure Infrastructure (3 mins):**
   ```bash
   # Check Azure account access
   az account show
   
   # Check AI resource status  
   az cognitiveservices account show --name pcz-agent-resource --resource-group pcz
   
   # Verify App Registration
   az ad app show --id 0f20f494-53de-4cb2-b5ec-44fabfc31272
   ```

### **TESTING WORKFLOW (30-45 mins):**

Execute all tests systematically:

1. **Authentication Test** → Document any MSAL issues
2. **7 Routing Tests** → Use exact prompts provided above  
3. **Critical Fraud Test** → Verify 1000 PLN threshold
4. **Performance Tests** → Time all responses
5. **Error Handling** → Test edge cases
6. **Security Check** → Verify no exposed secrets

### **TOOLS TO USE FREQUENTLY:**
- `mcp__playwright__browser_*` - All UI testing
- `Bash` - System monitoring and npm commands
- `Read` - Check configuration files  
- `Write` - Document all bugs found
- `az` commands - Verify Azure backend
- `BashOutput` - Monitor running processes

### **CRITICAL SUCCESS INDICATORS:**
✅ **Authentication works smoothly**  
✅ **All 7 routing tests pass correctly**  
✅ **Fraud detection mentions 1000 PLN (NOT 50k!)**  
✅ **Response times < 60 seconds**  
✅ **No console errors during normal operation**

### **CRITICAL FAILURE INDICATORS:**  
❌ **Fraud threshold shows 50k PLN instead of 1000 PLN**  
❌ **Wrong agent routing or no routing**  
❌ **Authentication failures**  
❌ **System crashes or unhandled exceptions**  
❌ **Response times > 60 seconds consistently**

---

## 📝 FINAL REMINDER

**You are Claude Code testing a production-ready multi-agent financial system for Częstochowa University of Technology. This system will handle sensitive financial data and compliance checks.**

**Your testing is CRITICAL for:**
- Financial compliance (PZP law violations could result in penalties)
- University security (proper authentication required)  
- User experience (CFO and finance staff rely on this system)
- System integrity (multi-agent routing must work flawlessly)

**Start your analysis by reading `/home/radek/pcz-ai-foundry-agent/CLAUDE.md` to understand the current system state, then follow the ACTION PLAN above.**

**Remember: You are the last line of defense before production deployment. Be thorough, be critical, and miss nothing.**

**The most critical test: Ensure fraud detection uses 1000 PLN threshold for Politechnika Częstochowska, not 50k PLN. This is a compliance requirement that could have serious legal consequences if wrong.**