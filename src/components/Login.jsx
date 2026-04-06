import React, { useState } from 'react';
import { ShieldCheck, Lock, User } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState(''); // Servirá como Placa
    const [driverName, setDriverName] = useState(''); // Nuevo campo
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('driver');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (role === 'admin') {
            if (username === 'admin' && password === 'admin123') {
                onLogin({ username, role: 'admin' });
            } else {
                setError('Credenciales de Admin incorrectas.');
            }
        } else {
            if (password === 'driver123') {
                // Pasamos placa y nombre al login
                onLogin({
                    username: username.toUpperCase(), // Placa
                    driverName: driverName,
                    role: 'driver'
                });
            } else {
                setError('Contraseña de conductor incorrecta (prueba: driver123)');
            }
        }
    };

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-header">
                    <ShieldCheck size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                    <h1>Fleet Access</h1>
                    <div style={{
                        display: 'flex',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        padding: '4px',
                        marginBottom: '1.5rem'
                    }}>
                        <button
                            onClick={() => setRole('driver')}
                            className={role === 'driver' ? 'active-role' : ''}
                            style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                borderRadius: '8px',
                                background: role === 'driver' ? 'var(--accent-color)' : 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >Conductor</button>
                        <button
                            onClick={() => setRole('admin')}
                            className={role === 'admin' ? 'active-role' : ''}
                            style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                borderRadius: '8px',
                                background: role === 'admin' ? 'var(--accent-color)' : 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >Admin</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{role === 'admin' ? 'Usuario Admin' : 'Placa del Vehículo'}</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                placeholder={role === 'admin' ? "admin" : "ABC-123"}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                                required
                            />
                        </div>
                    </div>

                    {role === 'driver' && (
                        <div className="form-group">
                            <label>Nombre del Conductor</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="text"
                                    placeholder="Nombre completo"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    style={{ paddingLeft: '2.5rem' }}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="login-button">
                        Entrar como {role === 'admin' ? 'Administrador' : 'Conductor'}
                    </button>
                </form>

                <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textAlign: 'center', marginTop: '2rem' }}>
                    &copy; 2026 Fleet Manager Pro. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default Login;
