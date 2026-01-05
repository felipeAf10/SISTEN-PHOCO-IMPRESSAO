import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Users, Circle, ChevronLeft, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, ChatMessage, UserStatus, ChatUser } from '../types';
import { toast } from 'sonner';

interface TeamChatProps {
    currentUser: User;
}

const STATUS_COLORS = {
    online: 'bg-emerald-500',
    busy: 'bg-rose-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-500',
};

const STATUS_LABELS = {
    online: 'Online',
    busy: 'Ocupado',
    away: 'Ausente',
    offline: 'Offline'
};

const TeamChat: React.FC<TeamChatProps> = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeView, setActiveView] = useState<'general' | 'users' | 'dm'>('general');
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [myStatus, setMyStatus] = useState<UserStatus>('online');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeView, isOpen]);

    // 1. FETCH ALL USERS (Base List)
    useEffect(() => {
        const fetchAllUsers = async () => {
            // Fetch from your 'app_users' table which contains profiles
            const { data } = await supabase.from('app_users').select('*');
            if (data) {
                // Map to ChatUser format with default 'offline' status
                const initialUsers: ChatUser[] = data.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    status: 'offline' as UserStatus, // Default to offline until presence updates
                    last_seen: new Date().toISOString(),
                    avatar: u.avatar_url
                })).filter((u: ChatUser) => u.id !== currentUser.id); // Exclude self

                setAllUsers(initialUsers);
            }
        };
        fetchAllUsers();
    }, [currentUser.id]);


    // 2. PRESENCE (REALTIME STATUS)
    useEffect(() => {
        if (!currentUser) return;

        const presenceChannel = supabase.channel('online-users');

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const onlineIds = new Set<string>();
                const onlineMap = new Map<string, UserStatus>();

                for (const id in state) {
                    const userState = state[id][0] as any;
                    onlineIds.add(userState.id);
                    onlineMap.set(userState.id, userState.status || 'online');
                }

                // Merge presence info into allUsers list
                setAllUsers(prev => prev.map(user => {
                    const isOnline = onlineIds.has(user.id);
                    return {
                        ...user,
                        status: isOnline ? (onlineMap.get(user.id) || 'online') : 'offline'
                    };
                }));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        id: currentUser.id,
                        name: currentUser.name,
                        role: currentUser.role,
                        status: myStatus,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [currentUser, myStatus]); // Re-track when my status changes

    // 3. FETCH & SUBSCRIBE MESSAGES
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(500); // Higher limit for history

            if (!error && data) {
                setMessages(data);
            }
            setIsLoading(false);
        };

        fetchMessages();

        const msgChannel = supabase
            .channel('public:chat_messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [...prev, newMsg]);

                    // Notifications logic
                    if (!isOpen && newMsg.sender_id !== currentUser.id) {
                        // If it's a DM for me OR a public message
                        if (!newMsg.recipient_id || newMsg.recipient_id === currentUser.id) {
                            setUnreadCount(prev => prev + 1);
                            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(() => { });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(msgChannel);
        };
    }, [isOpen, currentUser.id]);

    // Mark read when opening
    useEffect(() => {
        if (isOpen) setUnreadCount(0);
    }, [isOpen]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const recipientId = activeView === 'dm' && selectedUser ? selectedUser.id : null;

        const optimisticMsg: ChatMessage = {
            id: Date.now().toString(),
            content: newMessage,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            recipient_id: recipientId,
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        try {
            await supabase.from('chat_messages').insert({
                content: optimisticMsg.content,
                sender_id: optimisticMsg.sender_id,
                sender_name: optimisticMsg.sender_name,
                recipient_id: optimisticMsg.recipient_id
            });
        } catch (error) {
            console.error('Error sending:', error);
            toast.error('Erro ao enviar');
        }
    };

    // Filter Messages based on View
    const filteredMessages = useMemo(() => {
        if (activeView === 'general') {
            // Only public messages (recipient_id is null)
            return messages.filter(m => !m.recipient_id);
        }
        if (activeView === 'dm' && selectedUser) {
            // Messages between me and selectedUser
            return messages.filter(m =>
                (m.sender_id === currentUser.id && m.recipient_id === selectedUser.id) ||
                (m.sender_id === selectedUser.id && m.recipient_id === currentUser.id)
            );
        }
        return [];
    }, [messages, activeView, selectedUser, currentUser.id]);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Count online users excluding current user
    const onlineCount = allUsers.filter(u => u.status !== 'offline').length;

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 group"
                >
                    <MessageSquare size={24} />
                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#0f172a] ${STATUS_COLORS[myStatus]}`} />

                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-[#0f172a] animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed bottom-6 right-6 bg-[#0f172a] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 z-50 ${isMinimized ? 'w-72 h-16' : 'w-80 md:w-96 h-[600px] max-h-[85vh]'}`}>

                    {/* Header */}
                    <div className="p-3 bg-indigo-950/50 border-b border-indigo-500/20 flex justify-between items-center">

                        {/* Left Side: Back Button or Title */}
                        <div className="flex items-center gap-2 overflow-hidden">
                            {activeView === 'dm' ? (
                                <button onClick={() => { setActiveView('users'); setSelectedUser(null); }} className="p-1 hover:bg-white/10 rounded-lg text-indigo-300 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                            ) : activeView === 'users' ? (
                                <button onClick={() => setActiveView('general')} className="p-1 hover:bg-white/10 rounded-lg text-indigo-300 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                            ) : null}

                            <div className="flex flex-col">
                                {activeView === 'general' && (
                                    <div className="flex items-center gap-2" onClick={() => setActiveView('users')}>
                                        <span className="font-bold text-white text-sm cursor-pointer hover:underline decoration-indigo-400 underline-offset-4">Mural da Equipe</span>
                                        <span className="text-[9px] bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-200 border border-indigo-500/30">{onlineCount + 1} ON</span>
                                    </div>
                                )}
                                {activeView === 'users' && <span className="font-bold text-white text-sm">Nova Conversa</span>}
                                {activeView === 'dm' && selectedUser && (
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedUser.status]}`} />
                                        <span className="font-bold text-white text-sm">{selectedUser.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Status Selector & Controls */}
                        <div className="flex items-center gap-2">
                            {/* My Status Dropdown (only visible when not minimized and not in users list maybe?) */}
                            <div className="group relative">
                                <button className={`w-3 h-3 rounded-full ${STATUS_COLORS[myStatus]} ring-2 ring-offset-2 ring-offset-[#0f172a] ring-indigo-500/30`} />
                                <div className="absolute right-0 top-full mt-2 w-32 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-in fade-in zoom-in-95 origin-top-right z-50">
                                    {(['online', 'busy', 'away'] as UserStatus[]).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setMyStatus(s)}
                                            className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-white/5 flex items-center gap-2 ${myStatus === s ? 'text-indigo-400' : 'text-secondary'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                                            {STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-300 hover:text-white transition-colors"
                            >
                                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-300 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    {!isMinimized && (
                        <>
                            {/* VIEW 1: USER LIST */}
                            {activeView === 'users' && (
                                <div className="flex-1 overflow-y-auto bg-surface p-2 space-y-1">
                                    <button
                                        onClick={() => setActiveView('general')}
                                        className="w-full p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center gap-3 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                                            <Users size={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-white text-sm">Mural Geral</p>
                                            <p className="text-[10px] text-indigo-300">Mensagens para todos</p>
                                        </div>
                                    </button>

                                    <div className="px-2 py-2 text-[10px] font-bold text-secondary uppercase tracking-widest mt-4">
                                        Membros da Equipe ({allUsers.length})
                                    </div>

                                    {allUsers.length === 0 ? (
                                        <p className="text-center text-xs text-secondary py-4 italic">Ninguém mais encontrado...</p>
                                    ) : (
                                        allUsers
                                            .sort((a, b) => {
                                                // Sort: Online first, then Busy, then Away, then Offline
                                                const priority = { online: 0, busy: 1, away: 2, offline: 3 };
                                                const pA = priority[a.status as keyof typeof priority] ?? 3; // Cast to specific key type
                                                const pB = priority[b.status as keyof typeof priority] ?? 3;
                                                return pA - pB;
                                            })
                                            .map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => { setSelectedUser(user); setActiveView('dm'); }}
                                                    className="w-full p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors border border-transparent hover:border-white/5"
                                                >
                                                    <div className="relative">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${user.status === 'offline' ? 'bg-slate-800 opacity-60' : 'bg-slate-700'}`}>
                                                            {user.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${user.status === 'offline' ? 'bg-slate-500' : STATUS_COLORS[user.status]}`} />
                                                    </div>
                                                    <div className={`flex-1 text-left ${user.status === 'offline' ? 'opacity-60' : ''}`}>
                                                        <p className="font-bold text-slate-200 text-xs">{user.name}</p>
                                                        <p className="text-[9px] text-slate-500 capitalize">{user.status === 'offline' ? 'Offline' : STATUS_LABELS[user.status] || user.status}</p>
                                                    </div>
                                                    {messages.filter(m => m.sender_id === user.id && m.recipient_id === currentUser.id && !isOpen).length > 0 && (
                                                        <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                                            {messages.filter(m => m.sender_id === user.id && m.recipient_id === currentUser.id && !isOpen).length}
                                                        </span>
                                                    )}
                                                </button>
                                            ))
                                    )}
                                </div>
                            )}

                            {/* VIEW 2 & 3: CHAT (General or DM) */}
                            {(activeView === 'general' || activeView === 'dm') && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface custom-scrollbar relative">
                                        {/* Background Watermark/Pattern */}
                                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />

                                        {isLoading && <div className="text-center py-4"><div className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}

                                        {!isLoading && filteredMessages.length === 0 && (
                                            <div className="text-center py-10 opacity-40">
                                                <MessageSquare size={32} className="mx-auto mb-2 text-indigo-300" />
                                                <p className="text-xs text-indigo-200">{activeView === 'dm' ? `Mande um oi para ${selectedUser?.name}!` : "Comece a conversa!"}</p>
                                                {activeView === 'dm' && selectedUser?.status === 'offline' && (
                                                    <p className="text-[10px] text-indigo-400 mt-2">Ele está offline, mas verá sua mensagem quando entrar.</p>
                                                )}
                                            </div>
                                        )}

                                        {filteredMessages.map((msg, idx) => {
                                            const isMe = msg.sender_id === currentUser.id;
                                            // Grouping logic: show header if different sender or long gap
                                            const prevMsg = filteredMessages[idx - 1];
                                            const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                                            return (
                                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                                    {showHeader && !isMe && (
                                                        <span className="text-[10px] text-indigo-300 ml-2 mb-1 font-bold flex items-center gap-1">
                                                            {msg.sender_name}
                                                            {activeView === 'general' && <span className="text-[8px] bg-slate-800 px-1 rounded text-slate-500">Mural</span>}
                                                        </span>
                                                    )}
                                                    <div
                                                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm relative group ${isMe
                                                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
                                                                : 'bg-surface-hover border border-white/5 text-slate-200 rounded-tl-sm'
                                                            }`}
                                                    >
                                                        {msg.content}
                                                        <span className="text-[8px] opacity-40 absolute bottom-1 right-2 group-hover:opacity-100 transition-opacity">
                                                            {formatTime(msg.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-white/5 flex gap-2 items-end">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                            placeholder={activeView === 'dm' ? `Mensagem para ${selectedUser?.name}...` : "Mensagem para todos..."}
                                            className="flex-1 bg-surface-hover border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500 resize-none custom-scrollbar"
                                            rows={1}
                                            style={{ minHeight: '42px', maxHeight: '100px' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="h-[42px] w-[42px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default TeamChat;
