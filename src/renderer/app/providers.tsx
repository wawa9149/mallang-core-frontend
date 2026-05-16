import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'styled-components';
import { queryClient } from '../shared/api/query-client';
import { GlobalStyle } from './global-style';
import { appTheme } from './theme';

const SHOW_QUERY_DEVTOOLS =
  import.meta.env.DEV && import.meta.env.VITE_SHOW_QUERY_DEVTOOLS === 'true';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={appTheme}>
        <GlobalStyle />
        {children}
        {SHOW_QUERY_DEVTOOLS && (
          <ReactQueryDevtools buttonPosition="bottom-left" />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
