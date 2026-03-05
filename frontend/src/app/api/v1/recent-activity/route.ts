import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(){
    try {
        const recentWorkspaces = await prisma.workspace.findMany({
            take: 4,
            orderBy: {
                updatedAt: 'desc'
            }
        });

        const activities = recentWorkspaces.map((ws, i) => {
            const styles = [
                { icon: "update", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
                { icon: "edit_note", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
                { icon: "dashboard_customize", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
                { icon: "folder_open", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" }
            ];
            
            const style = styles[i % styles.length];

            return {
                id: ws.id,
                title: `Workspace diperbarui`,
                subtitle: ws.name,
                timestamp: ws.updatedAt, 
                icon: style.icon,
                colorClass: style.color
            };
        });
        return NextResponse.json(
            {success: true, data: activities},
            {status: 200}
        )
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        return NextResponse.json(
            {success:false, message:"Failed get activities"},
            {status: 500}
        )
    }
}