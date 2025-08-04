import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

import StoreInventoryDashboard from './components/StoreInventoryDashboard';
import Login from './components/Login';
import AdminVerifyUsers from './components/AdminVerifyUsers';
import AdminRegisterUser from './components/AdminRegisterUser';
import InventoryChartsPage from './components/InventoryChartsPage';
import AdminNavBar from './components/AdminNavBar';
import { AuthContext, AuthProvider } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          return false;
        }
        return failureCount < 3;
      }
    }
  }
});

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.875rem',
        },
      },
    },
  }
});

const PrivateRoute = ({ children, requiredRole }) => {
  const { auth } = useContext(AuthContext);
  
  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && auth.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  return <PrivateRoute requiredRole="admin">{children}</PrivateRoute>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider 
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={3000}
        >
          <AuthProvider>
            <Router>
              <AuthContext.Consumer>
                {({ auth }) => (
                  <>
                    <AdminNavBar />
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route 
                        path="/dashboard" 
                        element={
                          <PrivateRoute>
                            <StoreInventoryDashboard />
                          </PrivateRoute>
                        } 
                      />
                      <Route 
                        path="/inventory-charts" 
                        element={
                          <PrivateRoute>
                            <InventoryChartsPage />
                          </PrivateRoute>
                        } 
                      />
                      <Route 
                        path="/admin/verify-users" 
                        element={
                          <AdminRoute>
                            <AdminVerifyUsers />
                          </AdminRoute>
                        } 
                      />
                      <Route 
                        path="/admin/register-user" 
                        element={
                          <AdminRoute>
                            <AdminRegisterUser />
                          </AdminRoute>
                        } 
                      />
                      <Route path="/" element={auth.token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </>
                )}
              </AuthContext.Consumer>
            </Router>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;