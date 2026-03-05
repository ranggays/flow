import { NextRequest, NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { title } from "node:process";

export async function POST(request: NextRequest){
    const supabase = await createServer();

    const { data: {user}} = await supabase.auth.getUser();
    if (!user){
        return NextResponse.json(
            {error: "Unauthorized"},
            {status: 401},
        )
    }

    const body = await request.json();
    const { name, description, category, team, icon, color } = body;

    try {
        const newWorkspace = await prisma.workspace.create({
            data: {
                name,
                description,
                category: category || "Personal",
                team: team || null,
                icon: icon || "rocket_launch",
                color: color || "#3b82f6",
                ownerId: user.id,
            },
        });
        return NextResponse.json(newWorkspace);
    } catch (error) {
        console.error("Error creating workspace: ", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}

export async function GET(request: NextRequest){
    const supabase = await createServer();

    const { data: { user }} = await supabase.auth.getUser();

    if (!user){
        return NextResponse.json(
            {error: "Unauthorized"},
            {status: 401}
        )
    }
    try {        
        const workspaces = await prisma.workspace.findMany({
            where: {ownerId: user.id},
            orderBy: { createdAt: 'desc'}
        });
        return NextResponse.json(workspaces);
    } catch (error) {
        return NextResponse.json(
            {error: "Failed to get"},
            {status: 500}
        )
    }
}