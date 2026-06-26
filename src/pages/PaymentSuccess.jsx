import { NavLink, useLocation } from "react-router-dom";
import { money } from "../currency";
import { useOrdersStore } from "../store";

function Icon({ children }) {
  return <span className="material-symbols-outlined">{children}</span>;
}

export function PaymentSuccess() {
  const location = useLocation();
  const [orders] = useOrdersStore();
  const order = orders.find((item) => item.id === location.state?.orderId) || orders[0];

  return (
    <main className="payment-success-page">
      <section className="success-card">
        <div className="success-check"><Icon>check</Icon></div>
        <span className="eyebrow">Demo Payment Mode</span>
        <h1>Payment Successful</h1>
        <p>No real payment was processed. This order was created for demo purposes.</p>
        {order && <div className="success-grid">
          <span>Order ID<strong>{order.id}</strong></span>
          <span>Transaction ID<strong>{order.transactionId}</strong></span>
          <span>Amount Paid<strong>{money(order.total)}</strong></span>
          <span>Payment Method<strong>{order.paymentMethod}</strong></span>
          <span>Estimated Delivery<strong>5-7 business days</strong></span>
        </div>}
        <div className="button-row success-actions"><NavLink className="primary-button" to="/products">Continue Shopping</NavLink><NavLink className="secondary-button" to="/my-orders">View My Orders</NavLink></div>
      </section>
    </main>
  );
}
