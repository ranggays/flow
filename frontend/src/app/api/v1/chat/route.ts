import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest){
    try {
        const body = await request.json();
        const { workspace_id, message, chat_id, document_ids, attachments } = body;

        if (!workspace_id || !message){
            return NextResponse.json(
                {error: "Workspace ID & message is required"},
                {status: 400}
            );
        }

        // 1. gae sesi chat lek drg ono
        let currentChatId = chat_id;
        if (!currentChatId){
            const newChat = await prisma.chat.create({
                data: {
                    workspaceId: workspace_id
                }
            });
            currentChatId = newChat.id
        }

        // 2. simpen chat user
        await prisma.message.create({
            data: {
                chatId: currentChatId,
                role: "user",
                content: message,
                attachments: attachments || null
            }
        });

        // 3. jupuk riwayat chat
        const pastMessages = await prisma.message.findMany({
            where: { chatId: currentChatId },
            orderBy: { createdAt: 'asc' },
            take: 10
        });

        const historyForFastAPI = pastMessages.filter(msg => msg.content !== message || msg.role !== "user").map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                workspace_id: workspace_id,
                message: message,
                history: historyForFastAPI,
                document_ids: document_ids || []
            }),
        });

        if (!response.ok){
            throw new Error(`Failed calling server AI: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.answer){
            await prisma.message.create({
                data: {
                    chatId: currentChatId,
                    role: "ai",
                    content: data.answer
                }
            });
        }

        return NextResponse.json({
            answer: data.answer,
            chat_id: currentChatId
        });
    } catch (error) {
        console.error("Error Chat API:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}

export async function GET(request: NextRequest){
    try {
        const { searchParams } = new URL(request.url);
        // const searchParams = request.nextUrl.searchParams;
        const workspace_id = searchParams.get("workspace_id");
        const chat_id = searchParams.get("chat_id");

        // 1. lek ono chat_id, ambil isine
        if (chat_id){
            const chat = await prisma.chat.findUnique({
                where: { id: chat_id },
                include: { messages: { orderBy: { createdAt: 'asc'}}}
            });

            if (!chat) return NextResponse.json({ error: "Chat is not found"}, {status: 404});

            return NextResponse.json({
                chat_id: chat_id, 
                message: chat.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    attachments: m.attachments
                }))}
            );
        }

        if (workspace_id){
            const chats = await prisma.chat.findMany({
                where: {
                    workspaceId: workspace_id
                },
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    messages: {
                        where: {
                            role: "user"
                        },
                        orderBy: {
                            createdAt: 'asc'
                        },
                        take: 1
                    }
                }
            });

            const historyList = chats.map(c => ({
                id: c.id,
                createdAt: c.createdAt,
                title: c.messages[0]?.content || "Obrolan Baru"
            }));

            return NextResponse.json(
                {history: historyList},
                {status: 200}
            )
        }

        return NextResponse.json(
            {error: "Parameters are not enough"},
            {status: 400}
        )
    } catch (error) {
        return NextResponse.json(
            {error: "Failed Get Data"},
            {status: 500}
        )
    }
}

export async function DELETE(request: NextRequest){
    try {
        const { searchParams } = new URL(request.url);
        const chat_id = searchParams.get("chat_id");

        if (!chat_id) return NextResponse.json(
            {error: "ID chat is required"},
            {status: 400}
        );

        await prisma.chat.delete({
            where: {
                id: chat_id
            }
        });
        return NextResponse.json(
            {message: "Chat is succesfully deleted"},
            {status: 200}
        );
    } catch (error) {
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}