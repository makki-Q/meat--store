import React, { useState, useContext } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import { Store, Add, ExpandMore, Delete, Edit } from '@mui/icons-material';
import { grey } from '@mui/material/colors';
import axios from 'axios';
import { useMutation } from 'react-query';
import { AuthContext } from '../../context/AuthContext';

const ShopTransfersSection = ({ inventory, productTypes, shopTypes, readOnly, onUpdate }) => {
  const { auth } = useContext(AuthContext); // <-- Get auth context for token
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shop: '',
    products: [],
    notes: ''
  });
  const [selectedShop, setSelectedShop] = useState(null);
  const [editingTransferId, setEditingTransferId] = useState(null);

  // Add transfer mutation WITH AUTH HEADER
  const addTransferMutation = useMutation(
    (transferData) => axios.post(
      `/api/store-inventory/${inventory._id}/transfers`,
      transferData,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        setOpen(false);
        setFormData({ shop: '', products: [], notes: '' });
        setEditingTransferId(null);
        onUpdate && onUpdate();
      }
    }
  );

  // Update transfer mutation WITH AUTH HEADER
  const updateTransferMutation = useMutation(
    (transferData) => axios.put(
      `/api/store-inventory/${inventory._id}/transfers/${editingTransferId}`,
      transferData,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        setOpen(false);
        setFormData({ shop: '', products: [], notes: '' });
        setEditingTransferId(null);
        onUpdate && onUpdate();
      }
    }
  );

  // Delete transfer mutation WITH AUTH HEADER
  const deleteTransferMutation = useMutation(
    (transferId) => axios.delete(
      `/api/store-inventory/${inventory._id}/transfers/${transferId}`,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    ),
    {
      onSuccess: () => {
        onUpdate && onUpdate();
      }
    }
  );

  const handleClose = () => {
    setOpen(false);
    setFormData({ shop: '', products: [], notes: '' });
    setEditingTransferId(null);
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        { productType: '', pieces: '', weight: '' }
      ]
    });
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    if (field === 'pieces' || field === 'weight') {
      if (value === '') {
        updatedProducts[index][field] = '';
      } else {
        updatedProducts[index][field] = Number(value);
      }
    } else {
      updatedProducts[index][field] = value;
    }
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = [...formData.products];
    updatedProducts.splice(index, 1);
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleSubmit = () => {
    if (!formData.shop || formData.products.length === 0) return;
    const cleanedProducts = formData.products.map(p => ({
      productType: p.productType,
      pieces: p.pieces === '' ? 0 : p.pieces,
      weight: p.weight === '' ? 0 : p.weight
    }));

    if (editingTransferId) {
      updateTransferMutation.mutate({ ...formData, products: cleanedProducts });
    } else {
      addTransferMutation.mutate({ ...formData, products: cleanedProducts });
    }
  };

  const handleDelete = (transferId) => {
    if (window.confirm('Delete this transfer?')) {
      deleteTransferMutation.mutate(transferId);
    }
  };

  const handleEdit = (transfer) => {
    setEditingTransferId(transfer._id);
    setFormData({
      shop: transfer.shop,
      products: transfer.products.map(p => ({
        productType: p.productType,
        pieces: p.pieces,
        weight: p.weight
      })),
      notes: transfer.notes || ''
    });
    setOpen(true);
  };

  // Calculate totals by shop
  const calculateShopTotals = () => {
    const totals = {};
    (inventory?.shopTransfers || []).forEach((transfer) => {
      if (!totals[transfer.shop]) {
        totals[transfer.shop] = { pieces: 0, weight: 0, transfers: 0 };
      }
      transfer.products.forEach((p) => {
        totals[transfer.shop].pieces += p.pieces || 0;
        totals[transfer.shop].weight += p.weight || 0;
      });
      totals[transfer.shop].transfers += 1;
    });
    return totals;
  };

  const shopTotals = calculateShopTotals();
  const grandTotal = Object.values(shopTotals).reduce(
    (acc, shop) => ({
      pieces: acc.pieces + shop.pieces,
      weight: acc.weight + shop.weight,
      transfers: acc.transfers + shop.transfers
    }),
    { pieces: 0, weight: 0, transfers: 0 }
  );

  // Filter transfers for selected shop
  const filteredTransfers = selectedShop
    ? (inventory?.shopTransfers || []).filter(t => t.shop === selectedShop)
    : inventory?.shopTransfers || [];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Shop Transfers</Typography>
        <Box>
          <Chip
            label={`${grandTotal.transfers} transfers`}
            sx={{ mr: 1 }}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Total: ${grandTotal.pieces} pieces, ${grandTotal.weight.toFixed(1)} KG`}
            color="primary"
            variant="outlined"
          />
          {!readOnly && (
            <Button
              variant="contained"
              sx={{ ml: 2 }}
              onClick={() => {
                setFormData({ shop: '', products: [], notes: '' });
                setEditingTransferId(null);
                setOpen(true);
              }}
            >
              + Add Transfer
            </Button>
          )}
        </Box>
      </Box>

      {/* Shop Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(shopTypes).map(([shopKey, shopName]) => {
          const totals = shopTotals[shopKey] || { pieces: 0, weight: 0, transfers: 0 };
          return (
            <Grid item xs={12} sm={4} key={shopKey}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: selectedShop === shopKey ? `2px solid ${grey[700]}` : undefined,
                  boxShadow: selectedShop === shopKey ? 4 : 1,
                  backgroundColor: selectedShop === shopKey ? grey[100] : undefined
                }}
                onClick={() => setSelectedShop(shopKey)}
              >
                <Store color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6">{shopName}</Typography>
                <Typography variant="h4" color="primary">
                  {totals.pieces}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  pieces • {totals.weight.toFixed(1)} KG
                </Typography>
                <Chip
                  label={`${totals.transfers} transfer(s)`}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Show only selected shop's transfers */}
      {selectedShop && (
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            Showing transfers for: <strong>{shopTypes[selectedShop]}</strong>
            <Button size="small" sx={{ ml: 2 }} onClick={() => setSelectedShop(null)}>
              Show All
            </Button>
          </Typography>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setFormData({ shop: selectedShop, products: [], notes: '' });
                setEditingTransferId(null);
                setOpen(true);
              }}
              sx={{ mb: 2 }}
            >
              Add Transfer to {shopTypes[selectedShop]}
            </Button>
          )}
        </Box>
      )}

      {/* Transfers List */}
      {filteredTransfers.length > 0 ? (
        <Box>
          {filteredTransfers.map((transfer, index) => (
            <Accordion key={transfer._id || index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" width="100%">
                  <Store sx={{ mr: 1 }} />
                  <Typography sx={{ flexGrow: 1 }}>
                    {shopTypes[transfer.shop] || transfer.shop}
                  </Typography>
                  <Typography sx={{ mr: 2 }}>
                    {transfer.products.length} product(s) •{' '}
                    {transfer.products.reduce((sum, p) => sum + (p.pieces || 0), 0)} pieces •{' '}
                    {transfer.products.reduce((sum, p) => sum + (p.weight || 0), 0).toFixed(1)} KG
                  </Typography>
                  {!readOnly && (
                    <>
                      <IconButton
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(transfer);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(transfer._id);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Table size="small" aria-label="transfer products table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Pieces</TableCell>
                        <TableCell align="right">Weight (KG)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transfer.products.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell component="th" scope="row">
                            {productTypes[p.productType] || p.productType}
                          </TableCell>
                          <TableCell align="right">{p.pieces}</TableCell>
                          <TableCell align="right">{p.weight}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {transfer.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Notes: {transfer.notes}
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Alert severity="info">
          {selectedShop
            ? `No transfers recorded for ${shopTypes[selectedShop]}. Click "Add Transfer" to record meat sent to this shop.`
            : 'No transfers recorded for today. Click "Add Transfer" to record meat sent to shops.'}
        </Alert>
      )}

      {/* Add Transfer Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingTransferId ? 'Edit Shop Transfer' : 'Add Shop Transfer'}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Shop"
            value={formData.shop}
            onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
            margin="normal"
            required
            disabled={!!selectedShop || !!editingTransferId}
          >
            {Object.entries(shopTypes).map(([key, name]) => (
              <MenuItem key={key} value={key}>{name}</MenuItem>
            ))}
          </TextField>
          {formData.products.map((product, idx) => (
            <Box key={idx} display="flex" alignItems="center" gap={1} mb={1}>
              <TextField
                select
                label="Product"
                value={product.productType}
                onChange={e => handleProductChange(idx, 'productType', e.target.value)}
                sx={{ minWidth: 180 }}
                required
              >
                {Object.entries(productTypes).map(([key, name]) => (
                  <MenuItem key={key} value={key}>{name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Pieces"
                type="number"
                value={product.pieces}
                onChange={e => handleProductChange(idx, 'pieces', e.target.value)}
                sx={{ width: 100 }}
                required
              />
              <TextField
                label="Weight (KG)"
                type="number"
                value={product.weight}
                onChange={e => handleProductChange(idx, 'weight', e.target.value)}
                sx={{ width: 120 }}
                required
              />
              <IconButton color="error" onClick={() => handleRemoveProduct(idx)}>
                <Delete />
              </IconButton>
            </Box>
          ))}
          <Button
            variant="outlined"
            onClick={handleAddProduct}
            sx={{ mt: 1, mb: 2 }}
            startIcon={<Add />}
          >
            Add Product
          </Button>
          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={2}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.shop ||
              formData.products.length === 0 ||
              formData.products.some(p => !p.productType || p.weight <= 0)
            }
          >
            Save Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShopTransfersSection;
