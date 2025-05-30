// This file provides TypeScript type declarations for jest-dom matchers

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: object): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

// Add other missing type declarations for test-related functionality
declare global {
  interface HTMLElement {
    value?: string;
  }
}