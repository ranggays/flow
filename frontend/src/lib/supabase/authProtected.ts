import { redirect } from "next/navigation";
import { createServer } from "@/lib/supabase/server";

export default async function AuthProtected(
    {children}:{children:React.ReactNode}
){
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();

    if(!user) redirect ("/login");

    return children;
}