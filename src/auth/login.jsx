import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import '../assets/styles/login.css';

const api = axios.create({
    baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-api-kuzr.onrender.com',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = Cookies.get('access_token') || localStorage.getItem('access_token');
        if (token) {
            navigate('/adminDashboard');
        }
    }, [navigate]);

    const validate = () => {
        if (!email.trim()) { setError('Please enter your email or username.'); return false; }
        if (!password) { setError('Please enter your password.'); return false; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!validate()) return;
        setLoading(true);

        try {
            const response = await api.post('/api/v1/admin/auth/login', { email, password });

            const token =
                response?.data?.token ||
                response?.data?.access_token ||
                response?.data?.accessToken ||
                response?.data?.data?.token ||
                response?.data?.data?.access_token ||
                response?.data?.data?.accessToken;

            if (!token) {
                throw new Error('Login succeeded but no token was returned by the server.');
            }

            // Save to both cookie AND localStorage so cross-domain requests work
            Cookies.set('access_token', token, {
                expires: 1,
                sameSite: 'Lax',   // ← was 'strict' which blocks cross-site reads
                secure: true,
            });
            localStorage.setItem('access_token', token);

            navigate('/adminDashboard');
        } catch (err) {
            const message =
                err?.response?.status === 401
                    ? 'Invalid email or password. Please try again.'
                    : err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    'Login failed. Please check your credentials and try again.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="admin-login-section">
            <div className="admin-login-container">
                <h2 className="login-title">Admin Login</h2>

                {error && (
                    <div className="alert alert-error" role="alert">
                        <span className="alert-icon">&#9888;</span>
                        <span className="alert-text">{error}</span>
                        <button className="alert-close" onClick={() => setError(null)} aria-label="Dismiss error">
                            &times;
                        </button>
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Enter your username"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                            required
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? <><span className="spinner" /> Logging in...</> : 'Login'}
                    </button>
                    <Link to="/forgot-password" className="forgot-password-link">
                        Forgot Password?
                    </Link>
                </form>
            </div>
        </section>
    );
};

export default AdminLogin;