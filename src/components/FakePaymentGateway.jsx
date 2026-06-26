import { useMemo, useState } from "react";
import { money } from "../currency";

const methods = [
  { id: "credit-card", label: "Credit Card", icon: "credit_card" },
  { id: "debit-card", label: "Debit Card", icon: "payments" },
  { id: "upi", label: "UPI", icon: "account_balance_wallet" },
  { id: "net-banking", label: "Net Banking", icon: "account_balance" },
  { id: "cod", label: "Cash on Delivery", icon: "local_shipping" },
];

const banks = ["SBI", "HDFC", "ICICI", "Axis", "Kotak"];
const processingSteps = ["Checking payment details...", "Connecting to bank...", "Verifying payment...", "Payment Authorized...", "Payment Successful"];

function Icon({ children }) {
  return <span className="material-symbols-outlined">{children}</span>;
}

const onlyNumbers = (value) => value.replace(/\D/g, "");

export function FakePaymentGateway({ amount, items, onClose, onSuccess }) {
  const [method, setMethod] = useState("credit-card");
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "" });
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState(banks[0]);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(0);

  const methodLabel = useMemo(() => methods.find((item) => item.id === method)?.label || "Payment", [method]);

  const validate = () => {
    if (method === "credit-card" || method === "debit-card") {
      if (card.number.length !== 16) return "Card number must be 16 digits.";
      if (!card.holder.trim()) return "Card holder name is required.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return "Expiry must be in MM/YY format.";
      if (card.cvv.length !== 3) return "CVV must be 3 digits.";
    }
    if (method === "upi" && !/^[\w.-]+@[\w.-]+$/.test(upi.trim())) return "Enter a valid UPI ID like username@upi.";
    if (method === "net-banking" && !bank) return "Please select a bank.";
    return "";
  };

  const pay = () => {
    const nextError = validate();
    if (nextError) {
      setError(nextError);
      return;
    }
    setError("");
    setProcessing(true);
    setStep(0);
    processingSteps.forEach((_, index) => window.setTimeout(() => setStep(index), index * 650));
    window.setTimeout(() => {
      onSuccess({
        paymentMethod: methodLabel,
        transactionId: `TXN-${Date.now()}`,
      });
    }, 3300);
  };

  return (
    <div className="payment-overlay">
      <section className="payment-modal">
        {processing ? (
          <div className="payment-processing">
            <div className="payment-spinner" />
            <h2>{processingSteps[step]}</h2>
            <p>Demo Payment Mode - No real payment will be processed.</p>
          </div>
        ) : (
          <>
            <header className="payment-head">
              <div className="payment-brand"><img src="/luxe-step-logo.svg" alt="" /><span>LUXE STEP</span></div>
              <button onClick={onClose} aria-label="Close payment"><Icon>close</Icon></button>
            </header>
            <div className="payment-secure"><Icon>lock</Icon><strong>Secure Payment</strong><span>SSL Protected</span><em>Demo Mode - No real payment will be processed.</em></div>
            <div className="payment-grid">
              <aside className="payment-summary">
                <h3>Order Summary</h3>
                <div className="payment-items">{items.map((item) => <p key={`${item.id}-${item.size}`}>{item.quantity} x {item.name}<span>Size {item.size}</span></p>)}</div>
                <div className="payment-total"><span>Amount Payable</span><strong>{money(amount)}</strong></div>
              </aside>
              <div className="payment-body">
                <div className="payment-methods">{methods.map((item) => <button className={method === item.id ? "active" : ""} key={item.id} onClick={() => setMethod(item.id)}><Icon>{item.icon}</Icon>{item.label}</button>)}</div>
                {(method === "credit-card" || method === "debit-card") && <div className="payment-form">
                  <label>Card Number<input value={card.number} onChange={(event) => setCard({ ...card, number: onlyNumbers(event.target.value).slice(0, 16) })} placeholder="1234567812345678" /></label>
                  <label>Card Holder<input value={card.holder} onChange={(event) => setCard({ ...card, holder: event.target.value })} placeholder="Name on card" /></label>
                  <label>Expiry<input value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value.slice(0, 5) })} placeholder="MM/YY" /></label>
                  <label>CVV<input value={card.cvv} onChange={(event) => setCard({ ...card, cvv: onlyNumbers(event.target.value).slice(0, 3) })} placeholder="123" /></label>
                </div>}
                {method === "upi" && <div className="payment-form single"><label>UPI ID<input value={upi} onChange={(event) => setUpi(event.target.value)} placeholder="username@upi" /></label></div>}
                {method === "net-banking" && <div className="payment-form single"><label>Select Bank<select value={bank} onChange={(event) => setBank(event.target.value)}>{banks.map((item) => <option key={item}>{item}</option>)}</select></label></div>}
                {method === "cod" && <div className="cod-note"><Icon>local_shipping</Icon><p>Payment will be collected at the time of delivery.</p></div>}
                {error && <p className="login-error">{error}</p>}
                <button className="primary-button payment-pay" onClick={pay}>{method === "cod" ? "Confirm Order" : `Pay Now ${money(amount)}`}</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
