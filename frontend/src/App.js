import './App.css';
import React, { useState, useEffect } from 'react';

function App() {
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Helper to get URL params
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // After approval, capture payment
  async function capturePayment(orderId) {
    try {
      const response = await fetch(`http://127.0.0.1:5000/capture-paypal-order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.status === 'COMPLETED') {
        setPaymentDetails(data);
      } else {
        alert('Payment capture failed.');
      }
    } catch {
      alert('Error capturing payment.');
    }
  }

  // On page load, check if redirected from PayPal approval
  useEffect(() => {
    const orderId = getQueryParam('token'); // PayPal returns order ID as token param

    if (orderId) {
      // Automatically capture payment after redirect
      capturePayment(orderId);
      // Clear query params to avoid repeated capture calls
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  return (
    <div className="App">
      <button
        onClick={async () => {
          try {
            const response = await fetch('http://127.0.0.1:5000/create-paypal-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            const data = await response.json();
            if (data.links) {
              // Find approval URL and redirect user to PayPal
              const approvalUrl = data.links.find(link => link.rel === 'approve').href;
              window.location.href = approvalUrl;
            } else if (data.error) {
              alert(`Error: ${data.error}`);
            } else {
              alert('Unexpected response');
            }
          } catch (error) {
            alert('Error creating PayPal order');
          }
        }}
      >
        Create PayPal Test Order
      </button>
      <button
        onClick={async () => {
          try {
            const response = await fetch('http://127.0.0.1:5000/health');
            const data = await response.json();
            alert(`Health check: ${data.status || JSON.stringify(data)}`);
          } catch (error) {
            alert('Health check failed');
          }
        }}
        style={{ marginLeft: '10px' }}
      >
        Health Check
      </button>

      {paymentDetails && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <h2>Payment Details</h2>
          <p><strong>Order ID:</strong> {paymentDetails.id}</p>
          <p><strong>Status:</strong> {paymentDetails.status}</p>
          <p><strong>Payer Name:</strong> {paymentDetails.payer.name.given_name} {paymentDetails.payer.name.surname}</p>
          <p><strong>Payer Email:</strong> {paymentDetails.payer.email_address}</p>
          <p><strong>Amount:</strong> {paymentDetails.purchase_units[0].payments.captures[0].amount.value} {paymentDetails.purchase_units[0].payments.captures[0].amount.currency_code}</p>
          <p><strong>Capture ID:</strong> {paymentDetails.purchase_units[0].payments.captures[0].id}</p>
          <p><strong>Capture Status:</strong> {paymentDetails.purchase_units[0].payments.captures[0].status}</p>
          <p><strong>PayPal Fee:</strong> {paymentDetails.purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee.value} {paymentDetails.purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee.currency_code}</p>
          <p><strong>Net Amount:</strong> {paymentDetails.purchase_units[0].payments.captures[0].seller_receivable_breakdown.net_amount.value} {paymentDetails.purchase_units[0].payments.captures[0].seller_receivable_breakdown.net_amount.currency_code}</p>
        </div>
      )}
    </div>
  );
}

export default App;
