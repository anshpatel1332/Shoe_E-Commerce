import { NavLink, useParams } from "react-router-dom";
import { useOrdersStore } from "../store";

const steps = ["Order Placed", "Payment Successful", "Order Confirmed", "Processing", "Packed", "Shipped", "Out For Delivery", "Delivered"];

function Icon({ children }) {
  return <span className="material-symbols-outlined">{children}</span>;
}

export function OrderTracking() {
  const { id } = useParams();
  const [orders] = useOrdersStore();
  const order = orders.find((item) => item.id === id);
  const completed = new Set(order?.trackingSteps || ["Order Placed", "Payment Successful", "Order Confirmed"]);

  return (
    <section className="tracking-page page-shell">
      <div className="catalog-top"><div><h1>Order Tracking</h1><p>{order ? order.id : "Order not found"}</p></div><NavLink className="primary-button" to="/my-orders">My Orders</NavLink></div>
      {!order ? <div className="empty-state"><Icon>search_off</Icon><h2>Order not found</h2></div> : <div className="tracking-card">{steps.map((step) => <div className={completed.has(step) ? "track-step done" : "track-step"} key={step}><span><Icon>{completed.has(step) ? "check" : "radio_button_unchecked"}</Icon></span><div><strong>{step}</strong><p>{completed.has(step) ? "Completed" : "Waiting for update"}</p></div></div>)}</div>}
    </section>
  );
}
