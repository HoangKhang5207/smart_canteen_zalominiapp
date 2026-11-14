import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import MenuPage from "@/pages/menu";
import ProductDetailPage from "@/pages/product-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const Layout = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
        <SnackbarProvider>
          <ZMPRouter>
            <AnimationRoutes>
              <Route path="/" element={<MenuPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
            </AnimationRoutes>
          </ZMPRouter>
        </SnackbarProvider>
      </App>
    </QueryClientProvider>
  );
};
export default Layout;
