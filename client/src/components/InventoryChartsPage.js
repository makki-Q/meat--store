import React, { useState, useContext, useMemo } from 'react';
import { Box, Typography, Button, Chip, Paper, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { useQuery } from 'react-query';
import { AuthContext } from '../context/AuthContext';

const InventoryChartsPage = () => {
  const { auth } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedSections, setExpandedSections] = useState({
    inventoryChart: true,
    pieChart: true,
  });

  // Fetch inventory data
  const { data: inventory, isLoading, error, refetch } = useQuery(
    ['store-inventory', selectedDate],
    () => {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const endpoint = selectedDate === new Date().toISOString().split('T')[0]
        ? '/api/store-inventory/today'
        : `/api/store-inventory/date/${selectedDate}`;
      return axios.get(endpoint, config).then(res => res.data);
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

  const pieChartData = useMemo(() =>
    Object.entries(inventory?.productTypes || {}).map(([name]) => ({
      name,
      value: inventory?.totalAvailableStock?.filter(item => item.type === name).reduce((a, b) => a + (b.pieces || 0), 0) || 0
    })), [inventory]);

  if (isLoading) {
    return <Typography sx={{ p: 3 }}>Loading...</Typography>;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">Error loading inventory data.</Typography>
        <Button onClick={() => refetch()}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      {/* Inventory Flow Visualization */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Inventory Flow Visualization</Typography>
          <Button
            size="small"
            onClick={() => toggleSection('inventoryChart')}
            startIcon={expandedSections.inventoryChart ? <ExpandLess /> : <ExpandMore />}
            aria-label={`${expandedSections.inventoryChart ? 'Collapse' : 'Expand'} inventory chart`}
          >
            {expandedSections.inventoryChart ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.inventoryChart}>
          <Box sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Chip
                label={`Date: ${new Date(selectedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={inventoryChartData}
                margin={{ top: 20, right: 30, left: 30, bottom: 60 }}
                layout="vertical"
                barCategoryGap={15}
                barGap={5}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  label={{
                    value: 'Number of Pieces',
                    position: 'bottom',
                    offset: -10
                  }}
                  tickFormatter={(value) => new Intl.NumberFormat('en').format(value)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip
                  formatter={(value, name) => [
                    name === 'Value'
                      ? `KSh ${new Intl.NumberFormat('en').format(value)}`
                      : `${new Intl.NumberFormat('en').format(value)} pieces`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => <span style={{ color: '#333' }}>{value}</span>}
                />
                <Bar
                  dataKey="pieces"
                  name="Quantity (pieces)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={60}
                  background={{ fill: '#f5f5f5', radius: 4 }}
                >
                  {inventoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={['#4e79a7', '#59a14f', '#f28e2b', '#e15759'][index % 4]}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="value"
                  name="Value (KSh)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={60}
                  background={{ fill: '#f5f5f5', radius: 4 }}
                >
                  {inventoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-value-${index}`}
                      fill={['#76b7b2', '#a0cbe8', '#ff9da7', '#9c755f'][index % 4]}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
              {inventoryChartData.map((item, index) => (
                <Chip
                  key={`legend-${index}`}
                  label={`${item.name}: ${new Intl.NumberFormat('en').format(item.pieces)} pieces (KSh ${new Intl.NumberFormat('en').format(item.value)})`}
                  size="small"
                  sx={{
                    backgroundColor: index % 2 === 0 ? '#e3f2fd' : '#e8f5e9',
                    border: '1px solid ' + (index % 2 === 0 ? '#bbdefb' : '#c8e6c9'),
                    fontWeight: 500
                  }}
                />
              ))}
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* Inventory Distribution */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Inventory Distribution</Typography>
          <Button
            size="small"
            onClick={() => toggleSection('pieChart')}
            startIcon={expandedSections.pieChart ? <ExpandLess /> : <ExpandMore />}
            aria-label={expandedSections.pieChart ? 'Collapse pie chart' : 'Expand pie chart'}
          >
            {expandedSections.pieChart ? 'Collapse' : 'Expand'}
          </Button>
        </Box>
        <Collapse in={expandedSections.pieChart}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value, name) => [`${value} pieces`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default InventoryChartsPage;
