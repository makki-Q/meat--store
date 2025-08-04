import React, { useState, useContext, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Alert, Chip, Skeleton, Tooltip, Paper, TextField, Collapse,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import {
  Store, Print, CheckCircle, InfoOutlined, ExpandMore, ExpandLess, SaveAlt
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { useSnackbar } from 'notistack';

import InventorySummary from './store-inventory/InventorySummary';
import ShopTransfersSection from './store-inventory/ShopTransfersSection';
import ShopStockSection from './store-inventory/ShopStockSection';
import DailyPurchasesSection from './store-inventory/DailyPurchasesSection';
import StockReconciliationSection from './store-inventory/StockReconciliationSection';
import { AuthContext } from '../context/AuthContext';


// Memoized components for performance
const MemoizedInventorySummary = React.memo(InventorySummary);
const MemoizedShopTransfersSection = React.memo(ShopTransfersSection);
const MemoizedShopStockSection = React.memo(ShopStockSection);
const MemoizedDailyPurchasesSection = React.memo(DailyPurchasesSection);
const MemoizedStockReconciliationSection = React.memo(StockReconciliationSection);

const StoreInventoryDashboard = () => {
  const { auth } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    stock: true,
    transfers: true,
    purchases: true,
    reconciliation: true,
    userRegistration: true,
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRegError, setUserRegError] = useState(null);
  const [userRegSuccess, setUserRegSuccess] = useState(null);
  const [userRegLoading, setUserRegLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch inventory data
  const { data: inventory, isLoading, error, refetch } = useQuery(
    ['store-inventory', selectedDate],
    () => {
      console.log('Fetching inventory for date:', selectedDate);
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const endpoint = selectedDate === new Date().toISOString().split('T')[0] 
        ? '/api/store-inventory/today' 
        : `/api/store-inventory/date/${selectedDate}`;
      return axios.get(endpoint, config).then(res => {
        console.log('Inventory data received:', res.data);
        return res.data;
      });
    },
    { 
      refetchOnWindowFocus: false, 
      staleTime: 30000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 3;
      }
    }
  );

  // Fetch product and shop types
  const { data: productTypes = {} } = useQuery('product-types', 
    () => axios.get('/api/store-inventory/product-types', 
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ).then(res => res.data),
    { staleTime: Infinity }
  );

  const { data: shopTypes = {} } = useQuery('shop-types',
    () => axios.get('/api/store-inventory/shop-types', 
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ).then(res => res.data),
    { staleTime: Infinity }
  );

  // Mutations
  const finalizeMutation = useMutation(
    () => axios.put(`/api/store-inventory/${inventory?._id}/finalize`, null, 
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['store-inventory', selectedDate]);
        enqueueSnackbar('Inventory finalized successfully!', { variant: 'success' });
      }
    }
  );

  const unfinalizeMutation = useMutation(
    () => axios.put(`/api/store-inventory/${inventory?._id}/unfinalize`, null, 
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        console.log('Unfinalize mutation success, invalidating cache and refetching');
        queryClient.invalidateQueries(['store-inventory', selectedDate]);
        refetch();
        enqueueSnackbar('Inventory unfinalized successfully!', { variant: 'success' });
      }
    }
  );

  // Handlers
  const handleFinalize = () => setConfirmOpen(true);
  const handleConfirmFinalize = () => {
    setConfirmOpen(false);
    finalizeMutation.mutate();
  };

  const handleExport = () => {
    const csvContent = [
      ['Category', 'Pieces', 'Value (KSh)'],
      ...inventoryChartData.map(item => [item.name, item.pieces, item.value])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // User registration handlers
  const handleUserRegister = async (e) => {
    e.preventDefault();
    setUserRegError(null);
    setUserRegSuccess(null);
    setUserRegLoading(true);
    try {
      await axios.post('/api/auth/register', { username, password, role: 'storekeeper' }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setUserRegSuccess('Storekeeper registered successfully');
      setUsername('');
      setPassword('');
      enqueueSnackbar('Storekeeper registered successfully!', { variant: 'success' });
    } catch (err) {
      setUserRegError(err.response?.data?.message || 'Failed to register user');
      enqueueSnackbar(err.response?.data?.message || 'Failed to register user', { variant: 'error' });
    } finally {
      setUserRegLoading(false);
    }
  };

  const handleUnfinalize = async () => {
    await axios.post(`/api/store-inventory/${inventory._id}/unfinalize`, {}, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    await refetch();
  };

  // Chart data preparation
  const inventoryChartData = useMemo(() => inventory ? [
    { 
      name: 'Opening Stock', 
      pieces: inventory.openingStock?.reduce((acc, item) => acc + (item.pieces || 0), 0) || 0,
      value: inventory.openingStock?.reduce((acc, item) => acc + ((item.pieces || 0) * (item.pricePerPiece || 0)), 0) || 0
    },
    { 
      name: 'Daily Purchases', 
      pieces: inventory.dailyPurchases?.reduce((acc, purchase) => acc + (purchase.products?.reduce((a, p) => a + (p.pieces || 0), 0) || 0), 0) || 0,
      value: inventory.dailyPurchases?.reduce((acc, purchase) => acc + (purchase.products?.reduce((a, p) => a + ((p.pieces || 0) * (p.pricePerPiece || 0)), 0) || 0), 0) || 0
    },
    { 
      name: 'Available Stock', 
      pieces: inventory.totalAvailableStock?.reduce((acc, item) => acc + (item.pieces || 0), 0) || 0,
      value: inventory.totalAvailableStock?.reduce((acc, item) => acc + ((item.pieces || 0) * (item.pricePerPiece || 0)), 0) || 0
    },
    { 
      name: 'Shop Transfers', 
      pieces: inventory.shopTransfers?.reduce((acc, transfer) => acc + (transfer.products?.reduce((a, p) => a + (p.pieces || 0), 0) || 0), 0) || 0,
      value: inventory.shopTransfers?.reduce((acc, transfer) => acc + (transfer.products?.reduce((a, p) => a + ((p.pieces || 0) * (p.pricePerPiece || 0)), 0) || 0), 0) || 0
    },
  ] : [], [inventory]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'IN_PROGRESS': return 'primary';
      case 'RECONCILED': return 'success';
      case 'FINALIZED': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'IN_PROGRESS': return 'In Progress';
      case 'RECONCILED': return 'Reconciled';
      case 'FINALIZED': return 'Finalized';
      default: return 'Unknown';
    }
  };

  const sectionPaperSx = {
    p: 3,
    mb: 3,
    backgroundColor: '#fff',
    color: 'inherit',
    transition: 'background-color 0.3s ease',
  };

  // To display as YYYY-MM-DD in UTC:
  const displayDate = inventory?.date ? inventory.date.slice(0, 10) : '';

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={118} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <InfoOutlined sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>Error Loading Data</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {error.response?.data?.message || error.message}
        </Typography>
        <Button variant="contained" onClick={() => refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  // Empty state
  if (!inventory) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <InfoOutlined sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>No Inventory Data</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          There is no inventory data available for the selected date.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      {/* Header with export button */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Store />
              Store Inventory
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
              Track daily meat stock, purchases, and shop transfers.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              size="small"
              sx={{ minWidth: 140 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ 'aria-label': 'Select date' }}
            />
            {inventory && (
              <Tooltip title="Current inventory status">
                <Chip 
                  label={getStatusText(inventory.status)}
                  color={getStatusColor(inventory.status)}
                  variant="outlined"
                />
              </Tooltip>
            )}
            {inventory && inventory.status === 'RECONCILED' && (
              <Tooltip title="Finalize the inventory for the day">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleFinalize}
                  disabled={finalizeMutation.isLoading}
                  sx={{ ml: 2 }}
                  aria-label="Finalize inventory"
                >
                  Finalize Day
                </Button>
              </Tooltip>
            )}
            {inventory && inventory.status === 'FINALIZED' && (
              <Tooltip title="Unfinalize the inventory to allow edits">
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to unfinalize this inventory?')) {
                      unfinalizeMutation.mutate();
                    }
                  }}
                  disabled={unfinalizeMutation.isLoading}
                  sx={{ ml: 2 }}
                  aria-label="Unfinalize inventory"
                >
                  Unfinalize
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Print this page">
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => window.print()}
                aria-label="Print inventory"
              >
                Print
              </Button>
            </Tooltip>
            <Button 
              variant="outlined" 
              startIcon={<SaveAlt />}
              onClick={handleExport}
              aria-label="Export inventory data"
            >
              Export Data
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Finalization</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to finalize this inventory? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmFinalize} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Alert */}
      {inventory && (
        <Alert 
          severity={inventory.status === 'FINALIZED' ? 'success' : 'info'} 
          sx={{ mb: 3, borderRadius: 2, boxShadow: 1 }}
        >
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Status: {getStatusText(inventory.status)}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {inventory.status === 'FINALIZED' 
              ? 'This inventory has been finalized and cannot be modified.'
              : inventory.status === 'RECONCILED'
              ? 'Inventory has been reconciled. You can now finalize the day.'
              : 'Continue adding purchases and transfers, then reconcile the final stock.'
            }
          </Typography>
        </Alert>
      )}

      {/* Summary Cards with Sparklines */}
      <Paper elevation={3} sx={sectionPaperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Inventory Summary</Typography>
          <Button 
            size="small" 
            onClick={() => toggleSection('summary')} 
            startIcon={expandedSections.summary ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.summary ? 'Collapse' : 'Expand'} summary`}
          >
            {expandedSections.summary ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.summary}>
          <MemoizedInventorySummary 
            inventory={inventory} 
            productTypes={productTypes}
            shopTypes={shopTypes}
          />
        </Collapse>
      </Paper>

      {/* User Registration Section */}
      <Paper elevation={3} sx={sectionPaperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Register New Storekeeper</Typography>
          <Button 
            size="small" 
            onClick={() => toggleSection('userRegistration')} 
            startIcon={expandedSections.userRegistration ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.userRegistration ? 'Collapse' : 'Expand'} user registration`}
          >
            {expandedSections.userRegistration ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.userRegistration}>
          <Box component="form" onSubmit={handleUserRegister} sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
            {userRegError && <Alert severity="error" sx={{ mb: 2 }}>{userRegError}</Alert>}
            {userRegSuccess && <Alert severity="success" sx={{ mb: 2 }}>{userRegSuccess}</Alert>}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              required
              inputProps={{ 'aria-label': 'Username' }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              inputProps={{ 'aria-label': 'Password' }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ mt: 2 }} 
              disabled={userRegLoading}
              aria-label="Register user"
            >
              Register
            </Button>
          </Box>
        </Collapse>
      </Paper>

      {/* Detailed Stock and Pricing Section */}
      <Paper elevation={3} sx={sectionPaperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Shop Stock</Typography>
          <Button 
            size="small" 
            onClick={() => toggleSection('stock')} 
            startIcon={expandedSections.stock ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.stock ? 'Collapse' : 'Expand'} shop stock`}
          >
            {expandedSections.stock ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.stock}>
          <MemoizedShopStockSection
            inventory={inventory}
            readOnly={inventory.status === 'FINALIZED'}
            onUpdate={() => queryClient.invalidateQueries(['store-inventory', selectedDate])}
          />
        </Collapse>
      </Paper>

      {/* Virtualized Shop Transfers Section */}
      <Paper elevation={3} sx={sectionPaperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Shop Transfers</Typography>
          <Button 
            size="small" 
            onClick={() => toggleSection('transfers')} 
            startIcon={expandedSections.transfers ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.transfers ? 'Collapse' : 'Expand'} shop transfers`}
          >
            {expandedSections.transfers ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.transfers}>
          <MemoizedShopTransfersSection
            inventory={inventory}
            productTypes={productTypes}
            shopTypes={shopTypes}
            readOnly={inventory.status === 'FINALIZED'}
            onUpdate={() => queryClient.invalidateQueries(['store-inventory', selectedDate])}
          />
        </Collapse>
      </Paper>

      {/* Daily Purchases Section */}
      <Paper elevation={3} sx={sectionPaperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Daily Purchases</Typography>
          <Button 
            size="small" 
            onClick={() => toggleSection('purchases')} 
            startIcon={expandedSections.purchases ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.purchases ? 'Collapse' : 'Expand'} daily purchases`}
          >
            {expandedSections.purchases ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.purchases}>
          <MemoizedDailyPurchasesSection
            inventory={inventory}
            productTypes={productTypes}
            readOnly={inventory.status === 'FINALIZED'}
            onUpdate={() => queryClient.invalidateQueries(['store-inventory', selectedDate])}
          />
        </Collapse>
      </Paper>

      {/* Stock Reconciliation Section */}
      <Paper elevation={3} sx={sectionPaperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Stock Reconciliation</Typography>
          <Button 
            size="small" 
            onClick={() => toggleSection('reconciliation')} 
            startIcon={expandedSections.reconciliation ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.reconciliation ? 'Collapse' : 'Expand'} stock reconciliation`}
          >
            {expandedSections.reconciliation ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.reconciliation}>
          <MemoizedStockReconciliationSection
            inventory={inventory}
            productTypes={productTypes}
            readOnly={inventory.status === 'FINALIZED'}
            onUpdate={() => queryClient.invalidateQueries(['store-inventory', selectedDate])}
          />
        </Collapse>
      </Paper>
    </Box>
  );
};

export default StoreInventoryDashboard;
