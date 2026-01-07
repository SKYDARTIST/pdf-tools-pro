import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MindMapNode {
    id: string;
    text: string;
    x: number;
    y: number;
    parent?: string;
    children: string[];
}

interface MindMapProps {
    data: string; // Markdown or structured text from AI
}

const MindMapComponent: React.FC<MindMapProps> = ({ data }) => {
    const [scale, setScale] = React.useState(1);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const handleReset = () => {
        setScale(1);
    };

    // Optimized parser and layout engine for radial distribution
    const nodes = useMemo(() => {
        const lines = data.split('\n').filter(l => l.trim().length > 0);
        const result: MindMapNode[] = [];
        const stack: { id: string, indent: number }[] = [];

        // Root node at absolute center (0, 0)
        const firstLine = lines[0]?.replace(/^#+\s*/, '').trim() || 'Central Concept';
        result.push({ id: 'root', text: firstLine, x: 0, y: 0, children: [] });
        stack.push({ id: 'root', indent: -1 });

        // First pass: Build tree structure
        lines.slice(1).forEach((line, index) => {
            const indent = line.search(/\S/);
            const text = line.trim().replace(/^[-*+]\s*/, '');
            const id = `node-${index}`;

            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }

            const parentId = stack[stack.length - 1].id;
            const newNode = { id, text, x: 0, y: 0, parent: parentId, children: [] };
            result.push(newNode);

            const parent = result.find(n => n.id === parentId);
            if (parent) parent.children.push(id);

            stack.push({ id, indent });
        });

        // Second pass: Calculate radial positions
        const layoutNode = (nodeId: string, startAngle: number, endAngle: number, level: number) => {
            const node = result.find(n => n.id === nodeId);
            if (!node || nodeId === 'root') return;

            const parent = result.find(n => n.id === node.parent);
            if (!parent) return;

            const angle = (startAngle + endAngle) / 2;
            const distance = level === 1 ? 280 : 200; // Optimal spacing

            node.x = parent.x + Math.cos(angle) * distance;
            node.y = parent.y + Math.sin(angle) * distance;

            if (node.children.length > 0) {
                const sectorSize = (endAngle - startAngle) / node.children.length;
                node.children.forEach((childId, i) => {
                    const cStart = startAngle + (i * sectorSize);
                    const cEnd = cStart + sectorSize;
                    layoutNode(childId, cStart, cEnd, level + 1);
                });
            }
        };

        const root = result[0];
        if (root.children.length > 0) {
            const sectorSize = (2 * Math.PI) / root.children.length;
            root.children.forEach((childId, i) => {
                const start = i * sectorSize;
                const end = start + sectorSize;
                layoutNode(childId, start, end, 1);
            });
        }

        return result;
    }, [data]);

    return (
        <div className="w-full h-full min-h-[600px] bg-black/5 dark:bg-white/5 rounded-[40px] relative overflow-hidden p-0 cursor-grab active:cursor-grabbing flex items-center justify-center">
            {/* The actual draggable viewport */}
            <motion.div
                drag
                dragConstraints={{
                    left: -2000,
                    right: 2000,
                    top: -2000,
                    bottom: 2000
                }}
                dragMomentum={false}
                className="w-[1px] h-[1px] relative flex items-center justify-center overflow-visible"
                style={{ scale }}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
            >
                <svg
                    viewBox="-1000 -1000 2000 2000"
                    width="2000"
                    height="2000"
                    className="overflow-visible"
                >
                    {/* Connections */}
                    {nodes.map(node => {
                        if (!node.parent) return null;
                        const parent = nodes.find(n => n.id === node.parent);
                        if (!parent) return null;
                        return (
                            <motion.line
                                key={`line-${node.id}`}
                                x1={parent.x}
                                y1={parent.y}
                                x2={node.x}
                                y2={node.y}
                                stroke="currentColor"
                                strokeWidth="3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.2 }}
                                transition={{ duration: 1.5 }}
                                className="text-black dark:text-white"
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <motion.g
                            key={node.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.id === 'root' ? 65 : 45}
                                className={`${node.id === 'root' ? 'fill-black dark:fill-white' : 'fill-white dark:fill-black border-2 border-black/10 dark:border-white/10'}`}
                            />
                            <foreignObject
                                x={node.x - 90}
                                y={node.y - 90}
                                width="180"
                                height="180"
                                style={{ pointerEvents: 'none' }}
                            >
                                <div className="w-full h-full flex items-center justify-center p-3">
                                    <span className={`text-[11px] font-black uppercase tracking-tighter leading-tight text-center ${node.id === 'root' ? 'text-white dark:text-black' : 'text-gray-900 dark:text-white'}`}>
                                        {node.text}
                                    </span>
                                </div>
                            </foreignObject>
                        </motion.g>
                    ))}
                </svg>
            </motion.div>

            {/* Interaction Controls */}
            <div className="absolute top-10 right-10 flex flex-col gap-2 z-10">
                <button
                    onClick={handleZoomIn}
                    className="p-4 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                    <ZoomIn className="w-5 h-5 text-black dark:text-white" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-4 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                    <ZoomOut className="w-5 h-5 text-black dark:text-white" />
                </button>
                <button
                    onClick={handleReset}
                    className="p-4 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                    <RotateCcw className="w-5 h-5 text-black dark:text-white" />
                </button>
            </div>

            {/* Instruction Banner */}
            <div className="absolute top-10 left-10 pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500/40">Neural Plane Control: Active</span>
            </div>

            {/* Legend */}
            <div className="absolute bottom-10 left-10 flex flex-col gap-3 p-6 bg-black/5 dark:bg-white/5 rounded-[30px] backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Neural Sync Status: Active</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Structural Integrity: Optimized</span>
                </div>
            </div>
        </div>
    );
};

export default MindMapComponent;
