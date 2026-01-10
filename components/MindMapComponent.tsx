import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Download, Loader2 } from 'lucide-react';
import { downloadFile } from '../services/downloadService';

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
    const [isExporting, setIsExporting] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.1)); // Expanded zoom out
    const handleReset = () => {
        setScale(1);
    };


    const handleExport = async () => {
        if (!svgRef.current) return;

        setIsExporting(true);
        try {
            // Manual canvas export to avoid CORS issues on Android
            const canvas = document.createElement('canvas');
            canvas.width = 2000;
            canvas.height = 2000;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Canvas not supported');
            }

            // Black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 2000, 2000);

            // Translate to center
            ctx.translate(1000, 1000);

            // Draw connections first
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 3;
            nodes.forEach(node => {
                if (!node.parent) return;
                const parent = nodes.find(n => n.id === node.parent);
                if (!parent) return;

                ctx.beginPath();
                ctx.moveTo(parent.x, parent.y);
                ctx.lineTo(node.x, node.y);
                ctx.stroke();
            });

            // Draw nodes
            ctx.font = 'bold 10px SF Pro Display, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            nodes.forEach(node => {
                const isRoot = node.id === 'root';
                const radius = isRoot ? 70 : 50;

                // Circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = isRoot ? '#ffffff' : '#000000';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Text
                ctx.fillStyle = isRoot ? '#000000' : '#ffffff';
                ctx.font = isRoot ? 'bold 12px SF Pro Display' : 'bold 10px SF Pro Display';

                const words = node.text.split(' ');
                const lineHeight = 12;
                const startY = words.length > 1 ? node.y - (lineHeight / 2) : node.y;

                words.forEach((word, i) => {
                    ctx.fillText(word, node.x, startY + (i * lineHeight));
                });
            });

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create blob'));
                }, 'image/png', 1);
            });

            // Use cross-platform download
            await downloadFile(blob, `anti-gravity-mindmap-${Date.now()}.png`);
        } catch (error) {
            console.error('Neural Export Failed:', error);
            alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
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
            const distance = level === 1 ? 300 : 220; // Slightly more air

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
        <div
            ref={mapRef}
            className="w-full h-full min-h-[600px] bg-black rounded-[40px] relative overflow-hidden p-0 cursor-grab active:cursor-grabbing flex items-center justify-center border border-white/5"
        >
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
                    ref={svgRef}
                    viewBox="-1000 -1000 2000 2000"
                    width="2000"
                    height="2000"
                    style={{ overflow: 'visible' }}
                >
                    {/* Connections */}
                    {nodes.map(node => {
                        if (!node.parent) return null;
                        const parent = nodes.find(n => n.id === node.parent);
                        if (!parent) return null;
                        return (
                            <line
                                key={`line-${node.id}`}
                                x1={parent.x}
                                y1={parent.y}
                                x2={node.x}
                                y2={node.y}
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <g key={node.id}>
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.id === 'root' ? 70 : 50}
                                fill={node.id === 'root' ? '#ffffff' : '#000000'}
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="2"
                            />
                            <text
                                x={node.x}
                                y={node.y}
                                textAnchor="middle"
                                fill={node.id === 'root' ? '#000000' : '#ffffff'}
                                style={{
                                    fontSize: node.id === 'root' ? '12px' : '10px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    fontFamily: 'SF Pro Display, system-ui, sans-serif',
                                    pointerEvents: 'none',
                                    letterSpacing: '-0.02em',
                                    paintOrder: 'stroke'
                                }}
                            >
                                {node.text.split(' ').map((word, i, arr) => (
                                    <tspan
                                        key={i}
                                        x={node.x}
                                        dy={i === 0 ? (arr.length > 1 ? '-0.3em' : '0.35em') : '1.1em'}
                                    >
                                        {word}
                                    </tspan>
                                ))}
                            </text>
                        </g>
                    ))}
                </svg>
            </motion.div>

            {/* Interaction Controls */}
            <div className="absolute top-10 right-10 flex flex-col gap-2 z-10">
                <button
                    onClick={handleZoomIn}
                    className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl hover:bg-white/20 transition-all active:scale-95 text-white"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl hover:bg-white/20 transition-all active:scale-95 text-white"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>
                <button
                    onClick={handleReset}
                    className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl hover:bg-white/20 transition-all active:scale-95 text-white"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <div className="w-full h-px bg-white/10 my-1" />
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="p-4 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-xl hover:bg-emerald-500/30 transition-all active:scale-95 text-emerald-400 disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                </button>
            </div>

            {/* Instruction Banner */}
            <div className="absolute top-10 left-10 pointer-events-none z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Neural Plane Control: Active</span>
            </div>

            {/* Legend */}
            <div className="absolute bottom-10 left-10 flex flex-col gap-3 p-6 bg-white/5 border border-white/10 rounded-[30px] backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Neural Sync Status: Active</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Structural Integrity: Optimized</span>
                </div>
            </div>
        </div>
    );
};

export default MindMapComponent;
