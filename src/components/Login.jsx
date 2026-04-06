import React, { useState } from 'react';
import { ShieldCheck, Lock, User } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState(''); // Servirá como Placa
    const [driverName, setDriverName] = useState(''); // nombre del conductor
    const [driverId, setDriverId] = useState(''); // identificación numérica
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('driver');
    const [error, setError] = useState('');

    const plateRegex = /^[A-Z]{3}\d{3}$/;
    const driverNameRegex = /^[a-záéíóúñ\s]+$/;
    const driverIdRegex = /^\d{1,12}$/;
    const passwordRegex = /^\d{1,12}$/;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (role === 'admin') {
            if (username === 'admon' && password === 'admon1234') {
                onLogin({ username, role: 'admin' });
            } else {
                setError('Credenciales de Admin incorrectas.');
            }
        } else {
            const plateValue = username.toUpperCase().trim();
            if (!plateRegex.test(plateValue)) {
                setError('La placa debe ser 3 letras mayúsculas seguidas de 3 números, por ejemplo ABC123.');
                return;
            }

            if (!driverName.trim() || !driverNameRegex.test(driverName.trim())) {
                setError('El nombre del conductor solo puede contener letras minúsculas y espacios.');
                return;
            }

            if (!driverId.trim() || !driverIdRegex.test(driverId.trim())) {
                setError('La identificación debe ser solo números y hasta 12 dígitos.');
                return;
            }

            if (!password.trim() || !passwordRegex.test(password.trim())) {
                setError('La contraseña debe ser el número de identificación, solo dígitos y máximo 12.');
                return;
            }

            if (password.trim() !== driverId.trim()) {
                setError('La contraseña debe coincidir con el número de identificación.');
                return;
            }

            onLogin({
                username: plateValue,
                driverName: driverName.trim(),
                driverId: driverId.trim(),
                role: 'driver'
            });
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
                        <label>{role === 'admin' ? 'usuario administrador' : 'placa del vehículo'}</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                placeholder={role === 'admin' ? "admon" : "ABC123"}
                                value={username}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (role === 'driver') {
                                        setUsername(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                                    } else {
                                        setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                    }
                                }}
                                style={{ paddingLeft: '2.5rem' }}
                                maxLength={role === 'driver' ? 6 : undefined}
                                required
                            />
                        </div>
                    </div>

                    {role === 'driver' && (
                        <>
                            <div className="form-group">
                                <label>Nombre del Conductor</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="Nombre completo"
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/g, ''))}
                                        style={{ paddingLeft: '2.5rem' }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Identificación del Conductor</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="Solo números, hasta 12 dígitos"
                                        value={driverId}
                                        onChange={(e) => setDriverId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                        style={{ paddingLeft: '2.5rem' }}
                                        maxLength={12}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="password"
                                placeholder={role === 'admin' ? "admon1234" : "Número de identificación"}
                                value={password}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (role === 'admin') {
                                        setPassword(value);
                                    } else {
                                        setPassword(value.replace(/\D/g, '').slice(0, 12));
                                    }
                                }}
                                style={{ paddingLeft: '2.5rem' }}
                                maxLength={role === 'admin' ? undefined : 12}
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
                        {role === 'admin' ? 'Entrar como Administrador' : 'ingresa Conductor Superpreventivo'}
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
