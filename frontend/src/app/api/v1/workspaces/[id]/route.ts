import { NextRequest, NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    {params}: {params: Promise<{id: string}>}
){
    const { id } = await params;
    const supabase = await createServer();
    const { data: { user }} = await supabase.auth.getUser();

    if (!user) return NextResponse.json(
        {error: "Unauthorized"},
        {status: 401}
    );

    try {
        const body = await request.json();
        const { name, description, category, icon, color } = body;
        const updatedWorkspace = await prisma.workspace.update({
            where: {
                id: id,
                ownerId: user.id,
            },
            data: {
                name, description, category, icon, color
            },
        });

        return NextResponse.json(updatedWorkspace);
    } catch (error) {
        return NextResponse.json(
            {error: "Failed to update"},
            {status: 500},
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: {params: Promise<{id: string}>}
){
    const { id } = await params;
    const supabase = await createServer();
    const { data: {user}} = await supabase.auth.getUser();

    if (!user) return NextResponse.json(
        {error: "Unauthorized"},
        { status: 401 }
    );
    
    try {
        await prisma.workspace.delete({
            where: {
                id: id,
                ownerId: user.id
            },
        });
        return NextResponse.json(
            {message: "Deleted successfully"}
        );
    } catch (error) {
        return NextResponse.json(
            {error: "Failed to delete"},
            {status: 500}
        )
    }
}

export async function GET(
    request: NextRequest,
    {params}: {params: Promise<{id: string}>}
){
    const { id } = await params;
    const supabase = await createServer();
    const {data: {user}} = await supabase.auth.getUser();

    if (!user) return NextResponse.json(
        {error: "Unauthorized"},
        {status: 401}
    )

    try {
        const singleWorkspace = await prisma.workspace.findFirst({
            where: {
                id: id,
                ownerId: user.id
            },
            include: {
                documents: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })
        return NextResponse.json(singleWorkspace);
    } catch (error) {
        return NextResponse.json(
            {error: "Failed Get ID Workspace"},
            {status: 500}
        )
    }
}