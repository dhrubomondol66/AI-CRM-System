import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import '../assets/styles/resetPassword.css';

const api = axios.create({
    baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-api-kuzr.onrender.com',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    // Don't add auth header for reset password endpoint
    if (!config.url?.includes('/reset-password')) {
        const token = Cookies.get('access_token') || localStorage.getItem('access_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const tokenFromQuery = useMemo(() => searchParams.get('token') || '', [searchParams]);

    const [token, setToken] = useState(tokenFromQuery);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const clearError = () => setError('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token || !newPassword || !confirmPassword) {
            setError('All fields are required.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await api.post('/api/v1/admin/auth/reset-password', {
                token,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setSuccess('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. The token may be expired or invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="reset-password-section">
            <div className="reset-password-container">
                <h2 className="reset-password-title">Reset Password</h2>
                <p className="reset-instructions">
                    Enter the token from your reset email along with your new password.
                </p>

                {error && (
                    <div className="alert alert-error" role="alert">
                        <span className="alert-icon">&#9888;</span>
                        <span className="alert-text">{error}</span>
                        <button className="alert-close" onClick={clearError} aria-label="Dismiss">&times;</button>
                    </div>
                )}
                {success && (
                    <div className="alert alert-success" role="status">
                        <span className="alert-icon">&#10003;</span>
                        <span className="alert-text">{success}</span>
                    </div>
                )}

                <form className="reset-password-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="rp-token">Reset Token</label>
                        <input
                            id="rp-token"
                            type="text"
                            value={token}
                            onChange={(e) => { setToken(e.target.value); clearError(); }}
                            placeholder="Paste the token from your email"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="rp-new-password">New Password</label>
                        <input
                            id="rp-new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); clearError(); }}
                            placeholder="Enter new password (min. 8 characters)"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="rp-confirm-password">Confirm Password</label>
                        <input
                            id="rp-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                            placeholder="Confirm your new password"
                            required
                        />
                    </div>
                    <button type="submit" className="reset-btn" disabled={loading}>
                        {loading ? (
                            <><span className="spinner" /> Resetting...</>
                        ) : (
                            'Reset Password'
                        )}
                    </button>
                </form>

                <Link to="/login" className="back-to-login-link">Back to Login</Link>
            </div>
        </section>
    );
};

export default ResetPassword;