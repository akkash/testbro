// Enhanced type definitions for testing libraries
// These will be replaced by actual type definitions once packages are installed

declare module '@testing-library/react' {
  export function render(component: any, options?: any): any;
  export const screen: {
    getByTestId: (id: string) => HTMLElement;
    getByText: (text: string | RegExp) => HTMLElement;
    getByRole: (role: string, options?: any) => HTMLElement;
    queryByTestId: (id: string) => HTMLElement | null;
    queryByText: (text: string | RegExp) => HTMLElement | null;
    findByTestId: (id: string) => Promise<HTMLElement>;
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    [key: string]: any;
  };
  export function waitFor(callback: () => void | Promise<void>, options?: any): Promise<void>;
  export function fireEvent(element: any, event?: any): void;
  export function cleanup(): void;
  export function act(callback: () => void | Promise<void>): Promise<void>;
}

declare module '@testing-library/jest-dom' {
  // jest-dom matchers will be available globally
  interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R;
    toHaveTextContent(text: string | RegExp): R;
    toHaveAttribute(attr: string, value?: string): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toHaveClass(className: string): R;
  }
  
  declare global {
    namespace Vi {
      interface Assertion<T = any> extends CustomMatchers<T> {}
      interface AsymmetricMatchersContaining extends CustomMatchers {}
    }
  }
}

declare module '@testing-library/user-event' {
  interface UserEvent {
    click: (element: Element) => Promise<void>;
    type: (element: Element, text: string) => Promise<void>;
    clear: (element: Element) => Promise<void>;
    selectOptions: (element: Element, values: string | string[]) => Promise<void>;
    upload: (element: Element, file: File | File[]) => Promise<void>;
    hover: (element: Element) => Promise<void>;
    unhover: (element: Element) => Promise<void>;
    tab: () => Promise<void>;
    keyboard: (input: string) => Promise<void>;
  }
  
  function setup(options?: any): UserEvent;
  export default {
    setup,
    click: (element: Element) => Promise<void>,
    type: (element: Element, text: string) => Promise<void>,
    clear: (element: Element) => Promise<void>,
    selectOptions: (element: Element, values: string | string[]) => Promise<void>,
    upload: (element: Element, file: File | File[]) => Promise<void>,
    hover: (element: Element) => Promise<void>,
    unhover: (element: Element) => Promise<void>,
    tab: () => Promise<void>,
    keyboard: (input: string) => Promise<void>,
  };
}

declare module 'vitest' {
  interface TestFunction {
    (name: string, fn: () => void | Promise<void>): void;
    only: (name: string, fn: () => void | Promise<void>) => void;
    skip: (name: string, fn: () => void | Promise<void>) => void;
    todo: (name: string) => void;
  }
  
  interface DescribeFunction {
    (name: string, fn: () => void): void;
    only: (name: string, fn: () => void) => void;
    skip: (name: string, fn: () => void) => void;
    todo: (name: string) => void;
  }
  
  export const vi: {
    fn: (implementation?: any) => any;
    spyOn: (object: any, method: string) => any;
    mock: (path: string, factory?: () => any) => void;
    doMock: (path: string, factory?: () => any) => void;
    unmock: (path: string) => void;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
    mocked: (item: any) => any;
    stubGlobal: (key: string, value: any) => void;
    unstubAllGlobals: () => void;
  };
  
  export const describe: DescribeFunction;
  export const test: TestFunction;
  export const it: TestFunction;
  export function expect(value: any): any;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
}

declare module '@vitest/ui' {
  // UI utilities for vitest
}

declare module 'jsdom' {
  // JSDOM environment for testing
}