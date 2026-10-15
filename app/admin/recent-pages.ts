type PageVisit={id:string;deleted?:boolean;lastSeenAt?:string;visibleMs?:number};
export function recentPages<T extends PageVisit>(visits:T[],now:number):T[]{
 return visits.filter(v=>{const at=Date.parse(v.lastSeenAt||'');return !v.deleted&&typeof v.visibleMs==='number'&&Number.isFinite(at)&&now>=at&&now-at<=20000;}).sort((a,b)=>Date.parse(b.lastSeenAt!)-Date.parse(a.lastSeenAt!));
}
export function safeVisitLink(value?:string){
 try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
