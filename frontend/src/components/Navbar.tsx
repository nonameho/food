import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShoppingCart, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCart } from '../contexts/CartContext';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getTotalPrice } = useCart();
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const prevTotalItems = useRef(0);
  const previewTimeoutRef = useRef<number | null>(null);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    prevTotalItems.current = totalItems;
  }, [location.pathname]);

  const shouldShowCartPreview =
    location.pathname === '/' ||
    location.pathname === '/restaurants' ||
    location.pathname.startsWith('/restaurants/') ||
    location.pathname === '/track-order' ||
    location.pathname.startsWith('/orders/');

  const subtotal = getTotalPrice();

  useEffect(() => {
    if (totalItems > prevTotalItems.current) {
      prevTotalItems.current = totalItems;

      if (shouldShowCartPreview) {
        setShowCartPreview(true);

        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }

        previewTimeoutRef.current = window.setTimeout(() => {
          setShowCartPreview(false);
        }, 3000);
      }
    }
  }, [totalItems, shouldShowCartPreview]);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const cartLink = (
    <div
      className="relative"
      onMouseEnter={() => setIsCartHovered(true)}
      onMouseLeave={() => setIsCartHovered(false)}
      onFocus={() => setIsCartHovered(true)}
      onBlur={() => setIsCartHovered(false)}
    >
      <Link to="/cart" className="text-[#ffffff] hover:text-[#10b981] flex items-center gap-1">
        <ShoppingCart size={20} />
        <span>Cart</span>
      </Link>

      {shouldShowCartPreview && (isCartHovered || showCartPreview) && (
        <div className="absolute right-0 mt-3 w-80 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5 z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">
              Cart ({items.length})
            </span>
            <span className="text-xs uppercase tracking-wide text-gray-500">Preview</span>
          </div>

          <div className="max-h-60 space-y-3 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500">Your cart is empty.</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.menuItemName}
                    </p>
                    <p className="text-xs text-gray-600">
                      x{item.quantity} · ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ${item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Subtotal</span>
            <span className="text-lg font-bold text-primary-600">
              ${subtotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className="bg-lime-400 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold text-[#ffffff]">LettucEat
          </Link>
          <div className="flex items-center space-x-6">
            {isAuthenticated && user?.role === 'customer' && (
              <>
                <Link to="/track-order" className="text-[#ffffff] hover:text-[#10b981]">
                  Track Order
                </Link>
                {cartLink}
              </>
            )}
            {isAuthenticated && user && user.role !== 'restaurant_owner' && user.role !== 'customer' && (
              cartLink
            )}
            {isAuthenticated && (
              <>
                <span className="text-gray-600">Hello, {user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-[#ffffff] hover:text-[#10b981] flex items-center gap-1"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </>
            )}
            {!isAuthenticated && (
              <>
                <Link to="/login" className="text-[#ffffff] hover:text-[#10b981]">
                  Login
                </Link>
                <Link to="/register" className="text-[#ffffff] hover:text-[#10b981]">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Owner Navigation Tabs */}
        {isAuthenticated && user?.role === 'restaurant_owner' && (
          <div className="border-t border-gray-200">
            <div className="flex space-x-8 py-3">
              <Link
                to="/owner/dashboard"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/owner/orders"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Orders
              </Link>
              <Link
                to="/owner/menu"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Menu
              </Link>
              <Link
                to="/owner/edit"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Info
              </Link>
              <Link
                to="/owner/earnings"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Earnings
              </Link>
            </div>
          </div>
        )}

        {/* Driver Navigation Tabs */}
        {isAuthenticated && user?.role === 'driver' && (
          <div className="border-t border-gray-200">
            <div className="flex space-x-8 py-3">
              <Link
                to="/driver/dashboard"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/driver/history"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                History
              </Link>
              <Link
                to="/driver/earnings"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Earnings
              </Link>
              <Link
                to="/driver/profile"
                className="text-[#ffffff] hover:text-[#10b981] font-medium"
              >
                Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
