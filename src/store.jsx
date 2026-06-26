import { useEffect, useState } from "react";
import { heroImage, products as defaultProducts } from "./data";

export const storageKeys = {
  products: "luxe-step-products",
  homeContent: "luxe-step-home-content",
  orders: "luxe-step-orders",
  customers: "luxe-step-customers",
  coupons: "luxe-step-coupons",
  users: "luxe-step-users",
};

const defaultHomeContent = {
  eyebrow: "Summer Collection 2026",
  title: "ELEVATE YOUR",
  highlight: "EVERY STEP.",
  paragraph: "Experience the perfect fusion of avant-garde design and athletic performance. Engineering comfort for the modern connoisseur.",
  primaryButton: "Shop Now",
  secondaryButton: "Explore Collections",
  heroImage,
  newsletterTitle: "JOIN THE INNER CIRCLE",
  newsletterParagraph: "Sign up for early access to limited drops, exclusive events, and the latest trends.",
  bannerText: "Free express shipping on orders over ₹2,000",
  promoMessage: "Limited drops land every Friday.",
  filterCategories: [],
  filterMaterials: [],
  filterColors: [],
  filterSizes: [],
};

const defaultOrders = [
  { id: "ORD-1001", customer: "Customer", email: "customer@luxestep.com", total: 434, status: "Paid", tracking: "LX-77823", date: "2026-06-21", items: [{ name: "AeroGlide Elite X1", size: "9", quantity: 1 }, { name: "Urban Artisan Low", size: "10", quantity: 1 }] },
  { id: "ORD-1002", customer: "Mira Stone", email: "mira@example.com", total: 155, status: "Processing", tracking: "", date: "2026-06-22", items: [{ name: "Velocity Pro High", size: "8.5", quantity: 1 }] },
  { id: "ORD-1003", customer: "Jay Carter", email: "jay@example.com", total: 340, status: "Pending", tracking: "", date: "2026-06-23", items: [{ name: "Prism Flow Concept", size: "10", quantity: 1 }] },
];

const defaultCustomers = [
  { id: "CUS-1", name: "Customer", email: "customer@luxestep.com", tier: "Premium", active: true },
  { id: "CUS-2", name: "Mira Stone", email: "mira@example.com", tier: "Regular", active: true },
  { id: "CUS-3", name: "Jay Carter", email: "jay@example.com", tier: "Regular", active: false },
];

const defaultCoupons = [
  { id: "CPN-1", code: "LUXE10", discount: 10, expiry: "2026-12-31", active: true },
];

function withStock(product) {
  const sizes = [...new Set((product.sizes?.length ? product.sizes : ["8", "9", "10", "11"]).map((size) => `${size}`.trim()).filter(Boolean))];
  const stock = sizes.reduce((next, size, index) => ({ ...next, [size]: product.stock?.[size] ?? (index === 2 ? 0 : 8 + index) }), {});
  return { oldPrice: "", badge: "", ...product, sizes, stock };
}

export const defaultStore = {
  products: defaultProducts.map(withStock),
  homeContent: defaultHomeContent,
  orders: defaultOrders,
  customers: defaultCustomers,
  coupons: defaultCoupons,
};

export function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return parsed && !Array.isArray(parsed) && fallback && !Array.isArray(fallback) ? { ...fallback, ...parsed } : parsed;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("luxe-step-store", { detail: { key } }));
}

export function getStoredProducts() {
  return readStorage(storageKeys.products, defaultStore.products).map(withStock);
}

export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback));

  useEffect(() => {
    const sync = (event) => {
      if (!event.detail || event.detail.key === key) setValue(readStorage(key, fallback));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("luxe-step-store", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("luxe-step-store", sync);
    };
  }, [fallback, key]);

  const save = (next) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeStorage(key, resolved);
      return resolved;
    });
  };

  return [value, save];
}

export function useProductsStore() {
  return useStoredState(storageKeys.products, defaultStore.products);
}

export function useHomeContentStore() {
  return useStoredState(storageKeys.homeContent, defaultStore.homeContent);
}

export function useOrdersStore() {
  return useStoredState(storageKeys.orders, defaultStore.orders);
}

export function useCustomersStore() {
  return useStoredState(storageKeys.customers, defaultStore.customers);
}

export function useUsersStore() {
  return useStoredState(storageKeys.users, []);
}

export function useCouponsStore() {
  return useStoredState(storageKeys.coupons, defaultStore.coupons);
}
