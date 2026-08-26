import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock matchMedia if needed for testing (sometimes used by charting libs)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch globally for the backend API calls in App.jsx
global.fetch = vi.fn((url) => {
  if (url.includes('/api/status')) {
    return Promise.resolve({
      json: () => Promise.resolve({ success: true, activeHour: '01:00', systems: { camdrum: {}, mechanical: {}, ord: {} }, timeline: ['01:00'] })
    });
  }
  if (url.includes('/api/all-data')) {
    return Promise.resolve({
      json: () => Promise.resolve({ success: true, dataset: {} })
    });
  }
  return Promise.resolve({
    json: () => Promise.resolve({})
  });
});

describe('App Component - Login Flow', () => {
  it('renders login screen initially', () => {
    render(<App />);
    expect(screen.getByText('Simple Energy')).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('shows error on invalid login', async () => {
    render(<App />);
    
    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Invalid username or password. Please try again.', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('logs in successfully and shows dashboard when credentials are correct', async () => {
    render(<App />);
    
    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(usernameInput, { target: { value: 'simple123' } });
    fireEvent.change(passwordInput, { target: { value: '123admin' } });
    fireEvent.click(submitBtn);

    // After login, we should see the dashboard loading screen initially or main content
    expect(await screen.findByText('SIMPLE ENERGY PVT. LTD.', {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
