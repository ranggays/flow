import { useState, useEffect } from "react";

export interface Message {
    role: "user" | "ai";
    content: string;
    attachments?: { id: string; name: string }[]
}

export interface ChatHistoryItem {
    id: string;
    title: string;
    createdAt: string;
}

export interface SelectedDocument {
    id: string;
    name: string;
}

export function useChatAssistant(workspaceId: string){
    const defaultMessage: Message = {
        role: "ai",
        content: "Hai mau tanya-tanya terkait apa nih??"
    };
    const [messages, setMessages] = useState<Message[]>([defaultMessage]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);

    const [showHistory, setShowHistory] = useState(false);
    const [chatHistoryList, setChatHistoryList] = useState<ChatHistoryItem[]>([]);

    const [selectedDocs, setSelectedDocs] = useState<SelectedDocument[]>([]);

    const toggleDocument = (doc: SelectedDocument) => {
        setSelectedDocs(prev => {
            const isSelected = prev.find(d => d.id === doc.id);
            if (isSelected){
                return prev.filter(d => d.id !== doc.id);
            } else {
                return [...prev, doc];
            }
        })
    };

    const clearSelectedDocs = () => setSelectedDocs([]);

    const loadingHistoryList = async () => {
        if (!workspaceId) return;
        try {
            const res = await fetch(`/api/v1/chat?workspace_id=${workspaceId}`);
            const data = await res.json();
            if (data.history) setChatHistoryList(data.history);
        } catch (error) {
            console.error("Failed to get history", error);
        }
    };

    const toggleHistory = () => {
        if (!showHistory) loadingHistoryList();
        setShowHistory(!showHistory);
    };

    const handleNewChat = () => {
        setChatId(null)
        setMessages([defaultMessage]);
        setShowHistory(false);
    };

    const selectOldChat = async (selectedChatId: string) => {
        try {
            const res = await fetch(`/api/v1/chat?chat_id=${selectedChatId}`);
            const data = await res.json();
            if (data.chat_id){
                setChatId(data.chat_id);
                setMessages(data.message?.length > 0 ? data.message : [defaultMessage]);
                setShowHistory(false);
            }
        } catch (error) {
            console.error("Failed get chat", error);
        }
    };

    const deleteChat = async (e: React.MouseEvent, idToDelete: string) => {
        e.stopPropagation();
        if (!confirm("Hapus obrolan ini?")) return;

        try {
            const res = await fetch(`/api/v1/chat?chat_id=${idToDelete}`, {
                method: "DELETE"
            });
            if (res.ok){
                setChatHistoryList(prev => prev.filter(c => c.id !== idToDelete));
                if (chatId === idToDelete) handleNewChat();
            }
        } catch (error) {
            console.error("Failed Delete Chat:", error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !workspaceId || isLoading) return;

        const userMessage = input.trim();
        const currentAttachments = selectedDocs.length > 0 ? [...selectedDocs] : undefined;

        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage, attachments: currentAttachments}]);
        setIsLoading(true);

        try {
            const res = await fetch(`/api/v1/chat`, {
                method: "POST",
                headers: { "Content-Type":"application/json"},
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    message: userMessage,
                    chat_id: chatId,
                    document_ids: selectedDocs.length > 0 ? selectedDocs.map(d => d.id) : [],
                    attachments: currentAttachments
                })
            });

            const data = await res.json();

            if (data.answer){
                setMessages(prev => [...prev, { role: "ai", content: data.answer}]);
                if (data.chat_id && !chatId){
                    setChatId(data.chat_id);
                }
            } else {
                setMessages(prev => [...prev, { role: "ai", content: "Something Wrong Happened"}]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "ai", content: "Connection Failed"}]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        input,
        setInput,
        isLoading,
        showHistory,
        chatHistoryList,
        toggleHistory,
        handleNewChat,
        selectOldChat,
        deleteChat,
        handleSend,
        selectedDocs,
        toggleDocument,
        clearSelectedDocs
    };
}