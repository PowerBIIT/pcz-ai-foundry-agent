// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock crypto for MSAL tests
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {},
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage  
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock MSAL 
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getAllAccounts: jest.fn(() => []),
    getAccountByHomeId: jest.fn(),
    loginPopup: jest.fn(),
    logoutPopup: jest.fn(),
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn(),
  })),
  InteractionStatus: {
    None: 'None',
    Login: 'Login',
    Logout: 'Logout',
  },
  BrowserAuthError: class BrowserAuthError extends Error {},
  AuthError: class AuthError extends Error {},
}));

jest.mock('@azure/msal-react', () => ({
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
  useMsal: () => ({
    instance: {
      initialize: jest.fn(),
      getAllAccounts: jest.fn(() => []),
      getAccountByHomeId: jest.fn(),
      loginPopup: jest.fn(),
      logoutPopup: jest.fn(),
      acquireTokenSilent: jest.fn().mockResolvedValue({ accessToken: 'mock-token' }),
      acquireTokenPopup: jest.fn(),
    },
    accounts: [
      {
        homeAccountId: 'test-user-id',
        username: 'test@powerbiit.com',
        name: 'Test User',
      }
    ],
    inProgress: 'None',
  }),
  AuthenticatedTemplate: ({ children }: { children: React.ReactNode }) => children,
  UnauthenticatedTemplate: ({ children }: { children: React.ReactNode }) => null,
}));
