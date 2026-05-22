import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./mongodb";
import User from "@/models/User";
import Product from "@/models/Product";
import Sale from "@/models/Sale";

// Configured timeout to fail-fast if local MongoDB is offline
const MONGO_TIMEOUT = 1500;

// State flags
let useMockMode = false;
let dbCheckPromise: Promise<boolean> | null = null;

// Mock In-Memory Databases (Fallback)
interface MockUser {
  _id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "cashier";
}

interface MockProduct {
  _id: string;
  name: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string;
  expiryDate?: string;
}

interface MockSaleItem {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number;
  taxRate: number;
}

interface MockSale {
  _id: string;
  invoiceNumber: string;
  items: MockSaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "upi" | "card";
  cashierId: string;
  cashierName: string;
  cashReceived?: number;
  changeDue?: number;
  createdAt: string;
}

const mockUsers: MockUser[] = [];
const mockProducts: MockProduct[] = [];
const mockSales: MockSale[] = [];

// Initialize Mock Databases with Seed Data
async function initMockDatabase() {
  if (mockUsers.length > 0) return;

  const adminHash = await bcrypt.hash("admin123", 10);
  const cashierHash = await bcrypt.hash("cashier123", 10);

  mockUsers.push(
    {
      _id: "mock_user_admin",
      username: "admin",
      passwordHash: adminHash,
      name: "Owner / Admin (Mock)",
      role: "admin",
    },
    {
      _id: "mock_user_cashier",
      username: "cashier",
      passwordHash: cashierHash,
      name: "Store Cashier (Mock)",
      role: "cashier",
    }
  );

  mockProducts.push(
    {
      _id: "mock_prod_1",
      name: "Maggie Noodles 70g",
      barcode: "8901058002316",
      category: "Snacks",
      purchasePrice: 11.5,
      sellingPrice: 14.0,
      stock: 120,
      lowStockAlert: 20,
      imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&q=80",
    },
    {
      _id: "mock_prod_2",
      name: "Amul Butter 100g",
      barcode: "8901262010109",
      category: "Dairy",
      purchasePrice: 48.0,
      sellingPrice: 56.0,
      stock: 45,
      lowStockAlert: 15,
      imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&q=80",
    },
    {
      _id: "mock_prod_3",
      name: "Coca Cola 500ml",
      barcode: "5449000000996",
      category: "Beverages",
      purchasePrice: 32.0,
      sellingPrice: 40.0,
      stock: 8,
      lowStockAlert: 10,
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80",
    },
    {
      _id: "mock_prod_4",
      name: "Tata Salt 1kg",
      barcode: "8901058895628",
      category: "Groceries",
      purchasePrice: 22.0,
      sellingPrice: 28.0,
      stock: 150,
      lowStockAlert: 30,
      imageUrl: "https://images.unsplash.com/photo-1549472905-1a84f3bd6888?w=300&q=80",
    },
    {
      _id: "mock_prod_5",
      name: "Britannia Marie Gold 250g",
      barcode: "8901063016254",
      category: "Biscuits",
      purchasePrice: 24.0,
      sellingPrice: 30.0,
      stock: 4,
      lowStockAlert: 10,
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80",
    }
  );
}

// Check database status with quick timeout
export async function initializeDatabaseService(): Promise<boolean> {
  if (dbCheckPromise) return dbCheckPromise;

  dbCheckPromise = (async () => {
    try {
      // Race MongoDB connection against a quick timeout
      const connectionPromise = connectToDatabase();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), MONGO_TIMEOUT)
      );

      await Promise.race([connectionPromise, timeoutPromise]);
      
      console.log("Database Mode: Using MongoDB");
      useMockMode = false;
      return true;
    } catch (err) {
      console.log("------------------------------------------------------------------");
      console.log("⚠️  WARNING: MongoDB is offline or not installed!");
      console.log("👉 Running POS App in IN-MEMORY MOCK DATABASE MODE.");
      console.log("💡 Changes will reset when dev server restarts.");
      console.log("------------------------------------------------------------------");
      await initMockDatabase();
      useMockMode = true;
      return false;
    }
  })();

  return dbCheckPromise;
}

// Database Service Interface
export const dbService = {
  // USER METHODS
  findUserByUsername: async (username: string) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      return await User.findOne({ username });
    }
    return mockUsers.find((u) => u.username === username.toLowerCase()) || null;
  },

  seedUsersIfEmpty: async () => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      const count = await User.countDocuments();
      if (count === 0) {
        const hashedAdminPassword = await bcrypt.hash("admin123", 10);
        const hashedCashierPassword = await bcrypt.hash("cashier123", 10);
        await User.create([
          { username: "admin", password: hashedAdminPassword, name: "Owner / Admin", role: "admin" },
          { username: "cashier", password: hashedCashierPassword, name: "Store Cashier", role: "cashier" },
        ]);
        console.log("Seeded initial users in MongoDB.");
      }
    }
    // Mock mode auto-seeds on initialization
  },

  // PRODUCT METHODS
  getProducts: async (filters: { barcode?: string; search?: string } = {}) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      let query: any = {};
      if (filters.barcode) {
        query.barcode = filters.barcode;
      } else if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { category: { $regex: filters.search, $options: "i" } },
          { barcode: { $regex: filters.search, $options: "i" } },
        ];
      }
      return await Product.find(query).sort({ createdAt: -1 });
    }

    // Mock filtering
    let list = [...mockProducts];
    if (filters.barcode) {
      list = list.filter((p) => p.barcode === filters.barcode);
    } else if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s) ||
          p.barcode.includes(s)
      );
    }
    return list;
  },

  getProductById: async (id: string) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      return await Product.findById(id);
    }
    return mockProducts.find((p) => p._id === id) || null;
  },

  seedProductsIfEmpty: async () => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      const count = await Product.countDocuments();
      if (count === 0) {
        const demoProducts = [
          {
            name: "Maggie Noodles 70g",
            barcode: "8901058002316",
            category: "Snacks",
            purchasePrice: 11.5,
            sellingPrice: 14.0,
            stock: 120,
            lowStockAlert: 20,
            imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&q=80",
          },
          {
            name: "Amul Butter 100g",
            barcode: "8901262010109",
            category: "Dairy",
            purchasePrice: 48.0,
            sellingPrice: 56.0,
            stock: 45,
            lowStockAlert: 15,
            imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&q=80",
          },
          {
            name: "Coca Cola 500ml",
            barcode: "5449000000996",
            category: "Beverages",
            purchasePrice: 32.0,
            sellingPrice: 40.0,
            stock: 8,
            lowStockAlert: 10,
            imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80",
          },
          {
            name: "Tata Salt 1kg",
            barcode: "8901058895628",
            category: "Groceries",
            purchasePrice: 22.0,
            sellingPrice: 28.0,
            stock: 150,
            lowStockAlert: 30,
            imageUrl: "https://images.unsplash.com/photo-1549472905-1a84f3bd6888?w=300&q=80",
          },
          {
            name: "Britannia Marie Gold 250g",
            barcode: "8901063016254",
            category: "Biscuits",
            purchasePrice: 24.0,
            sellingPrice: 30.0,
            stock: 4,
            lowStockAlert: 10,
            imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80",
          },
        ];
        await Product.insertMany(demoProducts);
        console.log("Seeded demo products in MongoDB.");
      }
    }
  },

  createProduct: async (productData: any) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      // Check if barcode already exists
      const existing = await Product.findOne({ barcode: productData.barcode });
      if (existing) throw new Error("A product with this barcode already exists");
      return await Product.create(productData);
    }

    const existing = mockProducts.find((p) => p.barcode === productData.barcode);
    if (existing) throw new Error("A product with this barcode already exists");

    const newProd = {
      _id: "mock_prod_" + Date.now(),
      ...productData,
    };
    mockProducts.push(newProd);
    return newProd;
  },

  updateProduct: async (id: string, productData: any) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      return await Product.findByIdAndUpdate(id, productData, { new: true });
    }

    const idx = mockProducts.findIndex((p) => p._id === id);
    if (idx === -1) return null;

    mockProducts[idx] = {
      ...mockProducts[idx],
      ...productData,
    };
    return mockProducts[idx];
  },

  deleteProduct: async (id: string) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      return await Product.findByIdAndDelete(id);
    }

    const idx = mockProducts.findIndex((p) => p._id === id);
    if (idx === -1) return null;
    const deleted = mockProducts[idx];
    mockProducts.splice(idx, 1);
    return deleted;
  },

  // SALE METHODS
  getSales: async (filters: { search?: string; startDate?: string; endDate?: string } = {}) => {
    const isMongo = await initializeDatabaseService();
    if (isMongo && !useMockMode) {
      let query: any = {};
      if (filters.search) {
        query.$or = [
          { invoiceNumber: { $regex: filters.search, $options: "i" } },
          { cashierName: { $regex: filters.search, $options: "i" } },
          { "items.name": { $regex: filters.search, $options: "i" } },
        ];
      }
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
      return await Sale.find(query).sort({ createdAt: -1 });
    }

    // Mock Sales Retrieval & Filters
    let list = [...mockSales];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (sale) =>
          sale.invoiceNumber.toLowerCase().includes(s) ||
          sale.cashierName.toLowerCase().includes(s) ||
          sale.items.some((item) => item.name.toLowerCase().includes(s))
      );
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      list = list.filter((sale) => new Date(sale.createdAt) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((sale) => new Date(sale.createdAt) <= end);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createSale: async (saleData: any, user: { id: string; name: string }) => {
    const isMongo = await initializeDatabaseService();

    // Generate invoice sequence
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    if (isMongo && !useMockMode) {
      const processedItems = [];
      for (const cartItem of saleData.items) {
        const product = await Product.findById(cartItem.productId);
        if (!product) throw new Error(`Product not found: ${cartItem.name}`);

        processedItems.push({
          productId: product._id,
          name: product.name,
          quantity: cartItem.quantity,
          sellingPrice: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          taxRate: cartItem.taxRate || 0,
        });

        // Deduct stock
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: -cartItem.quantity },
        });
      }

      return await Sale.create({
        invoiceNumber,
        items: processedItems,
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        tax: saleData.tax,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        cashierId: user.id,
        cashierName: user.name,
        cashReceived: saleData.cashReceived,
        changeDue: saleData.changeDue,
      });
    }

    // Mock Stock reduction & Invoice creation
    const processedItems = [];
    for (const item of saleData.items) {
      const productIdx = mockProducts.findIndex((p) => p._id === item.productId);
      if (productIdx === -1) throw new Error(`Product not found: ${item.name}`);

      const product = mockProducts[productIdx];

      // Update mock stock
      product.stock = Math.max(0, product.stock - item.quantity);

      processedItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        taxRate: item.taxRate || 0,
      });
    }

    const newSale = {
      _id: "mock_sale_" + Date.now(),
      invoiceNumber,
      items: processedItems,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      tax: saleData.tax,
      total: saleData.total,
      paymentMethod: saleData.paymentMethod,
      cashierId: user.id,
      cashierName: user.name,
      cashReceived: saleData.cashReceived,
      changeDue: saleData.changeDue,
      createdAt: new Date().toISOString(),
    };

    mockSales.push(newSale);
    return newSale;
  },
};
