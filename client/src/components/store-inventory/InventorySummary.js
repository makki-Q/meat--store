import React from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Chip,
  Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import {
  Inventory, LocalShipping, Store, Assessment,
  TrendingUp, TrendingDown, Remove
} from '@mui/icons-material';

const InventorySummary = ({ inventory, productTypes, shopTypes }) => {
  // Calculate totals
  const calculateTotals = (stockArray) => {
    return stockArray.reduce((acc, item) => {
      acc.totalPieces += item.pieces || 0;
      acc.totalWeight += item.weight || 0;
      return acc;
    }, { totalPieces: 0, totalWeight: 0 });
  };

  const openingTotals = calculateTotals(inventory.openingStock || []);
  
  const purchaseTotals = inventory.dailyPurchases?.reduce((acc, purchase) => {
    const purchaseTotal = calculateTotals(purchase.products || []);
    acc.totalPieces += purchaseTotal.totalPieces;
    acc.totalWeight += purchaseTotal.totalWeight;
    return acc;
  }, { totalPieces: 0, totalWeight: 0 }) || { totalPieces: 0, totalWeight: 0 };

  const transferTotals = inventory.shopTransfers?.reduce((acc, transfer) => {
    const transferTotal = calculateTotals(transfer.products || []);
    acc.totalPieces += transferTotal.totalPieces;
    acc.totalWeight += transferTotal.totalWeight;
    return acc;
  }, { totalPieces: 0, totalWeight: 0 }) || { totalPieces: 0, totalWeight: 0 };

  const availableTotals = calculateTotals(inventory.totalAvailableStock || []);
  const remainingTotals = calculateTotals(inventory.calculatedRemainingStock || []);

  // Calculate reconciliation differences
  const reconciliationDiffs = inventory.stockReconciliation?.reduce((acc, recon) => {
    acc.piecesDiff += recon.differencePieces || 0;
    acc.weightDiff += recon.differenceWeight || 0;
    return acc;
  }, { piecesDiff: 0, weightDiff: 0 }) || { piecesDiff: 0, weightDiff: 0 };

  // Calculate actual totals from stock reconciliation
  const actualTotals = inventory.stockReconciliation?.reduce((acc, recon) => {
    acc.totalPieces += recon.actualPieces || 0;
    acc.totalWeight += recon.actualWeight || 0;
    return acc;
  }, { totalPieces: 0, totalWeight: 0 }) || { totalPieces: 0, totalWeight: 0 };

  const SummaryCard = ({ title, icon, pieces, weight, color = 'primary', subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {subtitle}
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" color={`${color}.main`}>
              {pieces}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pieces
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="h4" color={`${color}.main`}>
              {weight.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              KG
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const DifferenceCard = ({ title, icon, piecesDiff, weightDiff }) => {
    const getPiecesDiffColor = () => {
      if (piecesDiff > 0) return 'success';
      if (piecesDiff < 0) return 'error';
      return 'default';
    };

    const getWeightDiffColor = () => {
      if (weightDiff > 0) return 'success';
      if (weightDiff < 0) return 'error';
      return 'default';
    };

    const getPiecesDiffIcon = () => {
      if (piecesDiff > 0) return <TrendingUp />;
      if (piecesDiff < 0) return <TrendingDown />;
      return <Remove />;
    };

    const getWeightDiffIcon = () => {
      if (weightDiff > 0) return <TrendingUp />;
      if (weightDiff < 0) return <TrendingDown />;
      return <Remove />;
    };

    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {title}
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" mb={1}>
                {getPiecesDiffIcon()}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Pieces Difference
                </Typography>
              </Box>
              <Chip
                label={piecesDiff > 0 ? `+${piecesDiff}` : piecesDiff.toString()}
                color={getPiecesDiffColor()}
                variant="outlined"
                size="small"
              />
            </Grid>
            
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" mb={1}>
                {getWeightDiffIcon()}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Weight Difference
                </Typography>
              </Box>
              <Chip
                label={`${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)} KG`}
                color={getWeightDiffColor()}
                variant="outlined"
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Grid container spacing={3}>
      {/* Opening Stock */}
      <Grid item xs={12} sm={6} md={3}>
        <SummaryCard
          title="Opening Stock"
          icon={<Inventory color="primary" />}
          pieces={openingTotals.totalPieces}
          weight={openingTotals.totalWeight}
          color="primary"
          subtitle="From previous day"
        />
      </Grid>

      {/* Daily Purchases */}
      <Grid item xs={12} sm={6} md={3}>
        <SummaryCard
          title="Daily Purchases"
          icon={<LocalShipping color="success" />}
          pieces={purchaseTotals.totalPieces}
          weight={purchaseTotals.totalWeight}
          color="success"
          subtitle={`${inventory.dailyPurchases?.length || 0} purchase(s)`}
        />
      </Grid>

      {/* Available Stock */}
      <Grid item xs={12} sm={6} md={3}>
        <SummaryCard
          title="Total Available"
          icon={<Inventory color="info" />}
          pieces={availableTotals.totalPieces}
          weight={availableTotals.totalWeight}
          color="info"
          subtitle="Opening + Purchases"
        />
      </Grid>

      {/* Shop Transfers */}
      <Grid item xs={12} sm={6} md={3}>
        <SummaryCard
          title="Shop Transfers"
          icon={<Store color="warning" />}
          pieces={transferTotals.totalPieces}
          weight={transferTotals.totalWeight}
          color="warning"
          subtitle={`${inventory.shopTransfers?.length || 0} transfer(s)`}
        />
      </Grid>

      {/* Calculated Remaining */}
      <Grid item xs={12} sm={6} md={3}>
        <SummaryCard
          title="Calculated Remaining"
          icon={<Assessment color="secondary" />}
          pieces={remainingTotals.totalPieces}
          weight={remainingTotals.totalWeight}
          color="secondary"
          subtitle="Available - Transfers"
        />
      </Grid>

      {/* Actual Stock */}
      {inventory.stockReconciliation && inventory.stockReconciliation.length > 0 && (
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Actual Stock"
            icon={<Assessment color="success" />}
            pieces={actualTotals.totalPieces}
            weight={actualTotals.totalWeight}
            color="success"
            subtitle="Physical count"
          />
        </Grid>
      )}

      {/* Reconciliation Differences */}
      {inventory.stockReconciliation && inventory.stockReconciliation.length > 0 && (
        <Grid item xs={12} sm={6} md={3}>
          <DifferenceCard
            title="Reconciliation"
            icon={<Assessment color="primary" />}
            piecesDiff={reconciliationDiffs.piecesDiff}
            weightDiff={reconciliationDiffs.weightDiff}
          />
        </Grid>
      )}

      {/* Shop Transfer Breakdown */}
      {inventory.shopTransfers && inventory.shopTransfers.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shop Transfer Breakdown
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(shopTypes).map(([shopKey, shopName]) => {
                  // Aggregate per-product totals for this shop
                  const productTotals = {};
                  inventory.shopTransfers
                    .filter(t => t.shop === shopKey)
                    .forEach(transfer => {
                      (transfer.products || []).forEach(product => {
                        if (!productTotals[product.productType]) {
                          productTotals[product.productType] = { pieces: 0, weight: 0 };
                        }
                        productTotals[product.productType].pieces += product.pieces || 0;
                        productTotals[product.productType].weight += product.weight || 0;
                      });
                    });

                  // Shop totals for summary
                  const shopTotals = Object.values(productTotals).reduce(
                    (acc, cur) => ({
                      totalPieces: acc.totalPieces + cur.pieces,
                      totalWeight: acc.totalWeight + cur.weight,
                    }),
                    { totalPieces: 0, totalWeight: 0 }
                  );

                  // Number of transfers
                  const shopTransfersCount = inventory.shopTransfers.filter(t => t.shop === shopKey).length;

                  return (
                    <Grid item xs={12} sm={4} key={shopKey}>
                      <Box
                        sx={{
                          p: 2,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          {shopName}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {shopTotals.totalPieces} pieces
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {shopTotals.totalWeight.toFixed(1)} KG
                        </Typography>
                        <Chip
                          label={`${shopTransfersCount} transfer(s)`}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 1, mb: 1 }}
                        />
                        {/* Per-product breakdown */}
                        <Box sx={{ mt: 1, textAlign: 'left' }}>
                          {Object.entries(productTotals).length > 0 ? (
                            <Table size="small" sx={{ minWidth: 200 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>Product</strong></TableCell>
                                  <TableCell align="right"><strong>Pieces</strong></TableCell>
                                  <TableCell align="right"><strong>Weight (KG)</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(productTotals).map(([type, stats]) => (
                                  <TableRow key={type}>
                                    <TableCell>
                                      <strong>{productTypes[type] || type}</strong>
                                    </TableCell>
                                    <TableCell align="right">{stats.pieces}</TableCell>
                                    <TableCell align="right">{stats.weight.toFixed(1)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              No transfers
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default InventorySummary;
