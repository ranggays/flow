import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest){
    try {
        const body = await request.json();
        if(!body){
            return NextResponse.json(
                {error: "There are no parameter"},
                {status: 400},
            )
        }

        const res = await fetch(`${process.env.BACKEND_URL}/api/v1/generate-mindmap`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({summary: body.summary})
        })

        if(!res || !res.ok){
            throw new Error("Failed created mindmap")
        }

        const data = await res.json();

        return NextResponse.json(data)
    } catch (error) {
        console.error("Error mindmap API:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}