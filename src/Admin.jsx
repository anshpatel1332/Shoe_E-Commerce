import { useMemo, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { money } from "./currency";
import { defaultStore, useCouponsStore, useCustomersStore, useHomeContentStore, useOrdersStore, useProductsStore, useUsersStore } from "./store";

const orderStatuses = ["Pending", "Paid", "Confirmed", "Processing", "Packed", "Shipped", "Out For Delivery", "Delivered", "Cancelled"];
const trackingByStatus = {
  Pending: ["Order Placed"],
  Paid: ["Order Placed", "Payment Successful"],
  Confirmed: ["Order Placed", "Payment Successful", "Order Confirmed"],
  Processing: ["Order Placed", "Payment Successful", "Order Confirmed", "Processing"],
  Packed: ["Order Placed", "Payment Successful", "Order Confirmed", "Processing", "Packed"],
  Shipped: ["Order Placed", "Payment Successful", "Order Confirmed", "Processing", "Packed", "Shipped"],
  "Out For Delivery": ["Order Placed", "Payment Successful", "Order Confirmed", "Processing", "Packed", "Shipped", "Out For Delivery"],
  Delivered: ["Order Placed", "Payment Successful", "Order Confirmed", "Processing", "Packed", "Shipped", "Out For Delivery", "Delivered"],
  Cancelled: ["Order Placed"],
};
const emptyProduct = {
  id: "",
  name: "",
  category: "",
  price: "",
  oldPrice: "",
  rating: 4.5,
  reviews: 0,
  badge: "",
  color: "",
  material: "",
  image: "",
  sizes: ["8", "9", "10"],
  stock: { "8": 5, "9": 5, "10": 5 },
};

function Icon({ children }) {
  return <span className="material-symbols-outlined">{children}</span>;
}

function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    ["Dashboard", "/admin", "dashboard"],
    ["Products", "/admin/products", "inventory_2"],
    ["Home Content", "/admin/home-content", "web"],
    ["Orders", "/admin/orders", "receipt_long"],
    ["Customers", "/admin/customers", "groups"],
    ["Marketing", "/admin/marketing", "campaign"],
  ];
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink to="/" className="admin-brand"><img src="/luxe-step-logo.svg" alt="" /><span>LUXE STEP</span></NavLink>
        <nav>{links.map(([label, href, icon]) => <NavLink key={href} to={href} end={href === "/admin"}><Icon>{icon}</Icon>{label}</NavLink>)}</nav>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><span>Admin Panel</span><h1>{title}</h1></div><div className="admin-account"><strong>{user?.name}</strong><button onClick={handleLogout}>Logout</button></div></header>
        {children}
      </main>
    </div>
  );
}

function AdminDashboard() {
  const [products] = useProductsStore();
  const [orders] = useOrdersStore();
  const [customers] = useCustomersStore();
  const totalSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStock = products.filter((product) => Object.values(product.stock || {}).some((qty) => Number(qty) <= 2)).length;
  return (
    <AdminLayout title="Dashboard">
      <section className="admin-card-grid">
        <Stat title="Total Products" value={products.length} icon="inventory_2" />
        <Stat title="Total Orders" value={orders.length} icon="receipt_long" />
        <Stat title="Total Customers" value={customers.length} icon="groups" />
        <Stat title="Total Sales" value={money(totalSales)} icon="payments" />
        <Stat title="Low Stock Alerts" value={lowStock} icon="warning" />
      </section>
      <section className="admin-panel"><div className="admin-panel-head"><h2>Recent Orders</h2></div><AdminTable headers={["Order", "Customer", "Status", "Total"]}>{orders.slice(0, 5).map((order) => <tr key={order.id}><td>{order.id}</td><td>{order.customer}</td><td><span className="admin-status">{order.status}</span></td><td>{money(order.total)}</td></tr>)}</AdminTable></section>
    </AdminLayout>
  );
}

function Stat({ title, value, icon }) {
  return <article className="admin-stat"><Icon>{icon}</Icon><span>{title}</span><strong>{value}</strong></article>;
}

function AdminProducts() {
  const [products, setProducts] = useProductsStore();
  const [editing, setEditing] = useState(null);
  const startAdd = () => setEditing({ ...emptyProduct, id: `shoe-${Date.now()}` });
  const saveProduct = (product) => {
    const normalized = normalizeProduct(product);
    if (!normalized.name || !normalized.category || !normalized.price || !normalized.image) return false;
    setProducts((current) => current.some((item) => item.id === normalized.id) ? current.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...current]);
    setEditing(null);
    return true;
  };
  return (
    <AdminLayout title="Products">
      <section className="admin-panel"><div className="admin-panel-head"><h2>Product Management</h2><button onClick={startAdd}>Add Product</button></div><AdminTable headers={["Product", "Category", "Price", "Stock", "Actions"]}>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.material} / {product.color}</small></td><td>{product.category}</td><td>{money(product.price)}</td><td>{Object.values(product.stock || {}).reduce((sum, qty) => sum + Number(qty || 0), 0)}</td><td><div className="admin-actions"><button onClick={() => setEditing(product)}>Edit</button><button className="danger" onClick={() => setProducts((current) => current.filter((item) => item.id !== product.id))}>Delete</button></div></td></tr>)}</AdminTable></section>
      {editing && <ProductEditor product={editing} onClose={() => setEditing(null)} onSave={saveProduct} />}
    </AdminLayout>
  );
}

function normalizeProduct(product) {
  const sizes = [...new Set(String(product.sizesText || product.sizes.join(",")).split(",").map((size) => size.trim()).filter(Boolean))];
  const stock = sizes.reduce((next, size) => ({ ...next, [size]: Number(product.stock?.[size] ?? 0) }), {});
  return { ...product, price: Number(product.price), oldPrice: product.oldPrice ? Number(product.oldPrice) : "", rating: Number(product.rating), reviews: Number(product.reviews), sizes, stock };
}

function ProductEditor({ product, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...product, sizesText: product.sizes.join(", ") });
  const [error, setError] = useState("");
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateStock = (size, value) => setDraft((current) => ({ ...current, stock: { ...current.stock, [size]: value } }));
  const sizes = [...new Set(String(draft.sizesText).split(",").map((size) => size.trim()).filter(Boolean))];
  const submit = (event) => {
    event.preventDefault();
    if (!onSave(draft)) setError("Name, category, price, and image URL are required.");
  };
  return (
    <div className="admin-modal"><form className="admin-editor" onSubmit={submit}><div className="admin-panel-head"><h2>{product.name ? "Edit Product" : "Add Product"}</h2><button type="button" onClick={onClose}>Close</button></div>{error && <p className="login-error">{error}</p>}<div className="admin-form-grid">
      {["name", "category", "price", "oldPrice", "color", "material", "rating", "reviews", "badge", "image"].map((field) => <label key={field}>{field}<input value={draft[field] ?? ""} onChange={(event) => setField(field, event.target.value)} /></label>)}
      <label>sizes<input value={draft.sizesText} onChange={(event) => setField("sizesText", event.target.value)} /></label>
    </div><div className="stock-grid">{sizes.map((size) => <label key={size}>Stock {size}<input type="number" value={draft.stock?.[size] ?? 0} onChange={(event) => updateStock(size, event.target.value)} /></label>)}</div><button className="primary-button">Save Product</button></form></div>
  );
}

function AdminHomeContent() {
  const [content, setContent] = useHomeContentStore();
  const update = (field, value) => setContent((current) => ({ ...current, [field]: value }));
  const textFields = Object.entries(content).filter(([, value]) => !Array.isArray(value));
  const listFields = Object.entries(content).filter(([, value]) => Array.isArray(value));
  const updateList = (field, value) => update(field, value.split(",").map((item) => item.trim()).filter(Boolean));
  return <AdminLayout title="Home Content"><section className="admin-panel"><div className="admin-panel-head"><h2>Homepage Content</h2><button onClick={() => setContent(defaultStore.homeContent)}>Reset</button></div><div className="admin-form-grid">{textFields.map(([field, value]) => <label key={field}>{field}<input value={value} onChange={(event) => update(field, event.target.value)} /></label>)}</div></section><section className="admin-panel"><div className="admin-panel-head"><h2>Category and Filter Management</h2></div><div className="admin-form-grid">{listFields.map(([field, value]) => <label key={field}>{field}<input value={value.join(", ")} onChange={(event) => updateList(field, event.target.value)} placeholder="Comma separated values" /></label>)}</div></section></AdminLayout>;
}

function AdminOrders() {
  const [orders, setOrders] = useOrdersStore();
  const [query, setQuery] = useState("");
  const [invoice, setInvoice] = useState(null);
  const visible = orders.filter((order) => `${order.id} ${order.customer} ${order.email}`.toLowerCase().includes(query.toLowerCase()));
  const updateOrder = (id, patch) => setOrders((current) => current.map((order) => {
    const next = { ...order, ...patch };
    if (patch.status) {
      next.orderStatus = patch.status;
      next.trackingSteps = trackingByStatus[patch.status] || order.trackingSteps || [];
      next.tracking = patch.status;
    }
    return order.id === id ? next : order;
  }));
  return <AdminLayout title="Orders"><section className="admin-panel"><div className="admin-panel-head"><h2>Order Management</h2><input placeholder="Search orders..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><AdminTable headers={["Order", "Customer", "Status", "Tracking", "Total", "Actions"]}>{visible.map((order) => <tr key={order.id}><td>{order.id}</td><td>{order.customer}<small>{order.email}</small></td><td><select value={order.status} onChange={(event) => updateOrder(order.id, { status: event.target.value })}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></td><td><input value={order.tracking} onChange={(event) => updateOrder(order.id, { tracking: event.target.value })} placeholder="Tracking #" /></td><td>{money(order.total)}</td><td><div className="admin-actions"><button onClick={() => setInvoice(order)}>Invoice</button><button className="danger" onClick={() => setOrders((current) => current.filter((item) => item.id !== order.id))}>Delete</button></div></td></tr>)}</AdminTable></section>{invoice && <div className="admin-modal"><div className="admin-editor invoice"><div className="admin-panel-head"><h2>Invoice {invoice.id}</h2><button onClick={() => setInvoice(null)}>Close</button></div><p><strong>{invoice.customer}</strong> / {invoice.email}</p>{invoice.items.map((item) => <p key={`${item.name}-${item.size}`}>{item.quantity} x {item.name} size {item.size}</p>)}<h3>Total {money(invoice.total)}</h3></div></div>}</AdminLayout>;
}

function AdminCustomers() {
  const [customers, setCustomers] = useCustomersStore();
  const [users, setUsers] = useUsersStore();
  const [orders] = useOrdersStore();
  const [query, setQuery] = useState("");
  const registeredCustomers = users.filter((user) => user.role === "Customer").map((user) => ({ id: user.id, name: user.name, email: user.email, tier: "Regular", active: user.status !== "Inactive", source: "users" }));
  const allCustomers = [...registeredCustomers, ...customers.filter((customer) => !registeredCustomers.some((user) => user.email === customer.email))];
  const visible = allCustomers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase()));
  const toggle = (customer) => {
    if (customer.source === "users") {
      setUsers((current) => current.map((user) => user.id === customer.id ? { ...user, status: user.status === "Inactive" ? "Active" : "Inactive" } : user));
      return;
    }
    setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, active: !item.active } : item));
  };
  return <AdminLayout title="Customers"><section className="admin-panel"><div className="admin-panel-head"><h2>Customer Management</h2><input placeholder="Search customers..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><AdminTable headers={["Customer", "Tier", "Orders", "Status", "Action"]}>{visible.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong><small>{customer.email}</small></td><td>{customer.tier}</td><td>{orders.filter((order) => order.email === customer.email).length}</td><td>{customer.active ? "Active" : "Inactive"}</td><td><button onClick={() => toggle(customer)}>{customer.active ? "Deactivate" : "Activate"}</button></td></tr>)}</AdminTable></section></AdminLayout>;
}

function AdminMarketing() {
  const [coupons, setCoupons] = useCouponsStore();
  const [content, setContent] = useHomeContentStore();
  const [draft, setDraft] = useState({ code: "", discount: 10, expiry: "", active: true });
  const addCoupon = (event) => {
    event.preventDefault();
    if (!draft.code || !draft.expiry) return;
    setCoupons((current) => [{ ...draft, id: `CPN-${Date.now()}`, discount: Number(draft.discount) }, ...current]);
    setDraft({ code: "", discount: 10, expiry: "", active: true });
  };
  return <AdminLayout title="Marketing"><section className="admin-panel"><div className="admin-panel-head"><h2>Coupons</h2></div><form className="admin-form-grid" onSubmit={addCoupon}><label>Code<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></label><label>Discount %<input type="number" value={draft.discount} onChange={(event) => setDraft({ ...draft, discount: event.target.value })} /></label><label>Expiry<input type="date" value={draft.expiry} onChange={(event) => setDraft({ ...draft, expiry: event.target.value })} /></label><label>Status<select value={draft.active ? "active" : "inactive"} onChange={(event) => setDraft({ ...draft, active: event.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button className="primary-button">Create Coupon</button></form><AdminTable headers={["Code", "Discount", "Expiry", "Status", "Action"]}>{coupons.map((coupon) => <tr key={coupon.id}><td>{coupon.code}</td><td>{coupon.discount}%</td><td>{coupon.expiry}</td><td>{coupon.active ? "Active" : "Inactive"}</td><td><button onClick={() => setCoupons((current) => current.map((item) => item.id === coupon.id ? { ...item, active: !item.active } : item))}>Toggle</button></td></tr>)}</AdminTable></section><section className="admin-panel"><div className="admin-panel-head"><h2>Homepage Marketing</h2></div><div className="admin-form-grid"><label>Banner Text<input value={content.bannerText} onChange={(event) => setContent((current) => ({ ...current, bannerText: event.target.value }))} /></label><label>Promotional Message<input value={content.promoMessage} onChange={(event) => setContent((current) => ({ ...current, promoMessage: event.target.value }))} /></label></div></section></AdminLayout>;
}

function AdminTable({ headers, children }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function AdminRoutes() {
  return <Routes><Route index element={<AdminDashboard />} /><Route path="products" element={<AdminProducts />} /><Route path="home-content" element={<AdminHomeContent />} /><Route path="orders" element={<AdminOrders />} /><Route path="customers" element={<AdminCustomers />} /><Route path="marketing" element={<AdminMarketing />} /></Routes>;
}
