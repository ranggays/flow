import { NextRequest, NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest){
    const supabase = await createServer();
    const { data: { user }} = await supabase.auth.getUser();

    if (!user) return NextResponse.json(
        {error: "Unauthorized"},
        { status: 401 }
    );

    try {

        // ambil formdata fe
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const workspaceId = formData.get("workspaceId") as string | null;
        
        if (!file || !workspaceId){
            return NextResponse.json(
                { error: "File & Workspace ID is not filled"},
                { status: 400}
            );
        }

        // ganti file dadi buffer cek iso dikirim nde supabase storage
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // gae jeneng file unik
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_'); //resik i spasi mbe karakter
        const filePath = `${workspaceId}/${Date.now()}-${safeFileName}`;

        // proses gae upload ng supabase storage
        const { error: storageError } = await supabase.storage.from("documents").upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
        });

        if (storageError){
            console.error("Storage Error:", storageError);
            return NextResponse.json(
                { error:"Gagal upload ke storage" },
                { status: 500 }
            );
        }

        // oleh url public teko file sg sektas diupload
        const { data: { publicUrl }} = supabase.storage.from("documents").getPublicUrl(filePath);

        // simpen metadata nde database prisma
        const newDocument = await prisma.document.create({
            data: {
                workspaceId,
                name: file.name,
                fileUrl: publicUrl,
                fileType: file.type,
                size: file.size,
                isVectorized: false
            }
        });

        try {
            fetch("http://127.0.0.1:8000/api/process-new-documents", {
                method: "POST"
            }).catch(err => console.error("Failed calling FastAPI", err));
            console.log("Success Calling FastAPI");
        } catch (error) {
            console.error("Error Calling", error);
        }
        
        return NextResponse.json(
            newDocument,
            {status: 201}
        );
    } catch (error) {
        console.error("Upload Error", error);
        return NextResponse.json(
            {error:"Internal Server Error"},
            {status: 500}
        )
    }
}