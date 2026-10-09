import {z} from 'zod';
export type Session={id:string;date:string;startedAt:string;endedAt:string;durationMs:number;note:string;source:'timer'|'manual';adjusted:boolean;deleted?:boolean;device?:string;networkRegion?:string;ip?:string};
export type ActiveSession={id:string;date:string;startedAt:string;runningSince:string|null;elapsedMs:number;endedAt:string|null;phase:'running'|'paused'|'review';device?:string;networkRegion?:string;ip?:string};
export type TimerState={version:number;active:ActiveSession|null;sessions:Session[]};
export const emptyTimer:TimerState={version:0,active:null,sessions:[]};
export function elapsed(active:ActiveSession,now=Date.now()){return active.elapsedMs+(active.runningSince?Math.max(0,now-Date.parse(active.runningSince)):0)}
export function chinaDay(value:Date|string=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}
export function durationText(ms:number){const s=Math.floor(Math.max(0,ms)/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')}
const iso=z.string().datetime();
export const timerCommand=z.object({version:z.number().int().min(0),action:z.enum(['start','pause','resume','stop','cancel','save','manual','edit','delete','restore']),id:z.string().uuid().optional(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),startedAt:iso.optional(),endedAt:iso.optional(),durationMs:z.number().int().min(1000).max(86400000).optional(),note:z.string().trim().max(500).optional(),device:z.string().trim().max(80).optional(),ip:z.string().ip().optional(),networkRegion:z.string().max(150).optional()});
