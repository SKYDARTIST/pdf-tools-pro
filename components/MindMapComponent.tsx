import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Share2, Loader2 } from 'lucide-react';
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
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.1));
    const handleReset = () => setScale(1);

    // Optimized parser and radial layout engine
    const nodes = useMemo(() => {
        const lines = data.split('\n').filter(l => l.trim().length > 0);
        const result: MindMapNode[] = [];
        const stack: { id: string, indent: number }[] = [];

        // Root node
        const firstLine = lines[0]?.replace(/^#+\s*/, '').trim() || 'Central Concept';
        result.push({ id: 'root', text: firstLine, x: 0, y: 0, children: [] });
        stack.push({ id: 'root', indent: -1 });

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

        const layoutNode = (nodeId: string, startAngle: number, endAngle: number, level: number) => {
            const node = result.find(n => n.id === nodeId);
            if (!node || nodeId === 'root') return;

            const parent = result.find(n => n.id === node.parent);
            if (!parent) return;

            const angle = (startAngle + endAngle) / 2;
            const distance = level === 1 ? 650 : 450; // Maximum spacing to ensure zero overlap

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

    const handleExport = async () => {
        if (!svgRef.current || nodes.length === 0) return;
        setIsExporting(true);
        try {
            const padding = 300; // More padding
            const exportScale = 4;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(n => {
                const r = n.id === 'root' ? 120 : 100;
                minX = Math.min(minX, n.x - r);
                minY = Math.min(minY, n.y - r);
                maxX = Math.max(maxX, n.x + r);
                maxY = Math.max(maxY, n.y + r);
            });

            const contentWidth = (maxX - minX) + (padding * 2);
            const contentHeight = (maxY - minY) + (padding * 2);

            const canvas = document.createElement('canvas');
            // Optimize: 4000px is the sweet spot for mobile sharing speed vs 8K quality
            const targetDim = 4000;
            const scaleFactor = targetDim / Math.max(contentWidth, contentHeight);

            canvas.width = contentWidth * scaleFactor;
            canvas.height = contentHeight * scaleFactor;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');

            const finalScale = scaleFactor;

            // === NEURAL PRO SIGNATURE ENGINE ===
            // Background: Deep Slate/Black for premium depth
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Refined Neural Dot Matrix
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            const gridStep = 80 * finalScale;
            for (let x = 0; x < canvas.width; x += gridStep) {
                for (let y = 0; y < canvas.height; y += gridStep) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2 * finalScale, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.translate((-minX + padding) * finalScale, (-minY + padding) * finalScale);

            // === PROFESSIONAL NEURAL GRADIENTS (Connections) ===
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            nodes.forEach(node => {
                if (!node.parent) return;
                const parent = nodes.find(n => n.id === node.parent);
                if (!parent) return;

                const grad = ctx.createLinearGradient(
                    parent.x * finalScale, parent.y * finalScale,
                    node.x * finalScale, node.y * finalScale
                );
                grad.addColorStop(0, '#10b981'); // Emerald
                grad.addColorStop(1, '#6366f1'); // Indigo

                // Glow Pass
                ctx.strokeStyle = grad;
                ctx.globalAlpha = 0.2;
                ctx.lineWidth = 16 * (finalScale / 4);
                ctx.beginPath();
                ctx.moveTo(parent.x * finalScale, parent.y * finalScale);
                ctx.lineTo(node.x * finalScale, node.y * finalScale);
                ctx.stroke();

                // Solid Pass
                ctx.globalAlpha = 0.8;
                ctx.lineWidth = 6 * (finalScale / 4);
                ctx.beginPath();
                ctx.moveTo(parent.x * finalScale, parent.y * finalScale);
                ctx.lineTo(node.x * finalScale, node.y * finalScale);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            });

            // === NEURAL PRO NODES ===
            nodes.forEach(node => {
                const isRoot = node.id === 'root';
                const px = node.x * finalScale;
                const py = node.y * finalScale;
                const radius = (isRoot ? 130 : 100) * finalScale; // Balanced radius
                const nodeColor = isRoot ? '#10b981' : '#6366f1';

                // Subtle Outer Glow
                ctx.shadowBlur = 30 * finalScale;
                ctx.shadowColor = nodeColor;

                // Circle Fill
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fillStyle = isRoot ? '#ffffff' : '#0a0a0a';
                ctx.fill();

                // Stroke
                ctx.shadowBlur = 0;
                ctx.strokeStyle = nodeColor;
                ctx.lineWidth = 6 * finalScale;
                ctx.stroke();

                // TEXT: Intelligent Scaling
                ctx.fillStyle = isRoot ? '#000000' : '#ffffff';
                const words = node.text.toUpperCase().split(' ');

                // Dynamic font scaling based on longest word
                const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, "");
                let fontSize = (isRoot ? 40 : 28) * finalScale;
                if (longestWord.length > 8) fontSize *= 0.8;
                if (longestWord.length > 12) fontSize *= 0.7;

                ctx.font = `900 ${fontSize}px "SF Pro Display", system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const lineHeight = fontSize * 1.05;
                const startY = words.length > 1 ? py - ((words.length - 1) * lineHeight / 2) : py;

                words.forEach((word, i) => {
                    ctx.fillText(word, px, startY + (i * lineHeight));
                });
            });

            // 5. Professional Signature Branding
            ctx.resetTransform();

            // Right corner: Neural Projection signature
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = `900 ${32 * (finalScale / 4)}px "SF Pro Display"`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('AI VIEW | ANTI-GRAVITY', canvas.width - 80, canvas.height - 80);

            // Left corner: Engine Badge
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.fillText('• AI ENGINE', 80, canvas.height - 80);



            const blob = await new Promise<Blob>((resolve, reject) => {
                // Switching to JPEG for 3x faster encoding/sharing while keeping 0.9 quality
                canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.9);
            });
            await downloadFile(blob, `anti-gravity-mindmap-${Date.now()}.jpg`);
        } catch (error) {
            console.error('Neural Export Failed:', error);
            alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div ref={mapRef} className="w-full h-full min-h-[600px] bg-[#050505] rounded-[40px] relative overflow-hidden p-0 cursor-grab active:cursor-grabbing flex items-center justify-center border border-white/5">
            {/* Background Grid for UI */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <motion.div
                drag
                dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
                dragMomentum={false}
                className="w-[1px] h-[1px] relative flex items-center justify-center overflow-visible"
                style={{ scale }}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
            >
                <svg ref={svgRef} viewBox="-1500 -1500 3000 3000" width="3000" height="3000" style={{ overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Connections */}
                    {nodes.map(node => {
                        if (!node.parent) return null;
                        const parent = nodes.find(n => n.id === node.parent);
                        return parent && (
                            <line
                                key={`line-${node.id}`}
                                // Add 0.1 epsilon to prevent zero-dimension bounding boxes which can cause lines to vanish in some WebViews
                                x1={parent.x} y1={parent.y} x2={node.x + 0.1} y2={node.y + 0.1}
                                stroke="#10b981"
                                strokeWidth="4"
                                strokeOpacity="0.8"
                                filter="url(#glow)"
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <g key={node.id}>
                            <circle
                                cx={node.x} cy={node.y}
                                r={node.id === 'root' ? 100 : 75} // Larger circles in UI
                                fill={node.id === 'root' ? '#ffffff' : '#0a0a0a'}
                                stroke={node.id === 'root' ? '#10b981' : '#6366f1'}
                                strokeWidth="5"
                                filter="url(#glow)"
                            />
                            <text
                                x={node.x} y={node.y}
                                textAnchor="middle"
                                fill={node.id === 'root' ? '#000000' : '#ffffff'}
                                style={{
                                    fontSize: node.id === 'root' ? '20px' : '14px', // Reduced to fit
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    fontFamily: 'SF Pro Display, system-ui, sans-serif',
                                    pointerEvents: 'none'
                                }}
                            >
                                {node.text.split(' ').map((word, i, arr) => (
                                    <tspan key={i} x={node.x} dy={i === 0 ? (arr.length > 1 ? '-0.3em' : '0.35em') : '1.1em'}>
                                        {word}
                                    </tspan>
                                ))}
                            </text>
                        </g>
                    ))}
                </svg>
            </motion.div>

            {/* Controls */}
            <div className="absolute top-8 right-8 flex flex-col gap-2 z-10">
                <button onClick={handleZoomIn} className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/20 transition-all"><ZoomIn size={20} /></button>
                <button onClick={handleZoomOut} className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/20 transition-all"><ZoomOut size={20} /></button>
                <button onClick={handleReset} className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/20 transition-all"><RotateCcw size={20} /></button>
                <div className="h-px bg-white/10 my-1" />
                <button onClick={handleExport} disabled={isExporting} className="p-4 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-full text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                    {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                </button>
            </div>

            <div className="absolute top-8 left-8 pointer-events-none z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">AI Engine: Active</span>
            </div>

            {isExporting && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={40} className="text-emerald-500 animate-spin" />
                    <div className="flex flex-col items-center">
                        <span className="text-emerald-500 font-black text-xl tracking-tighter">GENERATING ASSET</span>
                        <span className="text-white/40 text-[10px] uppercase tracking-[0.2em]">Encoding High-Fidelity Projection</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindMapComponent;
