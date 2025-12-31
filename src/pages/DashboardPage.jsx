import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Clock, Trash2, Edit2, User } from 'lucide-react';
import { TimelineCreateModal } from '../components/TimelineCreateModal';
import { TimelineEditModal } from '../components/TimelineEditModal';

export const DashboardPage = () => {
    const { currentUser, token, logout } = useAuth();
    const [timelines, setTimelines] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTimeline, setEditingTimeline] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            apiClient.getTimelines(token)
                .then(data => {
                    if (Array.isArray(data)) {
                        setTimelines(data);
                    } else {
                        console.error("Invalid timelines data", data);
                        setTimelines([]);
                    }
                })
                .catch(err => {
                    console.error(err);
                    setTimelines([]);
                });
        }
    }, [token]);

    const handleCreate = async (name, description, coverImage, themeId) => {
        console.log('Dashboard handleCreate:', { name, description, coverImage, themeId });
        try {
            const newTimeline = await apiClient.createTimeline(token, name, description, coverImage, themeId);
            console.log('Frontend received:', newTimeline);
            if (newTimeline.error) {
                alert(newTimeline.error);
                return;
            }
            setTimelines([...timelines, newTimeline]);
            setShowCreateModal(false);
        } catch (error) {
            console.error("Error creating timeline", error);
            alert("Error al crear el timeline. Revisa la consola.");
        }
    };

    const handleUpdate = async (id, name, description, coverImage, themeId) => {
        try {
            const updatedTimeline = await apiClient.updateTimeline(token, id, {
                identifier: name,
                description,
                coverImage,
                themeId
            });
            if (updatedTimeline.error) {
                alert(updatedTimeline.error);
                return;
            }
            setTimelines(timelines.map(t => t.id === id ? updatedTimeline : t));
            setEditingTimeline(null);
        } catch (error) {
            console.error("Error updating timeline", error);
            alert("Error al actualizar el timeline");
        }
    };

    const handleDelete = async (e, timelineId) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de que quieres eliminar esta línea de tiempo?')) return;

        try {
            await apiClient.deleteTimeline(token, timelineId);
            setTimelines(timelines.filter(t => t.id !== timelineId));
        } catch (error) {
            console.error("Error deleting timeline", error);
            alert("Error al eliminar el timeline");
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Mis Timelines</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 1rem 0.25rem 0.5rem', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {currentUser?.photoURL ? (
                            <img
                                src={currentUser.photoURL}
                                alt="User Profile"
                                referrerPolicy="no-referrer"
                                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                        ) : null}
                        <User
                            size={18}
                            color="#94a3b8"
                            style={{ display: currentUser?.photoURL ? 'none' : 'block' }}
                        />
                        <span style={{ fontWeight: 500 }}>{currentUser?.displayName || 'Usuario'}</span>
                    </div>
                    <button onClick={() => logout()} className="btn-secondary">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                {/* Create Card */}
                <div
                    onClick={() => setShowCreateModal(true)}
                    className="glass-panel"
                    style={{
                        height: '280px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: '2px dashed #334155',
                        background: 'rgba(30, 41, 59, 0.3)'
                    }}
                >
                    <div style={{ background: '#3b82f6', borderRadius: '50%', padding: '1rem', marginBottom: '1rem' }}>
                        <Plus size={32} color="white" />
                    </div>
                    <span style={{ fontWeight: 600 }}>Crear Nueva Línea de Tiempo</span>
                </div>

                {/* Timeline Cards */}
                {timelines.map(timeline => (
                    <div
                        key={timeline.id}
                        className="glass-panel"
                        onClick={() => navigate(`/timeline/${timeline.id}`)}
                        style={{
                            height: '280px',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {/* Cover Image */}
                        {timeline.coverImage ? (
                            <div style={{
                                height: '140px',
                                background: `url(${timeline.coverImage}) center/cover`,
                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                            }} />
                        ) : (
                            <div style={{
                                height: '140px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                            }} />
                        )}

                        {/* Content */}
                        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {timeline.identifier || 'Sin título'}
                                </h3>
                                {timeline.description && (
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: '#94a3b8',
                                        marginBottom: '0.75rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                        {timeline.description}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                                    <Clock size={14} />
                                    <span>
                                        {timeline.updatedAt ? new Date(timeline.updatedAt).toLocaleDateString() : 'Fecha desconocida'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTimeline(timeline);
                                        }}
                                        style={{
                                            all: 'unset',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            transition: 'background 0.2s',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Edit2 size={16} color="#3b82f6" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, timeline.id)}
                                        style={{
                                            all: 'unset',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            transition: 'background 0.2s',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Trash2 size={16} color="#ef4444" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showCreateModal && (
                <TimelineCreateModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreate}
                />
            )}

            {editingTimeline && (
                <TimelineEditModal
                    timeline={editingTimeline}
                    onClose={() => setEditingTimeline(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
};
