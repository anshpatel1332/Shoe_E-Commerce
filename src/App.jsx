import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AdminRoutes } from "./Admin";
import { AuthProvider, useAuth } from "./auth";
import { FakePaymentGateway } from "./components/FakePaymentGateway";
import { money } from "./currency";
import { categories } from "./data";
import { Login } from "./Login";
import { MyOrders } from "./pages/MyOrders";
import { OrderTracking } from "./pages/OrderTracking";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { getStoredProducts, useCouponsStore, useHomeContentStore, useOrdersStore, useProductsStore } from "./store";

const CartContext = createContext(null);
const CART_STORAGE_KEY = "luxe-step-cart";
const priceRanges = [
  { label: "Under ₹1,500", min: 0, max: 149 },
  { label: "₹1,500 - ₹1,999", min: 150, max: 199 },
  { label: "₹2,000 - ₹2,499", min: 200, max: 249 },
  { label: "₹2,500+", min: 250, max: Infinity },
];
const initialFilters = { categories: [], sizes: [], colors: [], materials: [], prices: [] };
const getProductDefaultSize = (product) => product.sizes?.find((size) => Number(product.stock?.[size] ?? 1) > 0) || product.sizes?.[0] || "9";
const isOutOfStock = (product) => Object.values(product.stock || {}).every((qty) => Number(qty) <= 0);
const toggleValue = (values, value) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
const uniqueValues = (values) => [...new Set(values)].sort((a, b) => `${a}`.localeCompare(`${b}`));
const isCouponActive = (coupon) => coupon.active && (!coupon.expiry || new Date(`${coupon.expiry}T23:59:59`) >= new Date());

function readCartItems() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const product = getStoredProducts().find((entry) => entry.id === item.id);
        if (!product || !item.size) return null;
        return { ...product, size: item.size, quantity: Math.max(1, Number(item.quantity) || 1) };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function Icon({ children, filled = false }) {
  return <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}>{children}</span>;
}

function CartProvider({ children }) {
  const [items, setItems] = useState(readCartItems);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(({ id, size, quantity }) => ({ id, size, quantity }))));
  }, [items]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  const add = (product, size = getProductDefaultSize(product)) => setItems((current) => {
    const found = current.find((item) => item.id === product.id && item.size === size);
    setNotice(`${product.name} added to cart`);
    return found
      ? current.map((item) => item === found ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { ...product, quantity: 1, size }];
  });
  const change = (id, size, amount) => setItems((current) => current
    .map((item) => item.id === id && item.size === size ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  const remove = (id, size) => setItems((current) => {
    const found = current.find((item) => item.id === id && item.size === size);
    if (found) setNotice(`${found.name} removed from cart`);
    return current.filter((item) => item.id !== id || item.size !== size);
  });
  const clear = () => setItems([]);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ items, add, change, remove, clear, count, notice }}>{children}</CartContext.Provider>;
}

function Header() {
  const { count, notice } = useContext(CartContext);
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = [["New Arrivals", "/"], ["Shop", "/products"], ["Collections", "/products"], ["Sale", "/products"]];
  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };
  return (
    <header className="site-header">
      <div className="nav-shell">
        <NavLink to="/" className="logo" aria-label="Luxe Step home"><img src="/luxe-step-logo.svg" alt="" /><span>LUXE STEP</span></NavLink>
        <nav className={open ? "main-nav open" : "main-nav"}>
          {links.map(([label, href], index) => (
            <NavLink key={label} to={href} end={href === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => isActive && (href === "/" || index === 1) ? "active" : ""}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <span className="user-pill"><Icon>account_circle</Icon>{user.name}</span>
              {user.role !== "Admin" && <NavLink to="/orders" className="auth-link" onClick={() => setOpen(false)}>Orders</NavLink>}
              {user.role === "Admin" && <NavLink to="/admin" className="auth-link dashboard-link" onClick={() => setOpen(false)}><Icon>dashboard</Icon><span>Dashboard</span></NavLink>}
            </>
          ) : (
            <NavLink to="/login" className="auth-link" onClick={() => setOpen(false)}>Login</NavLink>
          )}
          {user?.role !== "Admin" && <NavLink to={isAuthenticated ? "/cart" : "/login"} state={!isAuthenticated ? { from: { pathname: "/cart" }, message: "Please sign in to view your shopping cart." } : undefined} className={notice ? "auth-link cart-link cart-bump" : "auth-link cart-link"} aria-label="Cart">
            <Icon>shopping_cart</Icon><span>Cart</span>{count > 0 && <span className="cart-count">{count}</span>}
          </NavLink>}
          {isAuthenticated && <button className="logout-nav" onClick={handleLogout}><Icon>logout</Icon><span>Logout</span></button>}
          <button className="icon-button menu-button" onClick={() => setOpen((value) => !value)} aria-label="Menu"><Icon>{open ? "close" : "menu"}</Icon></button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid page-shell">
        <div><NavLink className="footer-logo" to="/" aria-label="Luxe Step home"><img src="/luxe-step-logo.svg" alt="" /><span>LUXE STEP</span></NavLink><p>Redefining movement through premium craftsmanship and innovative engineering.</p></div>
        <div><h4>Shop</h4><NavLink to="/products">Men's Collection</NavLink><NavLink to="/products">Women's Collection</NavLink><NavLink to="/products">Limited Releases</NavLink></div>
        <div><h4>Support</h4><NavLink to="/orders">Track Order</NavLink><NavLink to="/products">Shipping & Returns</NavLink><NavLink to="/products">Contact Us</NavLink></div>
        <div><h4>Newsletter</h4><p>Get special offers and limited drop alerts.</p><div className="newsletter"><input type="email" placeholder="Your email" /><button><Icon>send</Icon></button></div></div>
      </div>
      <div className="copyright page-shell">© 2026 Luxe Step. All rights reserved.</div>
    </footer>
  );
}

function Layout({ children }) {
  const { notice } = useContext(CartContext);
  const location = useLocation();
  const showPromo = location.pathname === "/" || location.pathname.startsWith("/products");
  return <><Header />{showPromo && <CouponStrip />}<main>{children}</main><Footer />{notice && <div className="cart-toast"><Icon>check_circle</Icon>{notice}</div>}</>;
}

function CouponStrip() {
  const [coupons] = useCouponsStore();
  const [content] = useHomeContentStore();
  const messages = useMemo(() => {
    const activeCoupons = coupons
      .filter(isCouponActive)
      .map((coupon) => `${coupon.code}: ${coupon.discount}% off`);
    return [content.bannerText?.replace(/\$200/g, "₹2,000").replace(/₹200/g, "₹2,000").replace(/\$/g, "₹"), ...activeCoupons].filter(Boolean);
  }, [content.bannerText, coupons]);
  const [activeMessage, setActiveMessage] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveMessage((index) => (index + 1) % messages.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [messages.length]);
  useEffect(() => {
    setActiveMessage(0);
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <div className="coupon-strip">
      <div className="page-shell coupon-strip-inner">
        <Icon>local_offer</Icon>
        <span className="coupon-strip-message" key={messages[activeMessage]}>{messages[activeMessage]}</span>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const { add } = useContext(CartContext);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [favorite, setFavorite] = useState(false);
  const [added, setAdded] = useState(false);
  const outOfStock = isOutOfStock(product);
  const requireLogin = (action, message) => {
    navigate("/login", { state: { from: location, action, productId: product.id, message } });
  };
  const addToCart = (event) => {
    event.stopPropagation();
    if (outOfStock) return;
    if (!isAuthenticated) {
      requireLogin("add-to-cart", "Please sign in to add items to your shopping cart.");
      return;
    }
    add(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 650);
  };
  const toggleFavorite = (event) => {
    event.stopPropagation();
    if (!isAuthenticated) {
      requireLogin("wishlist", "Please sign in to save products to your wishlist.");
      return;
    }
    setFavorite((value) => !value);
  };
  return (
    <article className="product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-image">
        {product.badge && <span className={`badge ${product.badge === "Sale" ? "sale" : ""}`}>{product.badge}</span>}
        {outOfStock && <span className="badge stock-badge">Out of Stock</span>}
        <button className={`favorite ${favorite ? "selected" : ""}`} onClick={toggleFavorite} aria-label="Favorite"><Icon filled={favorite}>favorite</Icon></button>
        <img src={product.image} alt={product.name} />
      </div>
      <div className="product-copy">
        <div className="rating"><Icon filled>star</Icon><strong>{product.rating}</strong><span>({product.reviews})</span></div>
        <h3>{product.name}</h3><p>{product.category}</p>
        <div className="price-row">
          <div><strong>{money(product.price)}</strong>{product.oldPrice && <del>{money(product.oldPrice)}</del>}</div>
          <button className={added ? "round-add added" : "round-add"} onClick={addToCart} aria-label="Add to cart" disabled={outOfStock}><Icon>{added ? "check" : "add_shopping_cart"}</Icon></button>
        </div>
      </div>
    </article>
  );
}

function Home() {
  const navigate = useNavigate();
  const [siteProducts] = useProductsStore();
  const [content] = useHomeContentStore();
  const [coupons] = useCouponsStore();
  const activeCoupons = coupons.filter(isCouponActive);
  return (
    <Layout>
      <section className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-copy"><span className="eyebrow">{content.eyebrow}</span><h1>{content.title} <span>{content.highlight}</span></h1><p>{content.paragraph}</p><div className="button-row"><button className="primary-button" onClick={() => navigate("/products")}>{content.primaryButton}</button><button className="secondary-button" onClick={() => navigate("/products")}>{content.secondaryButton}</button></div></div>
          <div className="hero-art"><div className="hero-glow" /><img src={content.heroImage} alt="Purple and white premium sneaker" /></div>
        </div>
      </section>
      <section className="section page-shell"><div className="section-heading"><h2>Curated Categories</h2><p>Find the perfect pair for your lifestyle.</p></div><div className="category-grid">{categories.map(([name, image]) => <button key={name} className="category-card" style={{ backgroundImage: `url(${image})` }} onClick={() => navigate("/products")}><span><strong>{name}</strong>Shop {name} <Icon>arrow_forward</Icon></span></button>)}</div></section>
      <section className="section soft-section"><div className="page-shell"><div className="section-heading center"><h2>Best Sellers</h2><p>{content.promoMessage}</p></div><div className="product-grid home-products">{siteProducts.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section>
      {activeCoupons.length > 0 && <section className="section page-shell"><div className="coupon-panel"><div><span className="eyebrow">Active Offers</span><h2>Use a Luxe Step coupon</h2></div><div className="coupon-list">{activeCoupons.map((coupon) => <span key={coupon.id}>{coupon.code} <strong>{coupon.discount}% OFF</strong></span>)}</div></div></section>}
      <section className="section page-shell"><div className="newsletter-panel"><h2>{content.newsletterTitle}</h2><p>{content.newsletterParagraph}</p><div className="signup"><input type="email" placeholder="Enter your email" /><button className="primary-button">Subscribe</button></div></div></section>
    </Layout>
  );
}

function Listing() {
  const [siteProducts] = useProductsStore();
  const [content] = useHomeContentStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedFilters, setSelectedFilters] = useState(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterOptions = useMemo(() => ({
    categories: uniqueValues([...siteProducts.map((product) => product.category), ...(content.filterCategories || [])]),
    sizes: uniqueValues([...siteProducts.flatMap((product) => product.sizes || []), ...(content.filterSizes || [])]),
    colors: uniqueValues([...siteProducts.map((product) => product.color), ...(content.filterColors || [])]),
    materials: uniqueValues([...siteProducts.map((product) => product.material), ...(content.filterMaterials || [])]),
  }), [content, siteProducts]);
  const hasFilters = Object.values(selectedFilters).some((values) => values.length > 0);
  const updateFilter = (group, value) => setSelectedFilters((current) => ({ ...current, [group]: toggleValue(current[group], value) }));
  const clearFilters = () => setSelectedFilters(initialFilters);
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = siteProducts.filter((product) => {
      const matchesSearch = !search || `${product.name} ${product.category} ${product.color} ${product.material}`.toLowerCase().includes(search);
      const matchesCategory = selectedFilters.categories.length === 0 || selectedFilters.categories.includes(product.category);
      const matchesSize = selectedFilters.sizes.length === 0 || selectedFilters.sizes.some((size) => product.sizes?.includes(size));
      const matchesColor = selectedFilters.colors.length === 0 || selectedFilters.colors.includes(product.color);
      const matchesMaterial = selectedFilters.materials.length === 0 || selectedFilters.materials.includes(product.material);
      const matchesPrice = selectedFilters.prices.length === 0 || selectedFilters.prices.some((label) => {
        const range = priceRanges.find((item) => item.label === label);
        return range && product.price >= range.min && product.price <= range.max;
      });
      return matchesSearch && matchesCategory && matchesSize && matchesColor && matchesMaterial && matchesPrice;
    });
    return [...filtered].sort((a, b) => sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : 0);
  }, [query, selectedFilters, siteProducts, sort]);
  return (
    <Layout>
      <div className="listing page-shell">
        <aside className={filtersOpen ? "filters open" : "filters"}>
          <div className="filter-title"><div><h2>Filters</h2><p>Refine your selection</p></div><button className="close-filter" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><Icon>close</Icon></button></div>
          <FilterGroup icon="category" title="Category" values={filterOptions.categories} selected={selectedFilters.categories} onToggle={(value) => updateFilter("categories", value)} />
          <FilterGroup icon="straighten" title="Size" values={filterOptions.sizes} selected={selectedFilters.sizes} onToggle={(value) => updateFilter("sizes", value)} />
          <FilterGroup icon="palette" title="Color" values={filterOptions.colors} selected={selectedFilters.colors} onToggle={(value) => updateFilter("colors", value)} />
          <FilterGroup icon="payments" title="Price Range" values={priceRanges.map((range) => range.label)} selected={selectedFilters.prices} onToggle={(value) => updateFilter("prices", value)} />
          <FilterGroup icon="texture" title="Material" values={filterOptions.materials} selected={selectedFilters.materials} onToggle={(value) => updateFilter("materials", value)} />
          <button className="secondary-button clear-filters" onClick={clearFilters} disabled={!hasFilters}>Clear Filters</button>
          <button className="primary-button filter-apply" onClick={() => setFiltersOpen(false)}>Apply Filters</button>
        </aside>
        <section className="catalog">
          <div className="catalog-top"><div><h1>Men's Premium Collection</h1><p>Showing {visible.length} exclusive styles</p></div><div className="catalog-tools"><button className="filter-trigger" onClick={() => setFiltersOpen(true)}><Icon>tune</Icon> Filters</button><div className="search"><Icon>search</Icon><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collection..." /></div><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest Arrivals</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option></select></div></div>
          <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          {visible.length === 0 && <div className="empty-state"><Icon>search_off</Icon><h2>No styles found</h2><p>Try a different search.</p></div>}
        </section>
      </div>
    </Layout>
  );
}

function FilterGroup({ icon, title, values, selected, onToggle }) {
  return (
    <div className="filter-group">
      <div className="filter-group-title"><Icon>{icon}</Icon>{title}</div>
      <div className="filter-values">
        {values.map((value) => (
          <button className={selected.includes(value) ? "filter-option active" : "filter-option"} key={value} onClick={() => onToggle(value)}>
            <span>{value}</span>
            {selected.includes(value) && <Icon>check</Icon>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Details() {
  const { id } = useParams();
  const [siteProducts] = useProductsStore();
  const product = siteProducts.find((item) => item.id === id) || siteProducts.at(0);
  const [selectedSize, setSelectedSize] = useState(getProductDefaultSize(product));
  const [activeImage, setActiveImage] = useState(product.image);
  const { add } = useContext(CartContext);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const gallery = [product.image, siteProducts[(siteProducts.indexOf(product) + 1) % siteProducts.length].image, siteProducts[(siteProducts.indexOf(product) + 2) % siteProducts.length].image, siteProducts[(siteProducts.indexOf(product) + 3) % siteProducts.length].image];
  const requireLogin = (action, message) => navigate("/login", { state: { from: location, action, productId: product.id, message } });
  const addSelectedToCart = () => {
    if (!isAuthenticated) {
      requireLogin("add-to-cart", "Please sign in to add this product to your cart.");
      return;
    }
    add(product, selectedSize);
  };
  const addAndGo = () => {
    if (!isAuthenticated) {
      requireLogin("checkout", "Please sign in to buy this product.");
      return;
    }
    add(product, selectedSize);
    navigate("/cart");
  };
  const selectedOutOfStock = Number(product.stock?.[selectedSize] ?? 1) <= 0;
  useEffect(() => {
    setSelectedSize(getProductDefaultSize(product));
    setActiveImage(product.image);
  }, [product]);
  return (
    <Layout>
      <div className="details page-shell">
        <section className="gallery"><div className="main-product-image"><span className="badge">NEW ARRIVAL</span><img src={activeImage} alt={product.name} /></div><div className="thumbnails">{gallery.map((image, index) => <button key={image} className={activeImage === image ? "active" : ""} onClick={() => setActiveImage(image)}><img src={image} alt={`${product.name} view ${index + 1}`} /></button>)}</div></section>
        <section className="product-info"><span className="product-kicker">{product.category}</span><h1>{product.name}</h1><div className="details-price"><strong>{money(product.price)}</strong><div className="stars"><Icon filled>star</Icon><Icon filled>star</Icon><Icon filled>star</Icon><Icon filled>star</Icon><Icon>star_half</Icon><span>({product.reviews} Reviews)</span></div></div><div className="option-block"><strong>Color</strong><p className="selected-color">{product.color}</p></div><div className="option-block"><div className="option-label"><strong>Select Size (US Men)</strong></div><div className="sizes">{[...new Set(product.sizes)].map((size) => <button disabled={Number(product.stock?.[size] ?? 1) <= 0} className={selectedSize === size ? "active" : ""} onClick={() => setSelectedSize(size)} key={`${product.id}-${size}`}>{size}</button>)}</div></div><div className="purchase-buttons"><button className="primary-button" disabled={selectedOutOfStock} onClick={addSelectedToCart}>Add to Cart</button><button className="dark-button" disabled={selectedOutOfStock} onClick={addAndGo}>Buy Now</button></div><div className="accordions"><details open><summary>Description <Icon>expand_more</Icon></summary><p>Engineered for the modern athlete, {product.name} combines responsive cushioning with premium {product.material.toLowerCase()} materials for speed, stability, and exceptional comfort.</p></details><details><summary>Features <Icon>expand_more</Icon></summary><ul><li>Ultra-responsive foam midsole</li><li>High-traction rubber outsole</li><li>{product.material} upper construction</li></ul></details><details><summary>Shipping & Returns <Icon>expand_more</Icon></summary><p>Complimentary express shipping on orders over ₹2,000. Free returns within 30 days.</p></details></div></section>
      </div>
      <section className="section page-shell recommendations"><h2>You may also like</h2><div className="product-grid home-products">{siteProducts.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}</div></section>
    </Layout>
  );
}

function Cart() {
  const { items, change, remove, clear, count } = useContext(CartContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [, setOrders] = useOrdersStore();
  const [siteProducts, setSiteProducts] = useProductsStore();
  const [coupons] = useCouponsStore();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [orderError, setOrderError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 500 || subtotal === 0 ? 0 : 15;
  const tax = subtotal * 0.073;
  const discount = appliedCoupon ? subtotal * (Number(appliedCoupon.discount) / 100) : 0;
  const total = Math.max(0, subtotal - discount) + shipping + tax;
  const applyCoupon = () => {
    const found = coupons.find((coupon) => coupon.code.toLowerCase() === couponCode.trim().toLowerCase() && isCouponActive(coupon));
    if (!found) {
      setAppliedCoupon(null);
      setCouponMessage("Coupon is invalid or expired.");
      return;
    }
    setAppliedCoupon(found);
    setCouponMessage(`${found.code} applied: ${found.discount}% off`);
  };
  const validateOrderStock = () => {
    if (!items.length) return;
    const unavailable = items.find((item) => {
      const product = siteProducts.find((entry) => entry.id === item.id);
      return !product || Number(product.stock?.[item.size] ?? 0) < item.quantity;
    });
    if (unavailable) {
      setOrderError(`${unavailable.name} size ${unavailable.size} is no longer available in the requested quantity.`);
      return false;
    }
    setOrderError("");
    return true;
  };
  const placeOrder = () => {
    if (validateOrderStock()) setPaymentOpen(true);
  };
  const completePayment = ({ paymentMethod, transactionId }) => {
    const order = {
      id: `ORD-${Date.now()}`,
      transactionId,
      customer: user?.name || "Customer",
      email: user?.email || "",
      items: items.map((item) => ({ id: item.id, name: item.name, size: item.size, quantity: item.quantity, price: item.price })),
      paymentMethod,
      paymentStatus: "Paid",
      orderStatus: "Confirmed",
      status: "Confirmed",
      tracking: "Order Confirmed",
      trackingSteps: ["Order Placed", "Payment Successful", "Order Confirmed"],
      subtotal,
      tax,
      shipping,
      discount,
      total,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      coupon: appliedCoupon?.code || "",
    };
    setSiteProducts((current) => current.map((product) => {
      const orderedSizes = items.filter((item) => item.id === product.id);
      if (orderedSizes.length === 0) return product;
      const nextStock = { ...(product.stock || {}) };
      orderedSizes.forEach((item) => {
        nextStock[item.size] = Math.max(0, Number(nextStock[item.size] || 0) - item.quantity);
      });
      return { ...product, stock: nextStock };
    }));
    setOrders((current) => [order, ...current]);
    clear();
    setPaymentOpen(false);
    navigate("/payment-success", { state: { orderId: order.id } });
  };
  return (
    <Layout>
      <div className="cart-page page-shell">
        <section className="cart-list"><div className="cart-heading"><h1>Shopping Bag</h1><p>{count} Items</p></div>{items.length === 0 ? <div className="empty-state"><Icon>shopping_bag</Icon><h2>Your bag is empty</h2><NavLink className="primary-button" to="/products">Explore Collection</NavLink></div> : items.map((item) => <article className="cart-item" key={`${item.id}-${item.size}`}><img src={item.image} alt={item.name} /><div className="cart-item-body"><div><h3>{item.name}</h3><p>{item.category} / {item.color}</p><strong>Size: US {item.size}</strong></div><div className="cart-controls"><div className="quantity"><button onClick={() => change(item.id, item.size, -1)}><Icon>remove</Icon></button><span>{item.quantity}</span><button onClick={() => change(item.id, item.size, 1)}><Icon>add</Icon></button></div><div className="cart-price"><strong>{money(item.price * item.quantity)}</strong><button onClick={() => remove(item.id, item.size)}>Remove</button></div></div></div></article>)}</section>
        <aside className="summary"><h2>Order Summary</h2><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="coupon-apply"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Coupon code" /><button onClick={applyCoupon} disabled={!couponCode.trim()}>Apply</button></div>{couponMessage && <p className={appliedCoupon ? "coupon-success" : "coupon-error"}>{couponMessage}</p>}{orderError && <p className="coupon-error">{orderError}</p>}{appliedCoupon && <div><span>Coupon Discount</span><strong>-{money(discount)}</strong></div>}<div><span>Estimated Shipping</span><strong>{shipping ? money(shipping) : "Free"}</strong></div><div><span>Tax</span><strong>{money(tax)}</strong></div><div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary-button checkout" disabled={!items.length} onClick={placeOrder}>Place Order <Icon>arrow_forward</Icon></button><p className="secure"><Icon>verified_user</Icon> Secure Checkout Guarantee</p><div className="return-note"><Icon>local_shipping</Icon><span><strong>Free Returns</strong><small>30-day extended window for Luxe members.</small></span></div></aside>
      </div>
      {paymentOpen && <FakePaymentGateway amount={total} items={items} onClose={() => setPaymentOpen(false)} onSuccess={completePayment} />}
    </Layout>
  );
}

function CustomerOrders() {
  const { user } = useAuth();
  const [orders] = useOrdersStore();
  const myOrders = orders.filter((order) => order.email === user?.email);
  return (
    <Layout>
      <section className="orders-page page-shell">
        <div className="catalog-top"><div><h1>My Orders</h1><p>{myOrders.length} orders linked to {user?.email}</p></div><NavLink className="primary-button" to="/products">Continue Shopping</NavLink></div>
        {myOrders.length === 0 ? <div className="empty-state"><Icon>receipt_long</Icon><h2>No orders yet</h2><p>Place an order from your cart and it will appear here.</p></div> : <div className="order-list">{myOrders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><h3>{order.id}</h3><p>{order.date}</p></div><span className="admin-status">{order.status}</span></div><div className="order-meta"><span>Total <strong>{money(order.total)}</strong></span><span>Tracking <strong>{order.tracking || "Pending"}</strong></span>{order.coupon && <span>Coupon <strong>{order.coupon}</strong></span>}</div><div className="order-items">{order.items.map((item) => <p key={`${order.id}-${item.id}-${item.size}`}>{item.quantity} x {item.name} / Size {item.size}</p>)}</div></article>)}</div>}
      </section>
    </Layout>
  );
}

function ProtectedRoute({ children, message = "Please sign in to continue." }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location, message }} />;
}

function AdminProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return user?.role === "Admin" ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return <Routes><Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/products" element={<Listing />} /><Route path="/products/:id" element={<Details />} /><Route path="/cart" element={<ProtectedRoute message="Please sign in to view your shopping cart."><Cart /></ProtectedRoute>} /><Route path="/orders" element={<ProtectedRoute message="Please sign in to view your orders."><Layout><MyOrders /></Layout></ProtectedRoute>} /><Route path="/my-orders" element={<ProtectedRoute message="Please sign in to view your orders."><Layout><MyOrders /></Layout></ProtectedRoute>} /><Route path="/track-order/:id" element={<ProtectedRoute message="Please sign in to track your order."><Layout><OrderTracking /></Layout></ProtectedRoute>} /><Route path="/payment-success" element={<ProtectedRoute message="Please sign in to view payment details."><PaymentSuccess /></ProtectedRoute>} /><Route path="/admin/*" element={<AdminProtectedRoute><AdminRoutes /></AdminProtectedRoute>} /><Route path="*" element={<Home />} /></Routes>;
}

export function App() {
  return <AuthProvider><CartProvider><AppRoutes /></CartProvider></AuthProvider>;
}
