import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const ShopStockSection = ({ inventory, readOnly, onUpdate }) => {
  const { auth } = useContext(AuthContext); // Get auth context for token
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (inventory) {
      setDescription(inventory.shopStockDescription || '');
    }
  }, [inventory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(
        '/api/store-inventory',
        {
          date: inventory.date,
          shopStockDescription: description,
          _id: inventory._id
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      onUpdate();
    } catch (error) {
      alert('Failed to save shop stock description.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Shop Stock Description
      </Typography>
      <TextField
        label="Description for 3 shops"
        multiline
        rows={6}
        fullWidth
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={readOnly}
        variant="outlined"
      />
      {!readOnly && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
          sx={{ mt: 2 }}
        >
          {saving ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      )}
    </Box>
  );
};

export default ShopStockSection;
