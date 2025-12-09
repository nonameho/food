import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CreateOrderRequest, orderService } from '../services/orderService';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../utils/cartUtils';

interface PaymentNavigationState {
  orderData: CreateOrderRequest;
}

export function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = (location.state as PaymentNavigationState | null)?.orderData;
  const { items, clearCart, getTotalPrice, getDeliveryFee, getGrandTotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiration: '',
    cvv: '',
    billingAddress: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const hasMissingData = !orderData || items.length === 0;

  useEffect(() => {
    console.log('Payment component mounted/updated');
    console.log('orderData:', orderData);
    console.log('items:', items);
    console.log('hasMissingData:', hasMissingData);
    if (hasMissingData) {
      console.log('Missing data detected, redirecting to checkout');
      toast.error('No payment in progress. Please start checkout again.');
      navigate('/checkout');
    }
  }, [hasMissingData, navigate]);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'cardholderName':
        if (!value.trim()) return 'Name on card is required';
        if (/\d/.test(value)) return 'Name cannot contain numbers';
        return '';
      case 'cardNumber':
        const numbers = value.replace(/\s/g, '');
        if (!numbers) return 'Card number is required';
        if (!/^\d+$/.test(numbers)) return 'Card number must contain only numbers';
        if (numbers.length < 12 || numbers.length > 19) return 'Card number must be 12-19 digits';
        return '';
      case 'expiration':
        if (!value) return 'Expiration date is required';
        const match = value.match(/^(\d{2})\/(\d{2})$/);
        if (!match) return 'Expiration must be in MM/YY format';
        const month = parseInt(match[1]);
        const year = parseInt(match[2]);
        if (month < 1 || month > 12) return 'Month must be 01-12';
        if (year < 25 || year > 31) return 'Year must be 25-31';
        return '';
      case 'cvv':
        if (!value) return 'CVV is required';
        if (!/^\d+$/.test(value)) return 'CVV must contain only numbers';
        if (value.length < 3 || value.length > 4) return 'CVV must be 3-4 digits';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== PAYMENT FORM SUBMITTED ===');
    console.log('orderData:', orderData);
    console.log('cardForm:', cardForm);
    
    if (!orderData) {
      console.log('ERROR: No order data - exiting');
      toast.error('No order data available. Please start checkout again.');
      return;
    }

    console.log('Starting validation...');
    const newErrors: {[key: string]: string} = {};
    Object.keys(cardForm).forEach((key) => {
      if (['cardholderName', 'cardNumber', 'expiration', 'cvv'].includes(key)) {
        const error = validateField(key, cardForm[key as keyof typeof cardForm] as string);
        if (error) newErrors[key] = error;
      }
    });

    if (!cardForm.billingAddress) {
      console.log('ERROR: Missing billing address');
      toast.error('Please fill in all billing fields.');
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      console.log('ERROR: Validation errors found:', newErrors);
      setErrors(newErrors);
      toast.error('Please fix the errors in the form.');
      return;
    }

    console.log('Validation passed - proceeding with order creation');
    console.log('Order data to be sent:', orderData);

    setLoading(true);

    try {
      console.log('Starting mock payment processing...');
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log('Mock payment completed successfully');

      console.log('Calling orderService.createOrder...');
      const response = await orderService.createOrder(orderData);
      console.log('Order service response received:', response);

      if (response.success) {
        console.log('SUCCESS: Order created, navigating to track order page');
        clearCart();
        toast.success('Payment successful! Order placed.');
        const targetUrl = `/orders/${response.data.id}`;
        console.log('Navigating to:', targetUrl);
        navigate(targetUrl);
        console.log('Navigation called successfully');
      } else {
        console.log('ERROR: Order creation failed - response.success is false:', response);
        toast.error('Order creation failed. Please try again.');
      }
    } catch (error: any) {
      console.error('CRITICAL ERROR during payment process:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.message || 'Payment failed. Please try again.';
      toast.error(`Payment Error: ${errorMessage}`);
      
      // Also log to console for debugging
      console.error('Payment failed with error:', errorMessage);
    } finally {
      console.log('Payment process completed, resetting loading state');
      setLoading(false);
    }
  };

  if (!orderData || hasMissingData) {
    console.log('RENDER: Returning null because orderData or hasMissingData is true');
    console.log('orderData:', orderData);
    console.log('hasMissingData:', hasMissingData);
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
        <button className="text-primary-600 hover:underline" onClick={() => navigate('/checkout')}>
          Back to Checkout
        </button>
        <span>/</span>
        <span>Payment</span>
      </div>

      <h1 className="text-4xl font-bold mb-6">Complete Your Payment</h1>
      <p className="text-gray-600 mb-10">
        Enter your card details to place the order. This is a mock payment screen—no real charges will occur.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handlePayment} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Card Information</h2>
              <span className="text-sm text-gray-500">Credit / Debit Card</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Name on Card</label>
                <input
                  type="text"
                  name="cardholderName"
                  className={`input ${errors.cardholderName ? 'border-red-500' : ''}`}
                  placeholder="John Doe"
                  value={cardForm.cardholderName}
                  onChange={handleInputChange}
                  required
                />
                {errors.cardholderName && (
                  <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="label">Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  className={`input ${errors.cardNumber ? 'border-red-500' : ''}`}
                  placeholder="1234 5678 9012 3456"
                  value={cardForm.cardNumber}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength={19}
                  required
                />
                {errors.cardNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
                )}
              </div>
              <div>
                <label className="label">Expiration Date</label>
                <input
                  type="text"
                  name="expiration"
                  className={`input ${errors.expiration ? 'border-red-500' : ''}`}
                  placeholder="MM/YY"
                  value={cardForm.expiration}
                  onChange={handleInputChange}
                  maxLength={5}
                  required
                />
                {errors.expiration && (
                  <p className="text-red-500 text-sm mt-1">{errors.expiration}</p>
                )}
              </div>
              <div>
                <label className="label">CVV</label>
                <input
                  type="password"
                  name="cvv"
                  className={`input ${errors.cvv ? 'border-red-500' : ''}`}
                  placeholder="123"
                  value={cardForm.cvv}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength={4}
                  required
                />
                {errors.cvv && (
                  <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-3">Billing Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Street Address</label>
                  <input
                    type="text"
                    name="billingAddress"
                    className="input"
                    placeholder="123 Main St"
                    value={cardForm.billingAddress}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Processing payment...' : 'Pay & Place Order'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Mock payment only. Card details are not stored or sent to any server.
            </p>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Order Summary</h2>
            <span className="text-sm text-gray-500">Review before paying</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <div className="font-semibold">{item.menuItemName}</div>
                  <div className="text-gray-500">Qty: {item.quantity}</div>
                </div>
                <span className="font-semibold">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatPrice(getTotalPrice())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery</span>
              <span className="font-semibold">{formatPrice(getDeliveryFee())}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total</span>
              <span>{formatPrice(getGrandTotal())}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-md p-4 space-y-2 text-sm">
            <h3 className="font-semibold text-gray-800">Delivery</h3>
            <p className="text-gray-700">{orderData?.deliveryAddress.street || 'No address'}</p>
            {orderData?.deliveryAddress.instructions && (
              <p className="text-gray-500">Note: {orderData.deliveryAddress.instructions}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
