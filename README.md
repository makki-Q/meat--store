# Meat Shop Management System

A comprehensive web-based system for managing meat shop operations including inventory, sales, purchases, and reporting.

## Features

- **Product Management**: Define and manage all products with categories and units
- **Purchase Tracking**: Record supplier purchases and automatically update stock
- **Sales Management**: Process sales with real-time stock validation
- **Stock Management**: Automatic stock tracking across multiple shops
- **Profit Analysis**: Calculate and track profit margins
- **Shrinkage Monitoring**: Track losses and wastage
- **Comprehensive Reports**: Export data and view analytics
- **User Roles**: Owner, Shop Manager, Storekeeper, Viewer access levels
- **Dashboard**: Real-time overview of key metrics

## Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```

4. Create `.env` file with your MongoDB connection string
5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Access the application at `http://localhost:3000`
2. Create products in the Product Master
3. Record purchases to add stock
4. Process sales to track revenue and update stock
5. View reports and analytics in the Reports section

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React, Material-UI, React Query
- **Charts**: Recharts
- **Authentication**: JWT

## API Endpoints

- `/api/products` - Product management
- `/api/purchases` - Purchase tracking
- `/api/sales` - Sales processing
- `/api/stock` - Stock management
- `/api/reports` - Analytics and reporting
- `/api/auth` - User authentication"# meat--store" 
