import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import { money } from "../currency";
import { useOrdersStore } from "../store";

function Icon({ children }) {
  return <span className="material-symbols-outlined">{children}</span>;
}

export function MyOrders() {
  const { user } = useAuth();
  const [orders] = useOrdersStore();
  const [selected, setSelected] = useState(null);
  const myOrders = orders.filter((order) => order.email === user?.email);
  const downloadInvoice = (order) => {
    const text = `Luxe Step Invoice\nOrder: ${order.id}\nTransaction: ${order.transactionId || "-"}\nTotal: ${money(order.total)}\nDemo invoice only.`;
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${order.id}-invoice.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="orders-page page-shell">
      <div className="catalog-top"><div><h1>My Orders</h1><p>{myOrders.length} orders linked to {user?.email}</p></div><NavLink className="primary-button" to="/products">Continue Shopping</NavLink></div>
      {myOrders.length === 0 ? <div className="empty-state"><Icon>receipt_long</Icon><h2>No orders yet</h2><p>Place an order from your cart and it will appear here.</p></div> : <div className="order-list">{myOrders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><h3>{order.id}</h3><p>{new Date(order.createdAt || order.date).toLocaleDateString()}</p></div><span className="admin-status">{order.orderStatus || order.status}</span></div><div className="order-meta"><span>Total <strong>{money(order.total)}</strong></span><span>Payment <strong>{order.paymentStatus || "Pending"}</strong></span><span>Method <strong>{order.paymentMethod || "-"}</strong></span></div><div className="admin-actions order-actions"><button onClick={() => setSelected(order)}>View Details</button><NavLink to={`/track-order/${order.id}`}>Track Order</NavLink><button onClick={() => downloadInvoice(order)}>Download Invoice</button><NavLink to="/products">Buy Again</NavLink></div></article>)}</div>}
      {selected && <div className="admin-modal"><div className="admin-editor invoice"><div className="admin-panel-head"><h2>Order Details</h2><button onClick={() => setSelected(null)}>Close</button></div><p><strong>{selected.customer}</strong> / {selected.email}</p>{selected.items.map((item) => <p key={`${selected.id}-${item.id || item.name}-${item.size}`}>{item.quantity} x {item.name} / Size {item.size} / {money(item.price)}</p>)}<p>Subtotal: {money(selected.subtotal || selected.total)}</p><p>Tax: {money(selected.tax)}</p><p>Shipping: {money(selected.shipping)}</p><h3>Grand Total {money(selected.total)}</h3><p>Payment Method: {selected.paymentMethod}</p><p>Transaction ID: {selected.transactionId}</p><p>Order Date: {new Date(selected.createdAt || selected.date).toLocaleString()}</p></div></div>}
    </section>
  );
}
