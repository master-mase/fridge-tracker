import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, MenuItem, Alert, List, ListItem, ListItemText, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import './App.css';
import { db } from './firebase'; // Firestore instance
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';

// Categories for food items
const categories = [
  'Dairy', 'Produce', 'Meat', 'Bakery', 'Frozen', 'Beverages', 'Other'
];

// TypeScript type for a food item
interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  expiration: string;
  category: string;
}

// Helper to add days to a date string (YYYY-MM-DD), or today if blank
function addDaysToDate(dateStr: string, days: number): string {
  const baseDate = dateStr ? new Date(dateStr) : new Date();
  baseDate.setDate(baseDate.getDate() + days);
  return baseDate.toISOString().slice(0, 10);
}

function App() {
  // State for form fields
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiration, setExpiration] = useState('');
  const [category, setCategory] = useState('Other');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // State for inventory list
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // State for editing
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<FoodItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editExpiration, setEditExpiration] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
  const [editError, setEditError] = useState('');

  // Remove old tempQuantity/editQuantity dialog logic, keep only one dialog state for calculator
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcValue, setCalcValue] = useState(''); // string for easier editing
  const [calcTarget, setCalcTarget] = useState<'add' | 'edit'>('add');

  // Fetch food items from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'foodItems'), orderBy('expiration'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: FoodItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FoodItem[];
      setItems(data);
      setLoading(false);
    }, (err) => {
      setListError('Failed to load inventory.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Add new item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError('');
    if (!name || !expiration) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      await addDoc(collection(db, 'foodItems'), {
        name,
        quantity,
        expiration,
        category,
        addedAt: new Date().toISOString(),
      });
      setSuccess(true);
      setName('');
      setQuantity(1);
      setExpiration('');
      setCategory('Other');
    } catch (err) {
      setError('Failed to add item. Please try again.');
    }
  };

  // Delete item by id
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'foodItems', id));
    } catch (err) {
      setListError('Failed to delete item.');
    }
  };

  // Open edit dialog
  const handleEditOpen = (item: FoodItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditExpiration(item.expiration);
    setEditCategory(item.category);
    setEditError('');
    setEditOpen(true);
  };

  // Save edited item
  const handleEditSave = async () => {
    if (!editItem) return;
    if (!editName || !editExpiration) {
      setEditError('Please fill in all required fields.');
      return;
    }
    try {
      await updateDoc(doc(db, 'foodItems', editItem.id), {
        name: editName,
        quantity: editQuantity,
        expiration: editExpiration,
        category: editCategory,
      });
      setEditOpen(false);
      setEditItem(null);
    } catch (err) {
      setEditError('Failed to update item.');
    }
  };

  // Open calculator dialog for add or edit
  const openCalcDialog = (target: 'add' | 'edit', current: number) => {
    setCalcTarget(target);
    setCalcValue(current.toString());
    setCalcDialogOpen(true);
  };
  // Handle calculator number input
  const handleCalcNum = (num: string) => {
    setCalcValue(v => (v === '0' ? num : v + num));
  };
  // Handle calculator clear
  const handleCalcClear = () => setCalcValue('');
  // Handle calculator backspace
  const handleCalcBack = () => setCalcValue(v => v.slice(0, -1));
  // Save calculator value
  const handleCalcSave = () => {
    const val = Math.max(1, parseInt(calcValue || '1', 10));
    if (calcTarget === 'add') setQuantity(val);
    else setEditQuantity(val);
    setCalcDialogOpen(false);
  };

  // Quick expiration date shortcuts (now cumulative)
  const handleExpirationShortcut = (days: number) => {
    setExpiration(prev => addDaysToDate(prev, days));
  };
  // For edit dialog
  const handleEditExpirationShortcut = (days: number) => {
    setEditExpiration(prev => addDaysToDate(prev, days));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Fridge Tracker
        </Typography>
        <Box sx={{ my: 2 }}>
          <Typography variant="h6">Add Food Item</Typography>
          {/* Food item form */}
          <form onSubmit={handleAddItem}>
            {/* Name, +, -, Amount button row */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                fullWidth
                margin="normal"
              />
              <Button
                variant="outlined"
                sx={{ minWidth: '40px', height: '56px' }}
                onClick={() => setQuantity(q => q + 1)}
                type="button"
              >
                +
              </Button>
              <Button
                variant="outlined"
                sx={{ minWidth: '40px', height: '56px' }}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                type="button"
              >
                -
              </Button>
              <Button
                variant="outlined"
                sx={{ height: '56px', minWidth: '90px' }}
                onClick={() => openCalcDialog('add', quantity)}
                type="button"
              >
                Amount: {quantity}
              </Button>
            </Box>
            {/* Calculator dialog for amount */}
            <Dialog open={calcDialogOpen && calcTarget === 'add'} onClose={() => setCalcDialogOpen(false)}>
              <DialogTitle>Set Amount</DialogTitle>
              <DialogContent>
                <TextField
                  value={calcValue}
                  onChange={e => setCalcValue(e.target.value.replace(/\D/g, ''))}
                  label="Amount"
                  fullWidth
                  margin="normal"
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
                  {'123456789'.split('').map(n => (
                    <Button key={n} onClick={() => handleCalcNum(n)}>{n}</Button>
                  ))}
                  <Button onClick={handleCalcClear}>Clear</Button>
                  <Button onClick={() => handleCalcNum('0')}>0</Button>
                  <Button onClick={handleCalcBack}>⌫</Button>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCalcDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCalcSave} variant="contained">OK</Button>
              </DialogActions>
            </Dialog>
            {/* Remove old amount dialog logic */}
            <TextField
              label="Expiration Date"
              type="date"
              value={expiration}
              onChange={e => setExpiration(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              margin="normal"
            />
            {/* Quick date buttons for common choices (now cumulative) */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" onClick={() => handleExpirationShortcut(1)}>+1 day</Button>
              <Button size="small" onClick={() => handleExpirationShortcut(3)}>+3 days</Button>
              <Button size="small" onClick={() => handleExpirationShortcut(7)}>+1 week</Button>
            </Box>
            <TextField
              label="Category"
              select
              value={category}
              onChange={e => setCategory(e.target.value)}
              fullWidth
              margin="normal"
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
              Add Item
            </Button>
          </form>
          {/* Show success or error messages */}
          {success && <Alert severity="success" sx={{ mt: 2 }}>Item added!</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
        <Box sx={{ my: 2 }}>
          <Typography variant="h6">Your Inventory</Typography>
          {/* Inventory list from Firestore */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          ) : listError ? (
            <Alert severity="error">{listError}</Alert>
          ) : items.length === 0 ? (
            <Typography color="text.secondary">No items in your inventory.</Typography>
          ) : (
            <List>
              {items.map(item => (
                <ListItem key={item.id} divider
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="edit" onClick={() => handleEditOpen(item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={`${item.name} (${item.quantity})`}
                    secondary={`Expires: ${item.expiration} | Category: ${item.category}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>
      {/* Edit dialog for modifying items */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Food Item</DialogTitle>
        <DialogContent>
          {/* Name, +, -, Amount button row in edit dialog */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
              fullWidth
              margin="normal"
            />
            <Button
              variant="outlined"
              sx={{ minWidth: '40px', height: '56px' }}
              onClick={() => setEditQuantity(q => q + 1)}
              type="button"
            >
              +
            </Button>
            <Button
              variant="outlined"
              sx={{ minWidth: '40px', height: '56px' }}
              onClick={() => setEditQuantity(q => Math.max(1, q - 1))}
              type="button"
            >
              -
            </Button>
            <Button
              variant="outlined"
              sx={{ height: '56px', minWidth: '90px' }}
              onClick={() => openCalcDialog('edit', editQuantity)}
              type="button"
            >
              Amount: {editQuantity}
            </Button>
          </Box>
          {/* Calculator dialog for amount in edit dialog */}
          <Dialog open={calcDialogOpen && calcTarget === 'edit'} onClose={() => setCalcDialogOpen(false)}>
            <DialogTitle>Set Amount</DialogTitle>
            <DialogContent>
              <TextField
                value={calcValue}
                onChange={e => setCalcValue(e.target.value.replace(/\D/g, ''))}
                label="Amount"
                fullWidth
                margin="normal"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
                {'123456789'.split('').map(n => (
                  <Button key={n} onClick={() => handleCalcNum(n)}>{n}</Button>
                ))}
                <Button onClick={handleCalcClear}>Clear</Button>
                <Button onClick={() => handleCalcNum('0')}>0</Button>
                <Button onClick={handleCalcBack}>⌫</Button>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCalcDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCalcSave} variant="contained">OK</Button>
            </DialogActions>
          </Dialog>
          {/* Remove old amount dialog logic in edit dialog */}
          <TextField
            label="Expiration Date"
            type="date"
            value={editExpiration}
            onChange={e => setEditExpiration(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            margin="normal"
          />
          {/* Quick date buttons for common choices in edit dialog (cumulative) */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button size="small" onClick={() => handleEditExpirationShortcut(1)}>+1 day</Button>
            <Button size="small" onClick={() => handleEditExpirationShortcut(3)}>+3 days</Button>
            <Button size="small" onClick={() => handleEditExpirationShortcut(7)}>+1 week</Button>
          </Box>
          <TextField
            label="Category"
            select
            value={editCategory}
            onChange={e => setEditCategory(e.target.value)}
            fullWidth
            margin="normal"
          >
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
          {editError && <Alert severity="error" sx={{ mt: 2 }}>{editError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
