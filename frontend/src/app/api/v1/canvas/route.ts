import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest){
    const searchParams = request.nextUrl.searchParams;
    const workspace_id = searchParams.get("workspace_id");

    if (!workspace_id){
        return NextResponse.json(
            {error:"Workpace ID is required"},
            {status: 400}
        );
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspace_id },
            select: { canvasData: true }
        });
        return NextResponse.json(
            {canvasData: workspace?.canvasData || null},
            {status:200}
        );
    } catch (error) {
        console.error("Error fetching canvas", error);
        return NextResponse.json(
            {error:"Internal Server Error"},
            {status:500}
        );
    }
}

export async function POST(request: NextRequest){
    try {
        const { workspace_id, canvasData } = await request.json();

        if (!workspace_id){
            return NextResponse.json(
                {error:"Workspace ID is required"},
                {status:400}
            );
        }

        const activeElements = Array.isArray(canvasData)
            ? canvasData.filter((el: any) => !el.isDeleted)
            : [];

        await prisma.workspace.update({
            where: {id: workspace_id},
            data: { canvasData: activeElements}
        });

        return NextResponse.json(
            {message:"Canvas saved successfully"},
            {status:200}
        )
    } catch (error) {
        console.error("Error saving canvas:", error);
        return NextResponse.json(
            {error:"Internal Server Error"},
            {status: 500}
        )
    }
}