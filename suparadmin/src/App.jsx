import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import AdminLayout from "./components/Layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import MealCollectorDashboard from "./pages/MealCollectorDashboard";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import CompanyList from "./pages/CompanyMaster/CompanyList";
import UserList from "./pages/UserManagement/UserList";
import LocationList from "./pages/LocationManagement/LocationList";
import DeviceList from "./pages/DeviceManagement/DeviceList";
import PackageList from "./pages/PackageManagement/PackageList";
import BatchList from "./pages/BatchManagement/BatchList";
import PlaceList from "./pages/PlaceMaster/PlaceList";
import AdminUserList from "./pages/AdminUserMaster/AdminUserList";
import ErrorBoundary from "./components/ErrorBoundary";
import PrivateRoute from "./routes/PrivateRoute";
import VisitorReport from "./pages/reportMaster/VisitorReport";
import FeesReport from "./pages/reportMaster/FeesReport";
import PandingFeesReport from "./pages/reportMaster/PandingFeesReport";
import DailyUtilizedReport from "./pages/reportMaster/DailyUtilizedReport";
import UtilizedReport from "./pages/reportMaster/UtilizedReport";
import UserReport from "./pages/reportMaster/UserReport";
import UnremoveUserReport from "./pages/reportMaster/UnremoveUserReport";
import ExceptionalReport from "./pages/reportMaster/ExceptionalReport";
import FeesList from "./pages/feesMaster/FeesList";
import TaxProfileList from "./pages/TextProfileMaster/TaxProfileList";
import MealCapture from "./pages/MealCollectionMaster/MealCapture";
import TexList from "./pages/TextProfileMaster/TexList";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { useContext } from "react";
import { AuthContext } from "./context/auth-context";
import HourlyReport from "./pages/reportMaster/HourlyReport";
import ProductIntro from "./pages/ProductIntro";
import About from "./pages/About"
import Contact from "./pages/Contact";
import ThankYou from "./pages/ThankYou";
import ScrollToTop from "./components/ScrollToTop";
// import 'rsuite/dist/rsuite.min.css';

// Component to redirect based on user type
const DashboardRedirect = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    // return <Navigate to="/product" replace />;
    return <ProductIntro/>
  }

  const userType = user.userType || user.type || user.role;

  switch (userType) {
    case "superadmin":
      return <Navigate to="/superadmin/dashboard" replace />;
    case "admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "manager":
      return <Navigate to="/manager/dashboard" replace />;
    case "meal_collector":
      return <Navigate to="/meal-collector/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ToastContainer position="top-center" autoClose={3000} />
          <ScrollToTop/>
          <Routes>
            {/* Default route - redirect to appropriate dashboard */}
            <Route path="/" element={<DashboardRedirect />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact/>} />
            <Route path="/thank-you" element={<ThankYou/>} />

            {/* Admin-specific routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/register" element={<Register />} />

            {/* Superadmin-specific routes */}
            <Route path="/superadmin/login" element={<Login />} />
            <Route path="/superadmin/register" element={<Register />} />

            {/* Product intro (Tailwind page) */}
            <Route path="/" element={<ProductIntro />} />

            {/* Superadmin dashboard route */}
            <Route
              path="/superadmin/dashboard"
              element={
                <PrivateRoute roles={["superadmin"]}>
                  <AdminLayout>
                    <Dashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Admin dashboard route */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute
                  roles={["admin"]}
                  userTypes={["admin", "manager"]}
                >
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Manager dashboard route */}
            <Route
              path="/manager/dashboard"
              element={
                <PrivateRoute userTypes={["manager"]}>
                  <AdminLayout>
                    <ManagerDashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Meal Collector dashboard route */}
            <Route
              path="/meal-collector/dashboard"
              element={
                <PrivateRoute userTypes={["meal_collector"]}>
                  <AdminLayout>
                    <MealCollectorDashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Company routes - Only Super Admin */}
            <Route
              path="/company/*"
              element={
                <PrivateRoute roles={["superadmin"]}>
                  <AdminLayout>
                    <CompanyList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Admin routes - Admin, Super Admin, and Manager */}
            <Route
              path="/users/*"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <UserList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/locations/*"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <LocationList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/devices/*"
              element={
                <PrivateRoute roles={["superadmin"]}>
                  <AdminLayout>
                    <DeviceList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/packages/*"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <PackageList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/batches/*"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <BatchList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/places/*"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin"]}
                >
                  <AdminLayout>
                    <PlaceList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/meal-capture"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={[
                    "admin",
                    "superadmin",
                    "manager",
                    "meal_collector",
                  ]}
                >
                  <AdminLayout>
                    <MealCapture />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Admin User routes - Admin and Super Admin (not Manager) */}
            <Route
              path="/admin-users/*"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin"]}
                >
                  <AdminLayout>
                    <AdminUserList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Admin routes - Admin, Super Admin, and Manager */}
            <Route
              path="/fees"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <FeesList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/text-profile/tex-profile-master"
              element={
                <PrivateRoute roles={["superadmin"]}>
                  <AdminLayout>
                    <TaxProfileList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/text-profile/tex-List-master"
              element={
                <PrivateRoute roles={["superadmin"]}>
                  <AdminLayout>
                    <TexList />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Report routes - Admin, Superadmin, and Manager */}
            <Route
              path="/report/visitor"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <VisitorReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/report/hourly"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <HourlyReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/report/fees"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <FeesReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/report/panding-fees"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <PandingFeesReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/report/daily-utilized"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin", "manager"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <DailyUtilizedReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/report/utilized"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <UtilizedReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/report/user"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <UserReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            {/* <Route path="/report/unremove-user" element={
              <PrivateRoute roles={['admin', 'superadmin']} userTypes={['admin', 'superadmin', 'manager']}>
                <AdminLayout>
                  <UnremoveUserReport />
                </AdminLayout>
              </PrivateRoute>
            } /> */}
            <Route
              path="/report/exceptional"
              element={
                <PrivateRoute
                  roles={["admin", "superadmin"]}
                  userTypes={["admin", "superadmin", "manager"]}
                >
                  <AdminLayout>
                    <ExceptionalReport />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Temporary public dashboard for testing */}
            <Route
              path="/dashboard-public"
              element={
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              }
            />

            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
