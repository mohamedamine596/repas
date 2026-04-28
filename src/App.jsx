import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { createPageUrl } from "@/utils";
import AdminModule from "@/admin/AdminModule";
import GoogleOAuthCallback from "@/pages/GoogleOAuthCallback";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;
const PUBLIC_PAGES = new Set([
  "Home",
  "Login",
  "About",
  "MealsList",
  "MealMap",
  "OtpVerification",
  "ForgotPassword",
  "ResetPassword",
  "RegisterRestaurant",
  "GoogleOAuthCallback",
]);
const PAGE_ROLE_GUARDS = {
  PublishMeal: ["ROLE_RESTAURANT"],
  AdminVerifications: ["ADMIN", "ROLE_ADMIN"],
};

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const GuardedPage = ({ pageName, Page }) => {
  const { isAuthenticated, hasRole } = useAuth();

  if (!PUBLIC_PAGES.has(pageName) && !isAuthenticated) {
    return <Navigate to={createPageUrl("Login")} replace />;
  }

  const allowedRoles = PAGE_ROLE_GUARDS[pageName];
  if (allowedRoles && !hasRole(...allowedRoles)) {
    return <Navigate to={createPageUrl("Dashboard")} replace />;
  }

  return (
    <LayoutWrapper currentPageName={pageName}>
      <Page />
    </LayoutWrapper>
  );
};

const AdminGuardedModule = () => {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={createPageUrl("Login")} replace />;
  }

  if (!hasRole("ADMIN")) {
    return <Navigate to={createPageUrl("Dashboard")} replace />;
  }

  return <AdminModule />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      }
    >
      <Routes>
        <Route path="/admin/*" element={<AdminGuardedModule />} />
        <Route
          path="/"
          element={<GuardedPage pageName={mainPageKey} Page={MainPage} />}
        />
        <Route
          path="/receveur/dashboard"
          element={<GuardedPage pageName="Dashboard" Page={Pages.Dashboard} />}
        />
        <Route
          path="/donneur/dashboard"
          element={<GuardedPage pageName="Dashboard" Page={Pages.Dashboard} />}
        />
        <Route
          path="/restaurant/dashboard"
          element={<GuardedPage pageName="Dashboard" Page={Pages.Dashboard} />}
        />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<GuardedPage pageName={path} Page={Page} />}
          />
        ))}
        <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
