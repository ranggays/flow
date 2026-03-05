import { useState, useEffect, useRef } from "react";

export function useDropdown(){
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const toggle = () => setIsOpen((prev) => !prev);
    const close = () => setIsOpen(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent){
            if(isOpen && ref.current && !ref.current.contains(event.target as Node)){
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return{
        isOpen,
        toggle,
        close,
        ref
    }
}