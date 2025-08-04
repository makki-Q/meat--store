import React, { useState, useEffect, useContext } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField, Alert, Chip, Grid
} from '@mui/material';
import {
  Assessment, Save, TrendingUp, TrendingDown, Remove, CheckCircle
} from '@mui/icons-material';
import { useMutation } from 'react-query';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const StockReconciliationSection = ({ inventory, productTypes, readOnly, onUpdate }) => {
  const { auth } = useContext(AuthContext);
  const [reconciliationData, setReconciliationData] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Update reconciliation mutation
  const updateReconciliationMutation = useMutation(
    (data) => axios.put(`/api/store-inventory/${inventory._id}/reconciliation`, data, {
      headers: { Authorization: `Bearer ${auth.token}` }
    }),
    {
      onSuccess: () => {
        onUpdate();
        setHasChanges(false);
      }
    }
  );

  // Initialize reconciliation data
  useEffect(() => {
    if (inventory) {
      const calculatedStock = inventory.calculatedRemainingStock || [];
      const existingReconciliation = inventory.stockReconciliation || [];
      
      const reconciliation = Object.entries(productTypes).map(([productKey, productName]) => {
        const calculated = calculatedStock.find(item => item.productType === productKey) || 
                          { pieces: 0, weight: 0 };
        const existing = existingReconciliation.find(item => item.productType === productKey);
        
        return {
          productType: productKey,
          productName,
          calculatedPieces: calculated.pieces,
          calculatedWeight: calculated.weight,
          actualPieces: existing?.actualPieces ?? calculated.pieces,
          actualWeight: existing?.actualWeight ?? calculated.weight,
          differencePieces: existing?.differencePieces ?? 0,
          differenceWeight: existing?.differenceWeight ?? 0,
          notes: existing?.notes || ''
        };
      });
      
      setReconciliationData(reconciliation);
    }
  }, [inventory, productTypes]);

  const handleActualChange = (index, field, value) => {
    const updatedData = [...reconciliationData];
    const numValue = parseFloat(value) || 0;
    updatedData[index][field] = numValue;
    
    // Calculate differences
    if (field === 'actualPieces') {
      updatedData[index].differencePieces = numValue - updatedData[index].calculatedPieces;
    } else if (field === 'actualWeight') {
      updatedData[index].differenceWeight = numValue - updatedData[index].calculatedWeight;
    }
    
    setReconciliationData(updatedData);
    setHasChanges(true);
  };

  const handleNotesChange = (index, value) => {
    const updatedData = [...reconciliationData];
    updatedData[index].notes = value;
    setReconciliationData(updatedData);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateReconciliationMutation.mutate({
      reconciliation: reconciliationData
    });
  };

  const getDifferenceColor = (difference) => {
    if (difference > 0) return 'success';
    if (difference < 0) return 'error';
    return 'default';
  };

  const getDifferenceIcon = (difference) => {
    if (difference > 0) return <TrendingUp />;
    if (difference < 0) return <TrendingDown />;
    return <Remove />;
  };

  // Calculate totals
  const totals = reconciliationData.reduce((acc, item) => {
    acc.calculatedPieces += item.calculatedPieces;
    acc.calculatedWeight += item.calculatedWeight;
    acc.actualPieces += item.actualPieces;
    acc.actualWeight += item.actualWeight;
    acc.differencePieces += item.differencePieces;
    acc.differenceWeight += item.differenceWeight;
    return acc;
  }, {
    calculatedPieces: 0,
    calculatedWeight: 0,
    actualPieces: 0,
    actualWeight: 0,
    differencePieces: 0,
    differenceWeight: 0
  });

  const isReconciled = inventory?.status === 'RECONCILED' || inventory?.status === 'FINALIZED';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Stock Reconciliation - {new Date(inventory?.date).toLocaleDateString()}
        </Typography>
        <Box display="flex" gap={2}>
          {isReconciled && (
            <Chip 
              label="Reconciled" 
              color="success" 
              icon={<CheckCircle />}
              variant="outlined" 
            />
          )}
          <Chip 
            label={`Difference: ${totals.differencePieces > 0 ? '+' : ''}${totals.differencePieces} pieces`} 
            color={getDifferenceColor(totals.differencePieces)}
            variant="outlined" 
          />
          <Chip 
            label={`Difference: ${totals.differenceWeight > 0 ? '+' : ''}${totals.differenceWeight.toFixed(1)} KG`} 
            color={getDifferenceColor(totals.differenceWeight)}
            variant="outlined" 
          />
          {!readOnly && hasChanges && (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={updateReconciliationMutation.isLoading}
            >
              Save Reconciliation
            </Button>
          )}
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Instructions:</strong> Count the actual stock remaining in the store and enter the values below. 
          The system will calculate the differences between calculated and actual stock. 
          These differences help identify shrinkage, wastage, or counting errors.
        </Typography>
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {totals.calculatedPieces}
            </Typography>
            <Typography variant="body2">Calculated Pieces</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="secondary">
              {totals.actualPieces}
            </Typography>
            <Typography variant="body2">Actual Pieces</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {totals.calculatedWeight.toFixed(1)}
            </Typography>
            <Typography variant="body2">Calculated Weight (KG)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="secondary">
              {totals.actualWeight.toFixed(1)}
            </Typography>
            <Typography variant="body2">Actual Weight (KG)</Typography>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product</strong></TableCell>
              <TableCell align="center"><strong>Calculated<br/>Pieces</strong></TableCell>
              <TableCell align="center"><strong>Actual<br/>Pieces</strong></TableCell>
              <TableCell align="center"><strong>Pieces<br/>Difference</strong></TableCell>
              <TableCell align="center"><strong>Calculated<br/>Weight (KG)</strong></TableCell>
              <TableCell align="center"><strong>Actual<br/>Weight (KG)</strong></TableCell>
              <TableCell align="center"><strong>Weight<br/>Difference</strong></TableCell>
              <TableCell><strong>Notes</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reconciliationData.map((item, index) => (
              <TableRow 
                key={item.productType}
                sx={{ 
                  backgroundColor: item.calculatedPieces === 0 && item.calculatedWeight === 0 ? '#f5f5f5' : 'inherit'
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.productName}
                  </Typography>
                </TableCell>
                
                {/* Calculated Pieces */}
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {item.calculatedPieces}
                  </Typography>
                </TableCell>
                
                {/* Actual Pieces */}
                <TableCell align="center">
                <TextField
                    type="number"
                    value={item.actualPieces === '' ? '' : item.actualPieces}
                    onChange={(e) => handleActualChange(index, 'actualPieces', e.target.value)}
                    size="small"
                    inputProps={{ min: 0, step: 1 }}
                    disabled={readOnly}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                
                {/* Pieces Difference */}
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    {getDifferenceIcon(item.differencePieces)}
                    <Typography 
                      variant="body2" 
                      color={`${getDifferenceColor(item.differencePieces)}.main`}
                      sx={{ ml: 0.5 }}
                    >
                      {item.differencePieces > 0 ? '+' : ''}{item.differencePieces}
                    </Typography>
                  </Box>
                </TableCell>
                
                {/* Calculated Weight */}
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {item.calculatedWeight.toFixed(1)}
                  </Typography>
                </TableCell>
                
                {/* Actual Weight */}
                <TableCell align="center">
                <TextField
                    type="number"
                    value={item.actualWeight === '' ? '' : item.actualWeight}
                    onChange={(e) => handleActualChange(index, 'actualWeight', e.target.value)}
                    size="small"
                    inputProps={{ min: 0, step: 0.1 }}
                    disabled={readOnly}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                
                {/* Weight Difference */}
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    {getDifferenceIcon(item.differenceWeight)}
                    <Typography 
                      variant="body2" 
                      color={`${getDifferenceColor(item.differenceWeight)}.main`}
                      sx={{ ml: 0.5 }}
                    >
                      {item.differenceWeight > 0 ? '+' : ''}{item.differenceWeight.toFixed(1)}
                    </Typography>
                  </Box>
                </TableCell>
                
                {/* Notes */}
                <TableCell>
                {/* Removed Notes input as per user request */}
                </TableCell>
              </TableRow>
            ))}
            
            {/* Total Row */}
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  TOTALS
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  {totals.calculatedPieces}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold" color="secondary">
                  {totals.actualPieces}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography 
                  variant="subtitle2" 
                  fontWeight="bold" 
                  color={`${getDifferenceColor(totals.differencePieces)}.main`}
                >
                  {totals.differencePieces > 0 ? '+' : ''}{totals.differencePieces}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  {totals.calculatedWeight.toFixed(1)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold" color="secondary">
                  {totals.actualWeight.toFixed(1)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography 
                  variant="subtitle2" 
                  fontWeight="bold" 
                  color={`${getDifferenceColor(totals.differenceWeight)}.main`}
                >
                  {totals.differenceWeight > 0 ? '+' : ''}{totals.differenceWeight.toFixed(1)}
                </Typography>
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Analysis */}
      {isReconciled && (
        <Box mt={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Reconciliation Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Total Variance:</strong> {Math.abs(totals.differencePieces)} pieces, {Math.abs(totals.differenceWeight).toFixed(1)} KG
                </Typography>
                <Typography variant="body2">
                  <strong>Variance %:</strong> {totals.calculatedPieces > 0 ? ((totals.differencePieces / totals.calculatedPieces) * 100).toFixed(2) : 0}% pieces, {totals.calculatedWeight > 0 ? ((totals.differenceWeight / totals.calculatedWeight) * 100).toFixed(2) : 0}% weight
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Status:</strong> {totals.differencePieces === 0 && totals.differenceWeight === 0 ? 'Perfect Match' : 'Variance Detected'}
                </Typography>
                <Typography variant="body2">
                  <strong>Action Required:</strong> {Math.abs(totals.differencePieces) > 5 || Math.abs(totals.differenceWeight) > 10 ? 'Review Required' : 'Within Tolerance'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default StockReconciliationSection;
