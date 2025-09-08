import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PCZ Agent application', () => {
  render(<App />);
  const titleElement = screen.getByText(/PCZ Agent - Asystent Dyrektora Finansowego/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders welcome message when authenticated', () => {
  render(<App />);
  const welcomeElement = screen.getByText(/Witaj! Jestem asystentem Dyrektora Finansowego/i);
  expect(welcomeElement).toBeInTheDocument();
});

test('renders user info for authenticated user', () => {
  render(<App />);
  const userInfoElement = screen.getByText(/Zalogowany jako: test@powerbiit.com/i);
  expect(userInfoElement).toBeInTheDocument();
});

test('renders message input field', () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/Zadaj pytanie dotyczące finansów uczelni/i);
  expect(inputElement).toBeInTheDocument();
});
