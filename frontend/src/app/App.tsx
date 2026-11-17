import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';
import { RouterProvider } from 'react-router';
import { Toaster } from '@/shared/ui/Toaster/Toaster';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { networkMode: 'always' } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <RouterProvider router={router} />
      </NuqsAdapter>
      <Toaster />
    </QueryClientProvider>
  );
}
