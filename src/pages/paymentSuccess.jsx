import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Hash, ArrowRight, Home, Download } from 'lucide-react';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(10);

    const bookingId = searchParams.get('booking_id') || searchParams.get('bookingId') || null;
    const service = searchParams.get('service') || null;
    const business = searchParams.get('business') || null;
    const amount = searchParams.get('amount') || null;

    // Auto-redirect countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(timer);
                    navigate('/customerservices');
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Animated background circles */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', width: '600px', height: '600px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
                    top: '-200px', left: '-200px', animation: 'pulse 4s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', width: '400px', height: '400px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
                    bottom: '-100px', right: '-100px', animation: 'pulse 5s ease-in-out infinite 1s',
                }} />
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 1; } }
        @keyframes successPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countdownShrink { from { width: 100%; } to { width: 0%; } }
      `}</style>

            <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
                animation: 'fadeUp 0.5s ease both',
            }}>

                {/* Success icon */}
                <div style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.75rem',
                    boxShadow: '0 0 40px rgba(16,185,129,0.4)',
                    animation: 'successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                }}>
                    <CheckCircle size={48} color="white" strokeWidth={2.5} />
                </div>

                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem' }}>
                    Payment Confirmed! 🎉
                </h1>
                <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 2rem', lineHeight: '1.6' }}>
                    Your booking has been successfully confirmed. A receipt will be sent to your email.
                </p>

                {/* Booking details card */}
                <div style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    textAlign: 'left',
                }}>
                    {bookingId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Hash size={16} color="#60a5fa" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Booking ID</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#60a5fa', fontFamily: 'monospace' }}>{bookingId}</div>
                            </div>
                        </div>
                    )}
                    {service && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Calendar size={16} color="#34d399" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#ffffff' }}>{service}</div>
                            </div>
                        </div>
                    )}
                    {business && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: amount ? '0.85rem' : 0 }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Home size={16} color="#a78bfa" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Business</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#ffffff' }}>{business}</div>
                            </div>
                        </div>
                    )}
                    {amount && (
                        <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(16,185,129,0.12)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Amount Paid</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399' }}>${parseFloat(amount).toFixed(2)}</div>
                        </div>
                    )}
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Link
                        to="/customerservices"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: 'white', padding: '0.875rem 1.5rem', borderRadius: '12px',
                            fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none',
                            boxShadow: '0 4px 15px rgba(37,99,235,0.35)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                        Browse More Services <ArrowRight size={16} />
                    </Link>

                    {bookingId && (
                        <button
                            onClick={() => window.print()}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
                                border: '1px solid rgba(255,255,255,0.15)', padding: '0.875rem 1.5rem',
                                borderRadius: '12px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        >
                            <Download size={16} /> Save Receipt
                        </button>
                    )}
                </div>

                {/* Auto-redirect notice */}
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '1.75rem', marginBottom: '4px' }}>
                    Redirecting to services in {countdown}s
                </p>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', background: '#10b981', borderRadius: '2px',
                        animation: `countdownShrink 10s linear both`,
                    }} />
                </div>
            </div>
        </div>
    );
}
