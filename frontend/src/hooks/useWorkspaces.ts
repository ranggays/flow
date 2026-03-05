import { useState, useCallback } from 'react';

export interface Workspace{
    id: string;
    name: string;
    description?: string;
    category: string;
    icon: string;
    color: string;
    createdAt?: string;
    updatedAt: string;
    members?: number;
    team?: string;
    documents?: any[];
}

export function useWorkspaces(){
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchWorkspaces = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/v1/workspaces");
            if (res.ok){
                const data = await res.json();
                setWorkspaces(data);
            }
        } catch (error) {
            console.error("Failed to fetch workspaces", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchWorkspace = useCallback(async(id: string) =>{
        try {
            const res = await fetch(`/api/v1/workspaces/${id}`);
            if (res.ok){
                const data = await res.json();
                console.log("Data diterima:", data);
                setWorkspace(data);
            }
        } catch (error) {
            console.error("Failed to fetch workspace", error);
        }
    }, [])

    const createWorkspace = async (data: Workspace) => {
        try {
            const res = await fetch("/api/v1/workspaces", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify(data),
            });
            return res.ok;
        } catch (error) {
            console.error("Error creating", error);
            return false;
        }
    };

    const updateWorkspace = async (id: string, data: Workspace) => {
        try {
            const res = await fetch(`/api/v1/workspaces/${id}`, {
                method: "PATCH",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify(data)
            });
            return res.ok;
        } catch (error) {
            console.error("Error updating", error);
            return false;
        }
    };

    const deleteWorkspace = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/workspaces/${id}`, {
                method: "DELETE"
            });
            if (res.ok){
                setWorkspaces((prev) => prev.filter((ws,i) => ws.id !== id))
            }
        } catch (error) {
            console.error("Error deleting", error);
        }
    };

    return {
        workspaces,
        isLoading,
        fetchWorkspaces,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        fetchWorkspace,
        workspace
    };
}