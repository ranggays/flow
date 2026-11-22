import AuthProtected from "@/lib/supabase/authProtected";

export default function Layout(
    { children } : { children:React.ReactNode }
){
    return(
        <AuthProtected>
            {children}
        </AuthProtected>
    )
}