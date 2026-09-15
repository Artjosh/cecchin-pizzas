"use client";
import {createContext,useContext,useEffect,type ReactNode,type Dispatch,type SetStateAction} from 'react';
import {usePathname} from 'next/navigation';
export type TituloRegistrado={caminho:string;conteudo:ReactNode}|null;
export const ContextoTitulo=createContext<Dispatch<SetStateAction<TituloRegistrado>>|null>(null);
export function TituloNoHeader({children,className}:{children:ReactNode;className?:string}){
 const registrar=useContext(ContextoTitulo),caminho=usePathname();
 useEffect(()=>{if(registrar)registrar({caminho,conteudo:children});},[registrar,caminho,children]);
 return registrar?null:<h1 className={className}>{children}</h1>;
}
