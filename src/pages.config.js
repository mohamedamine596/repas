/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PublishMeal from "./pages/PublishMeal";
import MealsList from "./pages/MealsList";
import MealDetail from "./pages/MealDetail";
import MealMap from "./pages/MealMap";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";
import Profile from "./pages/Profile";
import MealHistory from "./pages/MealHistory";
import About from "./pages/About";
import Login from "./pages/Login";
import AdminVerifications from "./pages/AdminVerifications";
import OtpVerification from "./pages/OtpVerification";
// Removed: DonorDocumentUpload, DonorQuiz, DonorPendingReview (legacy)
// Removed: RestaurantDocumentUpload, RestaurantPendingReview (new flow uses instant activation)
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RegisterRestaurant from "./pages/RegisterRestaurant";
import __Layout from "./Layout.jsx";

export const PAGES = {
  Home: Home,
  Dashboard: Dashboard,
  PublishMeal: PublishMeal,
  MealsList: MealsList,
  MealDetail: MealDetail,
  MealMap: MealMap,
  Messages: Messages,
  Conversation: Conversation,
  Profile: Profile,
  MealHistory: MealHistory,
  About: About,
  Login: Login,
  AdminVerifications: AdminVerifications,
  OtpVerification: OtpVerification,
  ForgotPassword: ForgotPassword,
  ResetPassword: ResetPassword,
  RegisterRestaurant: RegisterRestaurant,
};

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};
