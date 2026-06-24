import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Plus, 
    Trash2, 
    ChevronLeft, 
    Save, 
    Layout, 
    GripVertical,
    PlusCircle,
    Settings2,
    ChevronDown,
    ChevronUp,
    Copy
} from 'lucide-react';
import { MainLayout } from '../../layouts/MainLayout';
import api from '../../api/client';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CreateInspectionTemplate = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [loading, setLoading] = useState(false);
    const [series, setSeries] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        type: 'MOVE_OUT',
        responseChoices: [
            { label: 'Good', color: 'green' },
            { label: 'Fair', color: 'orange' },
            { label: 'Poor', color: 'red' }
        ],
        rooms: [
            { 
                id: Date.now(), 
                name: 'Kitchen', 
                questions: [
                    { id: Date.now() + 1, text: 'Is the countertop clean?', type: 'GLOBAL', selectedChoices: [] }
                ] 
            }
        ]
    });

    useEffect(() => {
        fetchSeries();
        if (id) {
            fetchTemplate();
        }
    }, [id]);

    const fetchSeries = async () => {
        try {
            const res = await api.get('/api/admin/workflow/response-series');
            if (res.data.success) {
                setSeries(res.data.data.filter(s => s.isActive));
            }
        } catch (error) {
            console.error('Fetch series error:', error);
        }
    };

    const fetchTemplate = async () => {
        try {
            const res = await api.get('/api/admin/workflow/templates');
            if (res.data.success) {
                const template = res.data.data.find(t => t.id === parseInt(id));
                if (template) {
                    setFormData({
                        name: template.name,
                        type: template.type,
                        responseChoices: template.structure?.responseChoices || [
                            { label: 'Good', color: 'green' },
                            { label: 'Fair', color: 'orange' },
                            { label: 'Poor', color: 'red' }
                        ],
                        rooms: template.structure?.rooms || []
                    });
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    };

    const addRoom = () => {
        setFormData({
            ...formData,
            rooms: [...formData.rooms, { id: Date.now(), name: 'New Room', questions: [], isCollapsed: false }]
        });
    };

    const toggleRoomCollapse = (roomId) => {
        setFormData({
            ...formData,
            rooms: formData.rooms.map(r => 
                r.id === roomId ? { ...r, isCollapsed: !r.isCollapsed } : r
            )
        });
    };

    const cloneRoom = (roomIndex) => {
        const roomToClone = formData.rooms[roomIndex];
        const newRoom = {
            ...roomToClone,
            id: Date.now(),
            name: `${roomToClone.name} (Copy)`,
            isCollapsed: false,
            questions: roomToClone.questions.map((q, idx) => ({
                ...q,
                id: Date.now() + idx + 1
            }))
        };

        const newRooms = [...formData.rooms];
        newRooms.splice(roomIndex + 1, 0, newRoom);
        setFormData({ ...formData, rooms: newRooms });
    };

    const removeRoom = (roomId) => {
        setFormData({
            ...formData,
            rooms: formData.rooms.filter(r => r.id !== roomId)
        });
    };

    const addQuestion = (roomId) => {
        setFormData({
            ...formData,
            rooms: formData.rooms.map(r => 
                r.id === roomId 
                ? { ...r, questions: [...r.questions, { id: Date.now(), text: '', type: 'GLOBAL' }] }
                : r
            )
        });
    };

    const updateQuestion = (roomId, questionId, text) => {
        setFormData({
            ...formData,
            rooms: formData.rooms.map(r => 
                r.id === roomId 
                ? { ...r, questions: r.questions.map(q => q.id === questionId ? { ...q, text } : q) }
                : r
            )
        });
    };

    const removeQuestion = (roomId, questionId) => {
        setFormData({
            ...formData,
            rooms: formData.rooms.map(r => 
                r.id === roomId 
                ? { ...r, questions: r.questions.filter(q => q.id !== questionId) }
                : r
            )
        });
    };

    const handleDragEndRooms = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.rooms.findIndex((r) => r.id === active.id);
                const newIndex = prev.rooms.findIndex((r) => r.id === over.id);
                return { ...prev, rooms: arrayMove(prev.rooms, oldIndex, newIndex) };
            });
        }
    };

    const handleDragEndQuestions = (roomId, event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData((prev) => {
                const roomIndex = prev.rooms.findIndex((r) => r.id === roomId);
                const oldIndex = prev.rooms[roomIndex].questions.findIndex((q) => q.id === active.id);
                const newIndex = prev.rooms[roomIndex].questions.findIndex((q) => q.id === over.id);
                const newQuestions = arrayMove(prev.rooms[roomIndex].questions, oldIndex, newIndex);
                
                const newRooms = [...prev.rooms];
                newRooms[roomIndex] = { ...newRooms[roomIndex], questions: newQuestions };
                return { ...prev, rooms: newRooms };
            });
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Please enter a template name');
        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                structure: { 
                    rooms: formData.rooms,
                    responseChoices: formData.responseChoices
                }
            };
            
            const res = id 
                ? await api.put(`/api/admin/workflow/templates/${id}`, payload)
                : await api.post('/api/admin/workflow/templates', payload);

            if (res.data.success) {
                navigate('/admin/workflow/templates');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout title="Create Template">
            <div className="max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <ChevronLeft size={24} className="text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{id ? 'Edit Template' : 'New Template'}</h1>
                            <p className="text-gray-500 text-sm font-medium">{id ? 'Update your existing checklist' : 'Create a room-by-room checklist for inspections'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Save Template</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Basic Info */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Template Name</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g., Standard Move-Out Checklist"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Inspection Type</label>
                                <select 
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="MOVE_IN">Move-In Inspection</option>
                                    <option value="MOVE_OUT">Move-Out Inspection</option>
                                    <option value="VISUAL">Visual Inspection</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Condition Buttons (Visible on App)</label>
                            <div className="flex flex-wrap gap-3">
                                {formData.responseChoices.map((choice, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 group">
                                        <div className={`w-3 h-3 rounded-full bg-${choice.color}-500`} />
                                        <input 
                                            className="bg-transparent text-xs font-black outline-none w-16"
                                            value={choice.label}
                                            onChange={(e) => {
                                                const newChoices = [...formData.responseChoices];
                                                newChoices[idx].label = e.target.value;
                                                setFormData({ ...formData, responseChoices: newChoices });
                                            }}
                                        />
                                        <select 
                                            className="text-[9px] font-bold bg-white rounded border border-gray-100 outline-none"
                                            value={choice.color}
                                            onChange={(e) => {
                                                const newChoices = [...formData.responseChoices];
                                                newChoices[idx].color = e.target.value;
                                                setFormData({ ...formData, responseChoices: newChoices });
                                            }}
                                        >
                                            <option value="green">Green</option>
                                            <option value="orange">Orange</option>
                                            <option value="red">Red</option>
                                            <option value="blue">Blue</option>
                                            <option value="indigo">Indigo</option>
                                            <option value="purple">Purple</option>
                                            <option value="pink">Pink</option>
                                            <option value="cyan">Cyan</option>
                                            <option value="teal">Teal</option>
                                            <option value="emerald">Emerald</option>
                                            <option value="amber">Amber</option>
                                            <option value="rose">Rose</option>
                                            <option value="slate">Slate</option>
                                            <option value="gray">Gray</option>
                                        </select>
                                        <button 
                                            onClick={() => setFormData({ ...formData, responseChoices: formData.responseChoices.filter((_, i) => i !== idx) })}
                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => setFormData({ ...formData, responseChoices: [...formData.responseChoices, { label: 'New', color: 'gray' }] })}
                                    className="px-3 py-2 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-black text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                >
                                    + Add Choice
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Room Sections */}
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEndRooms}
                    >
                        <SortableContext 
                            items={formData.rooms.map(r => r.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-4">
                                {formData.rooms.map((room, index) => (
                                    <SortableRoom 
                                        key={room.id}
                                        room={room}
                                        index={index}
                                        formData={formData}
                                        setFormData={setFormData}
                                        series={series}
                                        navigate={navigate}
                                        toggleRoomCollapse={toggleRoomCollapse}
                                        cloneRoom={cloneRoom}
                                        removeRoom={removeRoom}
                                        addQuestion={addQuestion}
                                        updateQuestion={updateQuestion}
                                        removeQuestion={removeQuestion}
                                        handleDragEndQuestions={handleDragEndQuestions}
                                        sensors={sensors}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Add Room Button */}
                    <button 
                        onClick={addRoom}
                        className="flex items-center justify-center gap-3 py-6 border-4 border-dashed border-gray-100 rounded-3xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all font-black text-lg tracking-tight"
                    >
                        <Plus size={24} />
                        Add New Room Section
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default CreateInspectionTemplate;

const SortableRoom = ({ room, index, formData, setFormData, series, navigate, toggleRoomCollapse, cloneRoom, removeRoom, addQuestion, updateQuestion, removeQuestion, handleDragEndQuestions, sensors }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: room.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleRoomCollapse(room.id)}>
                <div className="flex-1 flex items-center gap-3 overflow-hidden mr-4">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded shrink-0">
                        <GripVertical size={20} className="text-gray-400" />
                    </div>
                    <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-xs font-black text-indigo-600">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <input 
                            type="text"
                            value={room.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                const newRooms = [...formData.rooms];
                                newRooms[index].name = e.target.value;
                                setFormData({ ...formData, rooms: newRooms });
                            }}
                            className="w-full bg-transparent text-lg font-black text-gray-900 outline-none border-b-2 border-transparent focus:border-indigo-500 transition-all px-1"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-2 text-gray-400 transition-transform duration-300">
                        {room.isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); cloneRoom(index); }}
                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Clone Section"
                    >
                        <Copy size={18} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remove Section"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
            {!room.isCollapsed && (
                <div className="p-6 space-y-3">
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEndQuestions(room.id, e)}
                    >
                        <SortableContext 
                            items={room.questions.map(q => q.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {room.questions.map((q, qIndex) => (
                                    <SortableQuestion 
                                        key={q.id}
                                        q={q}
                                        room={room}
                                        qIndex={qIndex}
                                        formData={formData}
                                        setFormData={setFormData}
                                        series={series}
                                        navigate={navigate}
                                        updateQuestion={updateQuestion}
                                        removeQuestion={removeQuestion}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <button 
                        onClick={(e) => { e.stopPropagation(); addQuestion(room.id); }}
                        className="flex items-center gap-2 px-4 py-3 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-black transition-all w-full justify-center border-2 border-dashed border-indigo-100"
                    >
                        <PlusCircle size={16} />
                        Add Item to {room.name}
                    </button>
                </div>
            )}
        </div>
    );
};

const SortableQuestion = ({ q, room, qIndex, formData, setFormData, series, navigate, updateQuestion, removeQuestion }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: q.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 group/item bg-white">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded">
                <GripVertical size={16} className="text-gray-300" />
            </div>
            <input 
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(room.id, q.id, e.target.value)}
                placeholder="Enter inspection question..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-gray-200 transition-all"
            />
            <div className="flex flex-col gap-2 min-w-[150px]">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase">Button Type</label>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/admin/workflow/response-groups'); }}
                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase flex items-center gap-1"
                        title="Customize Button Sets (e.g. Good/Fair/Poor)"
                    >
                        <Settings2 size={10} /> Manage Button Sets
                    </button>
                </div>
                <select 
                    value={q.type === 'SERIES' ? `SERIES_${q.seriesId}` : q.type}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        const val = e.target.value;
                        const newRooms = [...formData.rooms];
                        const roomIdx = newRooms.findIndex(r => r.id === room.id);
                        if (val.startsWith('SERIES_')) {
                            newRooms[roomIdx].questions[qIndex].type = 'SERIES';
                            newRooms[roomIdx].questions[qIndex].seriesId = parseInt(val.replace('SERIES_', ''));
                        } else {
                            newRooms[roomIdx].questions[qIndex].type = val;
                            newRooms[roomIdx].questions[qIndex].seriesId = null;
                        }
                        setFormData({ ...formData, rooms: newRooms });
                    }}
                    className="px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-black text-gray-500 outline-none w-full"
                >
                    <optgroup label="Template Defaults">
                        <option value="GLOBAL">Standard Buttons</option>
                        <option value="YES_NO">YES / NO</option>
                        <option value="TEXT">Comment Box Only</option>
                    </optgroup>
                    <optgroup label="Manageable Button Sets">
                        {series.map(s => (
                            <option key={s.id} value={`SERIES_${s.id}`}>{s.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Direct Input">
                        <option value="DROPDOWN">Custom Dropdown</option>
                        <option value="RATING">1-5 Rating</option>
                    </optgroup>
                </select>

                {q.type === 'GLOBAL' && (
                    <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Visible Choices</p>
                        <div className="flex flex-wrap gap-2">
                            {formData.responseChoices.map((choice) => (
                                <button
                                    key={choice.label}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newRooms = [...formData.rooms];
                                        const roomIdx = newRooms.findIndex(r => r.id === room.id);
                                        const selected = q.selectedChoices || [];
                                        const isSelected = selected.includes(choice.label);
                                        newRooms[roomIdx].questions[qIndex].selectedChoices = isSelected
                                            ? selected.filter(l => l !== choice.label)
                                            : [...selected, choice.label];
                                        setFormData({ ...formData, rooms: newRooms });
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${(!q.selectedChoices || q.selectedChoices.length === 0 || q.selectedChoices.includes(choice.label)) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-indigo-100'}`}
                                >
                                    {choice.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[8px] text-indigo-300 mt-2 px-1 font-medium">Empty = Show All</p>
                    </div>
                )}
                {q.type === 'DROPDOWN' && (
                    <input 
                        type="text"
                        placeholder="Options (comma separated)..."
                        onClick={(e) => e.stopPropagation()}
                        value={q.options || ''}
                        onChange={(e) => {
                            const newRooms = [...formData.rooms];
                            const roomIdx = newRooms.findIndex(r => r.id === room.id);
                            newRooms[roomIdx].questions[qIndex].options = e.target.value;
                            setFormData({ ...formData, rooms: newRooms });
                        }}
                        className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold outline-none placeholder:text-indigo-300"
                    />
                )}
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); removeQuestion(room.id, q.id); }}
                className="p-2 text-gray-300 hover:text-red-500 transition-all"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};
