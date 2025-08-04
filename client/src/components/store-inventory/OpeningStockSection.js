import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, Alert, Chip
} from '@mui/material';
import { Info } from '@mui/icons-material';

const OpeningStockSection = ({ inventory, productTypes, readOnly }) => {
  const openingStock = inventory?.openingStock || [];

  // Create a complete list of all products with their opening stock
  const allProducts = Object.entries(productTypes).map(([productKey, productName]) => {
    const stockItem = openingStock.find(item => item.productType === productKey);
    return {
      productType: productKey,
      productName,
      pieces: stockItem?.pieces || 0,
      weight: stockItem?.weight || 0
    };
  });

  const totalPieces = allProducts.reduce((sum, item) => sum + item.pieces, 0);
  const totalWeight = allProducts.reduce((sum, item) => sum + item.weight, 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Opening Stock - {new Date(inventory?.date).toLocaleDateString()}
        </Typography>
        <Box display="flex" gap={2}>
          <Chip 
            label={`Total: ${totalPieces} pieces`} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={`Total: ${totalWeight.toFixed(1)} KG`} 
            color="primary" 
            variant="outlined" 
          />
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center">
          <Info sx={{ mr: 1 }} />
          <Typography variant="body2">
            Opening stock is automatically carried forward from the previous day's final stock. 
            This represents what was left in the store at the end of yesterday.
          </Typography>
        </Box>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product</strong></TableCell>
              <TableCell align="center"><strong>Pieces</strong></TableCell>
              <TableCell align="center"><strong>Weight (KG)</strong></TableCell>
              <TableCell align="center"><strong>Avg Weight/Piece</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allProducts.map((item) => {
              const avgWeight = item.pieces > 0 ? (item.weight / item.pieces).toFixed(2) : '0.00';
              
              return (
                <TableRow 
                  key={item.productType}
                  sx={{ 
                    backgroundColor: item.pieces === 0 && item.weight === 0 ? '#f5f5f5' : 'inherit',
                    '&:hover': { backgroundColor: '#f0f0f0' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.productName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      color={item.pieces === 0 ? 'text.secondary' : 'text.primary'}
                    >
                      {item.pieces}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2"
                      color={item.weight === 0 ? 'text.secondary' : 'text.primary'}
                    >
                      {item.weight.toFixed(1)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {avgWeight}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {/* Total Row */}
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  TOTAL OPENING STOCK
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold" color="primary">
                  {totalPieces}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold" color="primary">
                  {totalWeight.toFixed(1)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" color="text.secondary">
                  {totalPieces > 0 ? (totalWeight / totalPieces).toFixed(2) : '0.00'}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Additional Information */}
      <Box mt={3}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Opening stock cannot be modified directly. It is automatically 
          calculated from the previous day's final reconciled stock. If you need to make 
          adjustments, use the Stock Reconciliation section to account for any discrepancies.
        </Typography>
      </Box>

      {/* Empty State */}
      {totalPieces === 0 && totalWeight === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            No opening stock found. This might be the first day of operations or the
            previous day's inventory was not properly finalized.
          </Typography>
        </Alert>
      )}

      {/* Product Breakdown */}
      {totalPieces > 0 && (
        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>
            Product Distribution
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {allProducts
              .filter(item => item.pieces > 0 || item.weight > 0)
              .map((item) => (
                <Chip
                  key={item.productType}
                  label={`${item.productName}: ${item.pieces}pcs (${item.weight.toFixed(1)}kg)`}
                  variant="outlined"
                  size="small"
                  color="primary"
                />
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OpeningStockSection;
