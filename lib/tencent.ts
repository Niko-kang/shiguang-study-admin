import cloudbase from '@cloudbase/js-sdk';

let app:ReturnType<typeof cloudbase.init>|undefined;
let signingIn:Promise<void>|undefined;
async function connect(){
 const env=import.meta.env.VITE_CLOUDBASE_ENV;
 if(!env)throw new Error('云端环境尚未配置。');
 if(!app)app=cloudbase.init({env,region:import.meta.env.VITE_CLOUDBASE_REGION||'ap-shanghai',timeout:12000});
 const auth=app.auth();
 if(!await auth.getLoginState()){
  if(!signingIn)signingIn=(async()=>{const {error}=await auth.signInAnonymously();if(error)throw new Error('访客连接失败，请重试。')})().finally(()=>{signingIn=undefined});
  await signingIn;
 }
 return app;
}
export async function tencentFetch(path:string,init?:RequestInit):Promise<Response>{
 const url=new URL(path,'https://study.invalid');
 const data={path:url.pathname,method:init?.method||'GET',kind:url.searchParams.get('kind')||undefined,body:init?.body?JSON.parse(String(init.body)):undefined};
 const connected=await connect();
 // Do not retry writes automatically: a timeout may still have committed a record.
 const {result}=await connected.callFunction({name:'shiguang-study-api',data});
 const response=typeof result==='string'?JSON.parse(result):result;
 if(!response||!Number.isInteger(response.status)||response.status<200||response.status>599||!response.body||typeof response.body!=='object')throw new Error('云端返回格式异常。');
 return new Response(JSON.stringify(response.body),{status:response.status,headers:{'Content-Type':'application/json'}});
}
