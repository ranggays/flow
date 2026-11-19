export interface Activity {  
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
  colorClass: string
}

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