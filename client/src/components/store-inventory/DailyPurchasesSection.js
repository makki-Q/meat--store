import React, { useState, useContext } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, IconButton, Alert, Chip,
  Accordion, AccordionSummary, AccordionDetails, Grid
} from '@mui/material';
import {
  Add, Delete, Edit, LocalShipping, ExpandMore, Save, Cancel
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const DailyPurchasesSection = ({ inventory, productTypes, readOnly, onUpdate }) => {
  const { auth } = useContext(AuthContext); // <-- Get auth context for token
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [formData, setFormData] = useState({
    supplier: '',
    products: [],
    totalCost: 0,
    notes: ''
  });

  const queryClient = useQueryClient();

  // Add purchase mutation WITH AUTH HEADER
  const addPurchaseMutation = useMutation(
    (purchaseData) => axios.post(
      `/api/store-inventory/${inventory._id}/purchases`,
      purchaseData,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        onUpdate();
        handleClose();
      }
    }
  );

  // Update purchase mutation WITH AUTH HEADER
  const updatePurchaseMutation = useMutation(
    ({ purchaseId, purchaseData }) => axios.put(
      `/api/store-inventory/${inventory._id}/purchases/${purchaseId}`,
      purchaseData,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        onUpdate();
        handleClose();
      }
    }
  );

  // Delete purchase mutation WITH AUTH HEADER
  const deletePurchaseMutation = useMutation(
    (purchaseId) => axios.delete(
      `/api/store-inventory/${inventory._id}/purchases/${purchaseId}`,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        onUpdate();
      },
      onError: (error) => {
        console.error('Delete error:', error);
        alert(`Failed to delete purchase: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  const handleClose = () => {
    setOpen(false);
    setEditingPurchase(null);
    setFormData({
      supplier: '',
      products: [],
      totalCost: 0,
      notes: ''
    });
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        { productType: '', pieces: 0, weight: 0, pricePerUnit: 0, vatPercentage: 0 }
      ]
    });
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index][field] = field === 'productType' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleSubmit = () => {
    if (!formData.supplier.trim()) {
      alert('Please enter supplier name');
      return;
    }

    if (formData.products.length === 0) {
      alert('Please add at least one product');
      return;
    }

    // Filter out empty products
    const validProducts = formData.products.filter(p =>
      p.productType && (p.pieces > 0 || p.weight > 0)
    );

    if (validProducts.length === 0) {
      alert('Please add valid product quantities');
      return;
    }

    const purchaseData = {
      ...formData,
      products: validProducts
    };

    if (editingPurchase) {
      // Update existing purchase
      updatePurchaseMutation.mutate({
        purchaseId: editingPurchase._id,
        purchaseData
      });
    } else {
      // Add new purchase
      addPurchaseMutation.mutate(purchaseData);
    }
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplier: purchase.supplier,
      products: purchase.products.map(p => ({ ...p })), // Deep copy
      subtotal: purchase.subtotal || 0,
      totalVatAmount: purchase.totalVatAmount || 0,
      totalCost: purchase.totalCost || 0,
      notes: purchase.notes || ''
    });
    setOpen(true);
  };

  const handleDelete = (purchase) => {
    const confirmMessage = `Are you sure you want to delete this purchase from ${purchase.supplier}?\n\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      deletePurchaseMutation.mutate(purchase._id);
    }
  };

  // Calculate totals
  const calculatePurchaseTotals = () => {
    return (inventory?.dailyPurchases || []).reduce((acc, purchase) => {
      const purchaseTotal = purchase.products.reduce((pAcc, product) => {
        pAcc.pieces += product.pieces || 0;
        pAcc.weight += product.weight || 0;
        pAcc.subtotal += product.subtotal || 0;
        pAcc.vatAmount += product.vatAmount || 0;
        return pAcc;
      }, { pieces: 0, weight: 0, subtotal: 0, vatAmount: 0 });

      acc.pieces += purchaseTotal.pieces;
      acc.weight += purchaseTotal.weight;
      acc.subtotal += purchaseTotal.subtotal;
      acc.vatAmount += purchaseTotal.vatAmount;
      acc.cost += purchase.totalCost || 0;
      return acc;
    }, { pieces: 0, weight: 0, subtotal: 0, vatAmount: 0, cost: 0 });
  };

  const totals = calculatePurchaseTotals();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Daily Purchases - {new Date(inventory?.date).toLocaleDateString()}
        </Typography>
        <Box display="flex" gap={2}>
          <Chip 
            label={`${inventory?.dailyPurchases?.length || 0} purchases`} 
            color="success" 
            variant="outlined" 
          />
          <Chip 
            label={`Total: ${totals.pieces} pieces, ${totals.weight.toFixed(1)} KG`} 
            color="success" 
            variant="outlined" 
          />
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
            >
              Add Purchase
            </Button>
          )}
        </Box>
      </Box>

      {/* Purchases List */}
      {inventory?.dailyPurchases && inventory.dailyPurchases.length > 0 ? (
        <Box>
          {inventory.dailyPurchases.map((purchase, index) => {
            const purchaseTotal = purchase.products.reduce((acc, product) => {
              acc.pieces += product.pieces || 0;
              acc.weight += product.weight || 0;
              return acc;
            }, { pieces: 0, weight: 0 });

            return (
              <Accordion key={purchase._id || index} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                    <Box>
                      <Typography variant="subtitle1">
                        <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {purchase.supplier}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {purchase.products.length} product(s) • {purchaseTotal.pieces} pieces • {purchaseTotal.weight.toFixed(1)} KG
                        {purchase.totalCost > 0 && ` • AED ${purchase.totalCost.toFixed(2)}`}
                      </Typography>
                    </Box>
                    {!readOnly && (
                      <Box>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(purchase);
                          }}
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(purchase);
                          }}
                          color="error"
                          size="small"
                          disabled={deletePurchaseMutation.isLoading}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="center">Pieces</TableCell>
                          <TableCell align="center">Weight (KG)</TableCell>
                          <TableCell align="center">Price/KG</TableCell>
                          <TableCell align="center">VAT %</TableCell>
                          <TableCell align="center">Total Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {purchase.products.map((product, pIndex) => (
                          <TableRow key={pIndex}>
                            <TableCell>
                              {productTypes[product.productType] || product.productType}
                            </TableCell>
                            <TableCell align="center">{product.pieces}</TableCell>
                            <TableCell align="center">{product.weight.toFixed(1)}</TableCell>
                            <TableCell align="center">
                              {product.pricePerUnit ? `${product.pricePerUnit.toFixed(2)} AED` : 'N/A'}
                            </TableCell>
                            <TableCell align="center">
                              {product.vatPercentage ? `${product.vatPercentage}%` : '0%'}
                            </TableCell>
                            <TableCell align="center">
                              {product.totalCost ? `${product.totalCost.toFixed(2)} AED` : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {purchase.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      <strong>Notes:</strong> {purchase.notes}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Purchase Time:</strong> {new Date(purchase.purchaseTime).toLocaleString()}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Summary */}
          <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
            <Typography variant="subtitle1" gutterBottom>
              Daily Purchase Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={2}>
                <Typography variant="h6" color="success.main">{totals.pieces}</Typography>
                <Typography variant="body2">Total Pieces</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="h6" color="success.main">{totals.weight.toFixed(1)}</Typography>
                <Typography variant="body2">Total Weight (KG)</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="h6" color="success.main">
                  {totals.pieces > 0 ? (totals.weight / totals.pieces).toFixed(2) : '0.00'}
                </Typography>
                <Typography variant="body2">Avg Weight/Piece</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="h6" color="success.main">
                  {totals.subtotal > 0 ? `AED ${totals.subtotal.toFixed(2)}` : 'N/A'}
                </Typography>
                <Typography variant="body2">Subtotal</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="h6" color="success.main">
                  {totals.vatAmount > 0 ? `AED ${totals.vatAmount.toFixed(2)}` : 'N/A'}
                </Typography>
                <Typography variant="body2">Total VAT</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="h6" color="success.main">
                  {totals.cost > 0 ? `AED ${totals.cost.toFixed(2)}` : 'N/A'}
                </Typography>
                <Typography variant="body2">Total Cost</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      ) : (
        <Alert severity="info">
          No purchases recorded for today. Click "Add Purchase" to record meat deliveries.
        </Alert>
      )}

      {/* Add Purchase Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingPurchase ? 'Edit Purchase' : 'Add Daily Purchase'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Supplier Name"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            margin="normal"
            required
          />

          <Box mt={2} mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">Products</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddProduct}
              >
                Add Product
              </Button>
            </Box>

            {formData.products.map((product, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }} variant="outlined">
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      select
                      fullWidth
                      label="Product"
                      value={product.productType}
                      onChange={(e) => handleProductChange(index, 'productType', e.target.value)}
                      size="small"
                    >
                      {Object.entries(productTypes).map(([key, name]) => (
                        <MenuItem key={key} value={key}>{name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Pieces"
                      value={product.pieces}
                      onChange={(e) => handleProductChange(index, 'pieces', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, step: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Weight (KG)"
                      value={product.weight}
                      onChange={(e) => handleProductChange(index, 'weight', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Price/KG (AED)"
                      value={product.pricePerUnit || 0}
                      onChange={(e) => handleProductChange(index, 'pricePerUnit', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="VAT (%)"
                      value={product.vatPercentage || 0}
                      onChange={(e) => handleProductChange(index, 'vatPercentage', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      onClick={() => handleRemoveProduct(index)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>

                {/* Cost calculation display */}
                <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Subtotal: {((product.weight || 0) * (product.pricePerUnit || 0)).toFixed(2)} AED |
                    VAT: {(((product.weight || 0) * (product.pricePerUnit || 0) * (product.vatPercentage || 0)) / 100).toFixed(2)} AED |
                    Total: {((product.weight || 0) * (product.pricePerUnit || 0) * (1 + (product.vatPercentage || 0) / 100)).toFixed(2)} AED
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>

          <TextField
            fullWidth
            type="number"
            label="Total Cost (AED) - Optional"
            value={formData.totalCost}
            onChange={(e) => setFormData({ ...formData, totalCost: parseFloat(e.target.value) || 0 })}
            margin="normal"
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes (Optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<Save />}
            disabled={addPurchaseMutation.isLoading || updatePurchaseMutation.isLoading}
          >
            {editingPurchase ? 'Update Purchase' : 'Add Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyPurchasesSection;
