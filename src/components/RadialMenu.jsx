import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Eye, Trash2, PlusCircle, Diamond } from 'lucide-react';

const BUTTON_SIZE = 38;

const getMenuItems = (event, { onEdit, onViewInfo, onAddSubEvent, onAddMilestone, onDelete }) => {
    const items = [];

    items.push({ icon: Eye, label: 'Ver Info', action: () => onViewInfo(event), color: '#60a5fa' });
    items.push({ icon: Edit2, label: 'Editar', action: () => onEdit(event), color: '#a78bfa' });

    const trackId = event.isParent ? 'epoch' : event.isMilestone ? 'milestone' : event.type || 'stage';

    if (trackId === 'epoch') {
        items.push({ icon: PlusCircle, label: 'Añadir Etapa', action: () => onAddSubEvent(event.id, 'stage'), color: '#34d399' });
    }
    if (trackId === 'stage') {
        items.push({ icon: PlusCircle, label: 'Añadir Suceso', action: () => onAddSubEvent(event.id, 'event'), color: '#34d399' });
        items.push({ icon: Diamond, label: 'Añadir Hito', action: () => onAddMilestone(event.id), color: '#fbbf24' });
    }
    if (trackId === 'event') {
        items.push({ icon: Diamond, label: 'Añadir Hito', action: () => onAddMilestone(event.id), color: '#fbbf24' });
    }

    items.push({ icon: Trash2, label: 'Eliminar', action: () => onDelete(event), color: '#f87171' });

    return items;
};

const getRadius = (count) => {
    const minGap = 8;
    const minRadius = 55;
    const needed = (count * (BUTTON_SIZE + minGap)) / (2 * Math.PI);
    return Math.max(minRadius, needed);
};

export const RadialMenu = ({ x, y, event, onClose, actions }) => {
    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const items = getMenuItems(event, actions);
    const totalItems = items.length;
    const radius = getRadius(totalItems);
    const angleStep = 360 / totalItems;

    return (
        <>
            {/* Full-screen backdrop — dims the page and closes menu on click */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)'
                }}
                onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            />

            {/* Radial buttons */}
            <div
                style={{
                    position: 'fixed',
                    left: x,
                    top: y,
                    zIndex: 10000,
                    pointerEvents: 'none'
                }}
            >
                {/* Center dot */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        position: 'absolute',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.3)',
                        transform: 'translate(-50%, -50%)'
                    }}
                />

                {items.map((item, i) => {
                    const angle = -90 + (i * angleStep);
                    const rad = (angle * Math.PI) / 180;
                    const dx = Math.cos(rad) * radius;
                    const dy = Math.sin(rad) * radius;

                    return (
                        <motion.div
                            key={item.label}
                            initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                            animate={{ scale: 1, opacity: 1, x: dx, y: dy }}
                            exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                            style={{
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'auto'
                            }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    item.action();
                                    onClose();
                                }}
                                title={item.label}
                                style={{
                                    width: BUTTON_SIZE,
                                    height: BUTTON_SIZE,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'rgba(30, 30, 40, 0.85)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    color: item.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    padding: 0
                                }}
                            >
                                <item.icon size={16} />
                            </motion.button>
                        </motion.div>
                    );
                })}
            </div>
        </>
    );
};
