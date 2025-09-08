import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID || "0f20f494-53de-4cb2-b5ec-44fabfc31272",
    authority: process.env.REACT_APP_AUTHORITY || "https://login.microsoftonline.com/e1a9f8ae-3694-47c3-b535-24915a84b304",
    redirectUri: process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      }
    }
  }
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

export const agentConfig = {
  endpoint: process.env.REACT_APP_AGENT_ENDPOINT || "https://pcz-agent-resource.services.ai.azure.com/api/projects/pcz-agent",
  agentId: process.env.REACT_APP_AGENT_ID || "asst_iEwikcIGZdvImKNmalHfSHGm"
};