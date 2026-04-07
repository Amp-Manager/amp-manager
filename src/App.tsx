import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/layout/PageLoader";
import { BatchErrorProvider } from "./context/BatchErrorContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastSettingsProvider, useToastSettings } from "./context/ToastSettingsContext";
import { LoginModal } from "./components/LoginModal";
import { Toaster } from "sonner";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Domains = lazy(() => import("./pages/Domains"));
const Monitor = lazy(() => import("./pages/Monitor"));
const Databases = lazy(() => import("./pages/Databases"));
const Hosts = lazy(() => import("./pages/Hosts"));
const Docker = lazy(() => import("./pages/Docker"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Settings = lazy(() => import("./pages/Settings"));
const Workflow = lazy(() => import("./pages/Workflow"));
const Credentials = lazy(() => import("./pages/Credentials"));
const Notes = lazy(() => import("./pages/Notes"));
const Terminal = lazy(() => import("./pages/Terminal"));
const Mail = lazy(() => import("./pages/Mail"));
const About = lazy(() => import("./pages/About"));

function AppContent() {
  const { toastSettings } = useToastSettings();
  
  return (
    <>
      <Toaster 
        theme="dark" 
        position={toastSettings.position}
        offset={44}
        expand={true} 
        richColors 
        duration={3000} 
        visibleToasts={8}
      />
      <LoginModal />
      <BatchErrorProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="domains" element={<Domains />} />
                <Route path="monitor" element={<Monitor />} />
                <Route path="databases" element={<Databases />} />
                <Route path="notes" element={<Notes />} />
                <Route path="notes/:id" element={<Notes />} />
                <Route path="notes/new" element={<Notes />} />
                <Route path="hosts" element={<Hosts />} />
                <Route path="docker" element={<Docker />} />
                <Route path="certificates" element={<Certificates />} />
                <Route path="workflow" element={<Workflow />} />
                <Route path="terminal" element={<Terminal />} />
                <Route path="mail" element={<Mail />} />
                <Route path="credentials" element={<Credentials />} />
                <Route path="settings" element={<Settings />} />
                <Route path="about" element={<About />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </BatchErrorProvider>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastSettingsProvider>
        <AppContent />
      </ToastSettingsProvider>
    </AuthProvider>
  );
}
