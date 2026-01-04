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

        // Root node at center
        const firstLine = lines[0]?.replace(/^#+\s*/, '').trim() || 'Central Concept';
        result.push({ id: 'root', text: firstLine, x: 400, y: 300, children: [] });
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
            const distance = level === 1 ? 180 : 120; // More space for main branches

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
        <div className="w-full h-full min-h-[500px] bg-black/5 dark:bg-white/5 rounded-[40px] relative overflow-hidden flex items-center justify-center p-8 cursor-grab active:cursor-grabbing">
            <svg viewBox="0 0 800 600" className="w-full h-full max-w-4xl overflow-visible">
                <motion.g
                    drag
                    dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                    style={{ scale }}
                    initial={{ x: 0, y: 0 }}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
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
                                strokeWidth="1"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.1 }}
                                transition={{ duration: 1 }}
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
                                r={node.id === 'root' ? 40 : 25}
                                className={`${node.id === 'root' ? 'fill-black dark:fill-white' : 'fill-white dark:fill-black border border-black/10 dark:border-white/10'}`}
                            />
                            <foreignObject
                                x={node.x - 60}
                                y={node.y + (node.id === 'root' ? 45 : 30)}
                                width="120"
                                height="60"
                            >
                                <div className="text-center">
                                    <span className={`text-[8px] font-black uppercase tracking-tighter leading-none ${node.id === 'root' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {node.text}
                                    </span>
                                </div>
                            </foreignObject>
                        </motion.g>
                    ))}
                </motion.g>
            </svg>

            {/* Interaction Controls */}
            <div className="absolute top-10 right-10 flex flex-col gap-2">
                <button
                    onClick={handleZoomIn}
                    className="p-3 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                    <ZoomIn className="w-4 h-4 text-black dark:text-white" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-3 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                    <ZoomOut className="w-4 h-4 text-black dark:text-white" />
                </button>
                <button
                    onClick={handleReset}
                    className="p-3 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
                >
                    <RotateCcw className="w-4 h-4 text-black dark:text-white" />
                </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-10 left-10 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Neural Connect Success</span>
                </div>
            </div>
        </div>
    );
};

export default MindMapComponent;
