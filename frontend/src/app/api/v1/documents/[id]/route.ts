import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServer } from "@/lib/supabase/server"

export async function DELETE(
    request: NextRequest,
    { params }: {params: Promise<{id:string}>}
){
    const { id } = await params;
    const supabase = await createServer();

    try {
        const document = await prisma.document.findUnique({
            where: { id: id}
        });
    
        if (!document){
            return NextResponse.json(
                {error: "Document is not found"},
                {status: 404}
            )
        }
    
        console.log("Searching File with URL:", document.fileUrl);

        const urlParts = document.fileUrl.split("/documents");

        if (urlParts.length > 1){
            let filePath = urlParts[1];

            if (filePath.startsWith('/')){
                filePath = filePath.substring(1);
            };
            
            const decodedFilePath = decodeURIComponent(filePath);
            console.log("Try deleting path from bucket:", decodedFilePath);
    
            const {data, error: storageError} = await supabase.storage.from("documents").remove([decodedFilePath]);

            if (storageError){
                console.error("Failed deleting from storage:", storageError);
            } else {
                if (data && data.length > 0) {
                    console.log("Success delete pyshic file:", data);
                } else {
                    console.log("Warning, RLS Policies is not correct");
                }
            }
        } else {
            console.log("Failed parsing URL, Format URL is not matching");
        }

        await prisma.document.delete({
            where: {
                id: id,
            }
        });

        return NextResponse.json(
            {message: "Success Delete"},
            {status: 200}
        )
    } catch (error) {
        console.error("Error API Delete: ", error);
        return NextResponse.json(
            {error: "Failed Delete"},
            {status: 500}
        )
    }
}