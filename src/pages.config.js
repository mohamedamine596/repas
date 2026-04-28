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
import { lazy } from "react";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PublishMeal = lazy(() => import("./pages/PublishMeal"));
const MealsList = lazy(() => import("./pages/MealsList"));
const MealDetail = lazy(() => import("./pages/MealDetail"));
const MealMap = lazy(() => import("./pages/MealMap"));
const Messages = lazy(() => import("./pages/Messages"));
const Conversation = lazy(() => import("./pages/Conversation"));
const Profile = lazy(() => import("./pages/Profile"));
const MealHistory = lazy(() => import("./pages/MealHistory"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const AdminVerifications = lazy(() => import("./pages/AdminVerifications"));
const OtpVerification = lazy(() => import("./pages/OtpVerification"));
// Removed: DonorDocumentUpload, DonorQuiz, DonorPendingReview (legacy)
// Removed: RestaurantDocumentUpload, RestaurantPendingReview (new flow uses instant activation)
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RegisterRestaurant = lazy(() => import("./pages/RegisterRestaurant"));
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
