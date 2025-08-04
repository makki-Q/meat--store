import React, { useEffect, useState, useContext } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const AdminVerifyUsers = () => {
  const { auth } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchUsers = async () => {
    setError(null);
    try {
      const response = await axios.get('/api/auth/storekeeper-users', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerify = async (userId) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await axios.post('/api/auth/verify-user', { userId }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setSuccess('User verified successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify user');
    } finally {
      setLoading(false);
    }
  };

  const openDisableDialog = (user) => {
    setSelectedUser(user);
    setDisableDialogOpen(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const closeDisableDialog = () => {
    setDisableDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDisableToggle = async () => {
    if (!selectedUser) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await axios.post('/api/auth/disable-user', { userId: selectedUser._id, disable: !selectedUser.disabled }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setActionSuccess(`User ${selectedUser.disabled ? 'enabled' : 'disabled'} successfully`);
      fetchUsers();
      closeDisableDialog();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const openResetDialog = (user) => {
    setSelectedUser(user);
    setResetDialogOpen(true);
    setNewPassword('');
    setActionError(null);
    setActionSuccess(null);
  };

  const closeResetDialog = () => {
    setResetDialogOpen(false);
    setSelectedUser(null);
    setNewPassword('');
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      setActionError('New password is required');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await axios.post('/api/auth/reset-password', { userId: selectedUser._id, newPassword }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setActionSuccess('Password reset successfully');
      closeResetDialog();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Verify Storekeeper Users
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Verified</TableCell>
              <TableCell>Disabled</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">No users found.</TableCell>
              </TableRow>
            )}
            {users.map(user => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.verified ? 'Yes' : 'No'}</TableCell>
                <TableCell>{user.disabled ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  {!user.verified && (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="small" 
                      onClick={() => handleVerify(user._id)}
                      disabled={loading}
                      sx={{ mr: 1 }}
                    >
                      Verify
                    </Button>
                  )}
                  <Button 
                    variant="outlined" 
                    color={user.disabled ? 'success' : 'error'} 
                    size="small" 
                    onClick={() => openDisableDialog(user)}
                    sx={{ mr: 1 }}
                  >
                    {user.disabled ? 'Enable' : 'Disable'}
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    size="small" 
                    onClick={() => openResetDialog(user)}
                  >
                    Reset Password
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Disable User Dialog */}
      <Dialog open={disableDialogOpen} onClose={closeDisableDialog}>
        <DialogTitle>{selectedUser?.disabled ? 'Enable User' : 'Disable User'}</DialogTitle>
        <DialogContent>
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          {actionSuccess && <Alert severity="success" sx={{ mb: 2 }}>{actionSuccess}</Alert>}
          <Typography>
            Are you sure you want to {selectedUser?.disabled ? 'enable' : 'disable'} user "{selectedUser?.username}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDisableDialog}>Cancel</Button>
          <Button onClick={handleDisableToggle} variant="contained" color={selectedUser?.disabled ? 'success' : 'error'}>
            {selectedUser?.disabled ? 'Enable' : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onClose={closeResetDialog}>
        <DialogTitle>Reset Password for {selectedUser?.username}</DialogTitle>
        <DialogContent>
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          {actionSuccess && <Alert severity="success" sx={{ mb: 2 }}>{actionSuccess}</Alert>}
          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResetDialog}>Cancel</Button>
          <Button onClick={handleResetPassword} variant="contained" color="primary">
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminVerifyUsers;
