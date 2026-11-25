import React, { useEffect } from "react";
import { useSetAtom } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";

import {
  hydrateAuthSession,
  subscribeAuthUser,
} from "@/features/auth/api";
import {
  authErrorAtom,
  authHydratedAtom,
  currentUserAtom,
} from "@/features/auth/store";
import BankLinkFormPage from "@/pages/bank-link-form";
import BankLinkOtpPage from "@/pages/bank-link-otp";
import BankUnlinkOtpPage from "@/pages/bank-unlink-otp";
import CanteenHubPage from "@/pages/canteen";
import CartPage from "@/pages/cart";
import LimitHistoryPage from "@/pages/limit-history";
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
  const setAuthHydrated = useSetAtom(authHydratedAtom);
  const setAuthError = useSetAtom(authErrorAtom);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAuthUser((user) => {
      if (active) {
        setCurrentUser(user);
        if (user) {
          setAuthError(null);
        }
      }
    });

    hydrateAuthSession()
      .then((user) => {
        if (active) {
          setCurrentUser(user);
          setAuthError(null);
          setAuthHydrated(true);
        }
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null);
          setAuthHydrated(true);
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setCurrentUser, setAuthHydrated, setAuthError]);

  return <>{children}</>;
}

const Layout = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App theme="light">
        <SnackbarProvider>
          <AuthBootstrap>
            <ZMPRouter>
              <AnimationRoutes>
                <Route path="/" element={<MenuPage />} />
                <Route path="/canteen" element={<CanteenHubPage />} />
                <Route path="/canteen/link-bank" element={<BankLinkFormPage />} />
                <Route path="/canteen/verify-otp" element={<BankLinkOtpPage />} />
                <Route path="/canteen/unlink-otp" element={<BankUnlinkOtpPage />} />
                <Route path="/canteen/limit-history" element={<LimitHistoryPage />} />
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
