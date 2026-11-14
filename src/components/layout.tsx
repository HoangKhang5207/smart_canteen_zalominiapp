import React, { useEffect } from "react";
import { useSetAtom } from "jotai";
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

import { ensureAuthenticated } from "@/features/auth/api";
import { authErrorAtom, currentUserAtom } from "@/features/auth/store";
import CartPage from "@/pages/cart";
import MenuPage from "@/pages/menu";
import OrderDetailPage from "@/pages/order-detail";
import OrdersPage from "@/pages/orders";
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

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setAuthError = useSetAtom(authErrorAtom);

  useEffect(() => {
    let active = true;
    ensureAuthenticated()
      .then((user) => {
        if (active) {
          setCurrentUser(user);
          setAuthError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setAuthError(
            err instanceof Error ? err.message : "Không thể định danh tài khoản",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [setCurrentUser, setAuthError]);

  return <>{children}</>;
}

const Layout = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
        <SnackbarProvider>
          <AuthBootstrap>
            <ZMPRouter>
              <AnimationRoutes>
                <Route path="/" element={<MenuPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
              </AnimationRoutes>
            </ZMPRouter>
          </AuthBootstrap>
        </SnackbarProvider>
      </App>
    </QueryClientProvider>
  );
};
export default Layout;
