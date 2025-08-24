import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Authentication form component
import { useState } from 'react';
export const AuthForm = ({ onLogin, isLoading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (email && password) {
            await onLogin(email, password);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", className: "form-label", children: "Email" }), _jsx("input", { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "form-input", placeholder: "Enter your email", disabled: isLoading, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", className: "form-label", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), className: "form-input", placeholder: "Enter your password", disabled: isLoading, required: true })] }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: isLoading || !email || !password, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), "Signing in..."] })) : ('Sign In') }), _jsxs("div", { style: { fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '12px' }, children: ["Don't have an account?", ' ', _jsx("a", { href: "https://tabmemory.com/signup", target: "_blank", rel: "noopener noreferrer", style: { color: '#3b82f6', textDecoration: 'none' }, children: "Sign up here" })] })] }));
};
