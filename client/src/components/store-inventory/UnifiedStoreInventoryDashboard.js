import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, MenuItem, Alert, CircularProgress
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const UnifiedStoreInventoryDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShop, setSelectedShop] = useState('');
  const [transferProducts, setTransferProducts] = useState([]);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  // Fetch inventory for selected date
  const { data: inventory, isLoading, error, refetch } = useQuery(
    ['store-inventory', selectedDate],
    () => {
      if (selectedDate === new Date().toISOString().split('T')[0]) {
        return axios.get('/api/store-inventory/today').then(res => res.data);
      } else {
        return axios.get(`/api/store-inventory/date/${selectedDate}`).then(res => res.data);
      }
    },
    { refetchOnWindowFocus: false, staleTime: 30000 }
  );

  // Fetch shop types
  const { data: shopTypes = {} } = useQuery(
    'shop-types',
    () => axios.get('/api/store-inventory/shop-types').then(res => res.data),
    { staleTime: Infinity }
  );

  // Fetch product types
  const { data: productTypes = {} } = useQuery(
    'product-types',
    () => axios.get('/api/store-inventory/product-types').then(res => res.data),
    { staleTime: Infinity }
  );

  // Mutation to add shop transfer
  const addTransferMutation = useMutation(
    (transferData) => axios.post(`/api/store-inventory/${inventory._id}/transfers`, transferData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['store-inventory', selectedDate]);
        setTransferProducts([]);
        setNotes('');
      }
    }
  );

  const handleAddProduct = () => {
    setTransferProducts([...transferProducts, { productType: '', pieces: 0, weight: 0 }]);
  };

  const handleProductChange = (index, field, value) => {
    const updated = [...transferProducts];
    updated[index][field] = field === 'productType' ? value : parseFloat(value) || 0;
    setTransferProducts(updated);
  };

  const handleRemoveProduct = (index) => {
    const updated = transferProducts.filter((_, i) => i !== index);
    setTransferProducts(updated);
  };

  const handleSubmit = () => {
    if (!selectedShop) {
      alert('Please select a shop');
      return;
    }
    if (transferProducts.length === 0) {
      alert('Please add at least one product');
      return;
    }
    const validProducts = transferProducts.filter(p => p.productType && (p.pieces > 0 || p.weight > 0));
    if (validProducts.length === 0) {
      alert('Please add valid product quantities');
      return;
    }

    // Validate stock availability
    const availableStock = {};
    (inventory?.calculatedRemainingStock || []).forEach(item => {
      availableStock[item.productType] = { pieces: item.pieces, weight: item.weight };
    });

    for (const product of validProducts) {
      const available = availableStock[product.productType] || { pieces: 0, weight: 0 };
      if (product.pieces > available.pieces || product.weight > available.weight) {
        const productName = productTypes[product.productType];
        alert(`Insufficient stock for ${productName}. Available: ${available.pieces} pieces, ${available.weight.toFixed(1)} KG`);
        return;
      }
    }

    addTransferMutation.mutate({
      shop: selectedShop,
      products: validProducts,
      notes
    });
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Unified Store Inventory Dashboard</Typography>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Unified Store Inventory Dashboard</Typography>
        <Alert severity="error">Error loading inventory: {error.message}</Alert>
      </Box>
    );
  }

  // Calculate totals per shop
  const shopTotals = {};
  (inventory?.shopTransfers || []).forEach(transfer => {
    if (!shopTotals[transfer.shop]) {
      shopTotals[transfer.shop] = { pieces: 0, weight: 0, transfers: 0 };
    }
    transfer.products.forEach(product => {
      shopTotals[transfer.shop].pieces += product.pieces || 0;
      shopTotals[transfer.shop].weight += product.weight || 0;
    });
    shopTotals[transfer.shop].transfers += 1;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Unified Store Inventory Dashboard</Typography>

      <Box mb={3}>
        <TextField
          type="date"
          label="Select Date"
          value={selectedDate}
