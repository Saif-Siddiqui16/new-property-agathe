import React, { useRef, useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { 
    X, Undo, Redo, Trash2, Save, Type, Square, Circle, 
    Minus, MoveRight, MousePointer2, Pencil
} from 'lucide-react';

const DashLineIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="8" y2="12" />
        <line x1="13" y1="12" x2="18" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
    </svg>
);

const PhotoAnnotationModal = ({ isOpen, onClose, photoUrl, onSave }) => {
    const canvasRef = useRef(null);
    const fabricCanvas = useRef(null);
    const containerRef = useRef(null);
    
    const [activeTool, setActiveTool] = useState('pencil');
    const [strokeColor, setStrokeColor] = useState('#ff0000');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    const activeToolRef = useRef(activeTool);
    const strokeColorRef = useRef(strokeColor);
    const strokeWidthRef = useRef(strokeWidth);

    useEffect(() => {
        activeToolRef.current = activeTool;
        strokeColorRef.current = strokeColor;
        strokeWidthRef.current = strokeWidth;
        
        if (fabricCanvas.current) {
            const canvas = fabricCanvas.current;
            canvas.isDrawingMode = activeTool === 'pencil';
            if (canvas.isDrawingMode) {
                canvas.freeDrawingBrush.color = strokeColor;
                canvas.freeDrawingBrush.width = strokeWidth;
            }
            canvas.selection = activeTool === 'select';
            canvas.getObjects().forEach(obj => {
                obj.selectable = activeTool === 'select';
            });
            canvas.renderAll();
        }
    }, [activeTool, strokeColor, strokeWidth]);

    const saveHistory = () => {
        if (!fabricCanvas.current) return;
        const json = fabricCanvas.current.toJSON();
        setHistory(prev => [...prev, json]);
    };

    // Initialize Fabric Canvas
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        
        let isMounted = true;

        const canvas = new fabric.Canvas(canvasRef.current, {
            backgroundColor: 'transparent',
            selection: true,
            renderOnAddRemove: true
        });

        fabricCanvas.current = canvas;

        // Load background image
        fabric.Image.fromURL(photoUrl, (img) => {
            if (!isMounted || !canvas) return;

            const container = containerRef.current;
            if (!container) return;

            // More aggressive padding for mobile
            const isMobile = window.innerWidth < 640;
            const horizontalPadding = isMobile ? 20 : 60;
            const verticalPadding = isMobile ? 240 : 120;

            const containerWidth = container.clientWidth - horizontalPadding;
            const containerHeight = container.clientHeight - verticalPadding;

            const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
            
            canvas.setDimensions({
                width: img.width * scale,
                height: img.height * scale
            });

            img.set({
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top'
            });

            canvas.setBackgroundImage(img, () => {
                if (isMounted) canvas.renderAll();
            });
            setLoading(false);
            saveHistory();
        }, { crossOrigin: 'anonymous' });

        // Event listeners
        let isDown, origX, origY, activeObj;

        canvas.on('mouse:down', (o) => {
            const tool = activeToolRef.current;
            if (tool === 'select') return;
            
            isDown = true;
            const pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;

            if (tool === 'pencil') {
                canvas.isDrawingMode = true;
                return;
            }

            canvas.isDrawingMode = false;

            const commonProps = {
                left: origX,
                top: origY,
                stroke: strokeColorRef.current,
                strokeWidth: strokeWidthRef.current,
                fill: 'transparent',
                selectable: true,
                evented: true,
                originX: 'left',
                originY: 'top'
            };

            if (tool === 'rect') {
                activeObj = new fabric.Rect({ ...commonProps, width: 0, height: 0 });
            } else if (tool === 'circle') {
                activeObj = new fabric.Circle({ ...commonProps, radius: 0 });
            } else if (tool === 'line' || tool === 'arrow' || tool === 'dash') {
                const points = [pointer.x, pointer.y, pointer.x, pointer.y];
                const dashArray = tool === 'dash' ? [10, 5] : null;
                activeObj = new fabric.Line(points, { ...commonProps, strokeDashArray: dashArray });
                
                if (tool === 'arrow') {
                    const head = new fabric.Triangle({
                        left: pointer.x,
                        top: pointer.y,
                        originX: 'center',
                        originY: 'center',
                        selectable: false,
                        pointType: 'arrowHead',
                        angle: 0,
                        width: 15 + strokeWidthRef.current,
                        height: 15 + strokeWidthRef.current,
                        fill: strokeColorRef.current,
                    });
                    canvas.add(head);
                    activeObj.arrowHead = head;
                }
            } else if (tool === 'text') {
                activeObj = new fabric.IText('Text', {
                    left: pointer.x,
                    top: pointer.y,
                    fill: strokeColorRef.current,
                    fontSize: 24,
                    fontFamily: 'Inter, sans-serif',
                });
                canvas.add(activeObj);
                canvas.setActiveObject(activeObj);
                activeObj.enterEditing();
                activeObj.selectAll();
                isDown = false;
                return;
            }

            if (activeObj) canvas.add(activeObj);
        });

        canvas.on('mouse:move', (o) => {
            if (!isDown) return;
            const tool = activeToolRef.current;
            if (tool === 'select' || tool === 'pencil') return;
            
            const pointer = canvas.getPointer(o.e);

            if (tool === 'rect') {
                if (origX > pointer.x) activeObj.set({ left: pointer.x });
                if (origY > pointer.y) activeObj.set({ top: pointer.y });
                activeObj.set({ width: Math.abs(origX - pointer.x), height: Math.abs(origY - pointer.y) });
            } else if (tool === 'circle') {
                activeObj.set({ radius: Math.abs(origX - pointer.x) / 2 });
                if (origX > pointer.x) activeObj.set({ left: pointer.x });
                if (origY > pointer.y) activeObj.set({ top: pointer.y });
            } else if (tool === 'line' || tool === 'arrow' || tool === 'dash') {
                activeObj.set({ x2: pointer.x, y2: pointer.y });
                if (tool === 'arrow' && activeObj.arrowHead) {
                    const angle = Math.atan2(pointer.y - origY, pointer.x - origX) * 180 / Math.PI;
                    activeObj.arrowHead.set({
                        left: pointer.x,
                        top: pointer.y,
                        angle: angle + 90
                    });
                }
            }
            canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
            if (!isDown) return;
            const tool = activeToolRef.current;
            
            if (tool === 'arrow' && activeObj && activeObj.arrowHead) {
                const line = activeObj;
                const head = activeObj.arrowHead;
                canvas.remove(line);
                canvas.remove(head);
                const group = new fabric.Group([line, head], {
                    selectable: true,
                    evented: true
                });
                canvas.add(group);
            }
            
            isDown = false;
            activeObj = null;
            saveHistory();
        });

        return () => {
            isMounted = false;
            canvas.dispose();
            fabricCanvas.current = null;
        };
    }, [isOpen, photoUrl]);

    const handleUndo = () => {
        if (history.length <= 1) {
            const objects = fabricCanvas.current.getObjects();
            objects.forEach(obj => {
                if (obj !== fabricCanvas.current.backgroundImage) fabricCanvas.current.remove(obj);
            });
            setHistory(history.slice(0, 1));
            return;
        }
        const newHistory = [...history];
        newHistory.pop();
        const prevState = newHistory[newHistory.length - 1];
        fabricCanvas.current.loadFromJSON(prevState, () => {
            fabricCanvas.current.renderAll();
        });
        setHistory(newHistory);
    };

    const handleClear = () => {
        if (!window.confirm('Clear all annotations?')) return;
        const objects = fabricCanvas.current.getObjects();
        objects.forEach(obj => {
            if (obj !== fabricCanvas.current.backgroundImage) fabricCanvas.current.remove(obj);
        });
        saveHistory();
    };

    const handleSave = () => {
        const data = fabricCanvas.current.toDataURL({ format: 'png', quality: 1 });
        onSave(data);
    };

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'None' },
        { id: 'line', icon: Minus, label: 'Line' },
        { id: 'rect', icon: Square, label: 'Rect' },
        { id: 'pencil', icon: Pencil, label: 'Draw' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'arrow', icon: MoveRight, label: 'Arrow' },
        { id: 'dash', icon: DashLineIcon, label: 'Dash' },
        { id: 'text', icon: Type, label: 'Text' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 backdrop-blur-md overflow-hidden touch-none">
            {/* Top Bar */}
            <div className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-xl p-1.5 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20">
                <button onClick={handleUndo} className="p-2 sm:p-3 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-all text-gray-600" title="Undo">
                    <Undo size={18} />
                </button>
                <button onClick={handleClear} className="p-2 sm:p-3 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all text-red-400" title="Clear">
                    <Trash2 size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <button onClick={onClose} className="p-2 sm:p-3 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all text-red-500" title="Close">
                    <X size={18} />
                </button>
            </div>

            {/* Desktop Left Sidebar */}
            <div className="hidden sm:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 flex-col gap-1 bg-white/90 backdrop-blur-xl p-2 rounded-[24px] shadow-2xl border border-white/20">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                            activeTool === tool.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-50 text-gray-500'
                        }`}
                    >
                        <tool.icon size={20} />
                        <span className={`text-[13px] font-bold whitespace-nowrap pr-2 ${activeTool === tool.id ? 'block' : 'hidden group-hover:block'}`}>
                            {tool.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="relative w-full h-full flex items-center justify-center p-4 sm:p-0">
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                <div className="relative shadow-2xl rounded-2xl sm:rounded-[40px] overflow-hidden bg-white/50 p-1 sm:p-2 border border-white/30 backdrop-blur-sm">
                    <canvas ref={canvasRef} className="rounded-xl sm:rounded-[32px] cursor-crosshair shadow-inner" />
                </div>
            </div>

            {/* Mobile Tool Picker (Bottom) */}
            <div className="sm:hidden absolute bottom-28 left-4 right-4 z-20 flex overflow-x-auto no-scrollbar gap-2 bg-white/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/20" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`flex flex-col items-center justify-center min-w-[70px] py-2 rounded-xl transition-all ${
                            activeTool === tool.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <tool.icon size={18} />
                        <span className="text-[10px] font-bold mt-1">{tool.label}</span>
                    </button>
                ))}
            </div>

            {/* Bottom Controls (Color & Save) */}
            <div className="absolute bottom-4 sm:bottom-10 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-20 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-white/90 backdrop-blur-xl p-3 sm:px-8 sm:py-4 rounded-2xl sm:rounded-[30px] shadow-2xl border border-white/20">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                    <div className="flex gap-2">
                        {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ffffff', '#000000'].map(color => (
                            <button 
                                key={color}
                                onClick={() => setStrokeColor(color)}
                                className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full border-2 transition-all ${strokeColor === color ? 'border-gray-900 scale-125 shadow-lg' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
                
                <div className="hidden sm:block w-px h-8 bg-gray-200" />
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 sm:py-3 text-gray-500 font-bold text-xs sm:text-sm uppercase tracking-tighter hover:text-gray-900 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs sm:text-sm">
                        <Save size={16} /> Save Annotation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhotoAnnotationModal;
