import React from 'react';
import './LoginPage.css';

const LoginPage = () => {
    return (
        <div className="form-container">
            <header>
                <h1>Login</h1>
            </header>
            <div className="login-card">
                <h2>Welcome Back!</h2>
                <form id="loginForm">
                    <input type="email" name="email" placeholder="Email" required />
                    <input type="password" name="password" placeholder="Password" required />
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
