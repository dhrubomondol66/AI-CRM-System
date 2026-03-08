import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { XCircle, Hash, RefreshCw, Home, MessageCircle, AlertTriangle } from 'lucide-react';

export default function PaymentCancelled() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(15);

    const bookingId = searchParams.get('booking_id') || searchParams.get('bookingId') || null;
    const business = searchParams.get('business') || null;
    const service = searchParams.get('service') || null;
    const reason = searchParams.get('reason') || null;

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
            background: 'linear-gradient(135deg, #0f0a0a 0%, #2d0a0a 50%, #0f0a0a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Background glow */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', width: '600px', height: '600px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.10) 0%, transparent 70%)',
                    top: '-200px', right: '-200px', animation: 'pulse 4s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', width: '400px', height: '400px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)',
                    bottom: '-100px', left: '-100px', animation: 'pulse 5s ease-in-out infinite 1.5s',
                }} />
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 1; } }
        @keyframes cancelPop { 0% { transform: scale(0) rotate(-15deg); opacity: 0; } 60% { transform: scale(1.1) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countdownShrink { from { width: 100%; } to { width: 0%; } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
      `}</style>

            <div style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
                animation: 'fadeUp 0.5s ease both',
            }}>

                {/* Cancel icon */}
                <div style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.75rem',
                    boxShadow: '0 0 40px rgba(239,68,68,0.4)',
                    animation: 'cancelPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both, shake 0.5s ease 0.7s',
                }}>
                    <XCircle size={48} color="white" strokeWidth={2.5} />
                </div>

                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem' }}>
                    Payment Cancelled
                </h1>
                <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', margin: '0 0 2rem', lineHeight: '1.6' }}>
                    Your payment was not completed. Your booking has not been confirmed. You can try again or contact support.
                </p>

                {/* Alert box */}
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.75rem', textAlign: 'left',
                }}>
                    <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.5' }}>
                        {reason
                            ? `Reason: ${reason}`
                            : 'No charges have been made to your account. If you believe this is an error, please contact support.'}
                    </p>
                </div>

                {/* Details */}
                {(bookingId || service || business) && (
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        marginBottom: '1.75rem',
                        textAlign: 'left',
                    }}>
                        {bookingId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                                <Hash size={14} color="#f87171" />
                                <div>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Booking Reference</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f87171', fontFamily: 'monospace' }}>{bookingId}</div>
                                </div>
                            </div>
                        )}
                        {service && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: business ? '0.75rem' : 0 }}>
                                <Home size={14} color="rgba(255,255,255,0.5)" />
                                <div>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Service</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>{service}</div>
                                </div>
                            </div>
                        )}
                        {business && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Home size={14} color="rgba(255,255,255,0.5)" />
                                <div>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Business</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>{business}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                            color: 'white', padding: '0.875rem 1.5rem', borderRadius: '12px',
                            fontWeight: '700', fontSize: '0.9rem', border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
                            transition: 'transform 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                        <RefreshCw size={16} /> Try Again
                    </button>

                    <Link
                        to="/customerservices"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(255,255,255,0.13)', padding: '0.875rem 1.5rem', borderRadius: '12px',
                            fontWeight: '600', fontSize: '0.9rem', textDecoration: 'none',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    >
                        <Home size={16} /> Back to Services
                    </Link>

                    <a
                        href="mailto:support@beupintech.com"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none',
                            marginTop: '0.25rem', transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                    >
                        <MessageCircle size={14} /> Contact Support
                    </a>
                </div>

                {/* Countdown */}
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '1.75rem', marginBottom: '4px' }}>
                    Redirecting to services in {countdown}s
                </p>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', background: '#ef4444', borderRadius: '2px',
                        animation: `countdownShrink 15s linear both`,
                    }} />
                </div>
            </div>
        </div>
    );
}
