import React, { useState, useEffect } from 'react';
import { MessageSquare, Archive, Trash2, Clock, MoreVertical } from 'lucide-react';
import { Conversation, getUserConversations, deleteConversation, archiveConversation } from '../services/conversationService.ts';

interface ConversationHistoryProps {
    userId: string;
    currentConversationId?: string;
    onSelectConversation: (conversationId: string) => void;
    onNewConversation: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
    userId,
    currentConversationId,
    onSelectConversation,
    onNewConversation
}) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        loadConversations();
    }, [userId, showArchived]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const { conversations: convos } = await getUserConversations(
                userId,
                50,
                0,
                showArchived
            );
            setConversations(convos);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (confirm('Are you sure you want to delete this conversation?')) {
            try {
                await deleteConversation(conversationId);
                await loadConversations();

                if (conversationId === currentConversationId) {
                    onNewConversation();
                }
            } catch (error) {
                console.error('Error deleting conversation:', error);
            }
        }
        setActiveMenu(null);
    };

    const handleArchive = async (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            await archiveConversation(conversationId);
            await loadConversations();
        } catch (error) {
            console.error('Error archiving conversation:', error);
        }
        setActiveMenu(null);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Conversations
                    </h3>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        {showArchived ? 'Active' : 'Archived'}
                    </button>
                </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {showArchived ? 'No archived conversations' : 'No conversations yet'}
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {conversations.map((conversation) => (
                            <div
                                key={conversation.conversation_id}
                                onClick={() => onSelectConversation(conversation.conversation_id)}
                                className={`
                                    group relative p-3 rounded-lg cursor-pointer transition-all
                                    ${currentConversationId === conversation.conversation_id
                                        ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                                        : 'hover:bg-gray-100 dark:hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {conversation.title || 'New Conversation'}
                                            </h4>

                                            <div className="relative flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(
                                                            activeMenu === conversation.conversation_id
                                                                ? null
                                                                : conversation.conversation_id
                                                        );
                                                    }}
                                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-opacity"
                                                >
                                                    <MoreVertical className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                                </button>

                                                {activeMenu === conversation.conversation_id && (
                                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50">
                                                        {!conversation.is_archived && (
                                                            <button
                                                                onClick={(e) => handleArchive(conversation.conversation_id, e)}
                                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 rounded-t-lg"
                                                            >
                                                                <Archive className="w-3.5 h-3.5" />
                                                                Archive
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleDelete(conversation.conversation_id, e)}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 rounded-b-lg"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDate(conversation.updated_at)}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                • {conversation.messages.length} messages
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
