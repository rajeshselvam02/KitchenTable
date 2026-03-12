import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/',               icon: '⊡' },
  { label: 'Analytics',     href: '/analytics',      icon: '📊' },
  { label: 'Orders',        href: '/orders',          icon: '📦' },
  { label: 'Menus',         href: '/menus',           icon: '🍽️' },
  { label: 'Customers',     href: '/customers',       icon: '👥' },
  { label: 'Subscriptions', href: '/subscriptions/1', icon: '🔄' },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <div style={{
      width: '220px',
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRight: '1px solid #2d2d44',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #2d2d44' }}>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>
          Kitchen<span style={{ color: '#fd7e14' }}>Table</span>
        </div>
        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Admin Panel
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 12px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link href={item.href} key={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fd7e14' : '#adb5bd',
                backgroundColor: isActive ? 'rgba(253,126,20,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid #fd7e14' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #2d2d44' }}>
        <div style={{ fontSize: '12px', color: '#6c757d' }}>Logged in as Admin</div>
      </div>
    </div>
  );
}
