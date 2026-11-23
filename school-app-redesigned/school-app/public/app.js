'use strict';
var DAYS=[["sat","شنبه"],["sun","یکشنبه"],["mon","دوشنبه"],["tue","سه‌شنبه"],["wed","چهارشنبه"],["thu","پنجشنبه"]];
var RN={admin:"مدیر",teacher:"معلم",student:"دانش‌آموز"},PER=3;
/* اطلاعات واقعی مدرسه را اینجا بنویسید */
var BIZ={name:"[نام قانونی مدرسه، تکمیل شود]",addr:"[آدرس، تکمیل شود]",contact:"[ایمیل یا تلفن تماس، تکمیل شود]"};
var TODO="[تکمیل شود، با نظر وکیل]";
var LEGAL={
privacy:["سیاست حریم خصوصی",[
["مسئول داده‌ها","نام: "+BIZ.name+" | آدرس: "+BIZ.addr+" | تماس: "+BIZ.contact],
["چه داده‌ای جمع می‌شود","نام کاربری، رمز عبور (فقط به‌صورت هش‌شدهٔ نمک‌دار ذخیره می‌شود)، نقش کاربر (مدیر، معلم یا دانش‌آموز)، کلاس دانش‌آموز، و محتوایی که مدیر یا معلم ثبت می‌کند (برنامهٔ هفتگی، امتحان‌ها، تکلیف‌ها و شناسهٔ ثبت‌کننده). هیچ داده‌ٔ دیگری جمع نمی‌شود."],
["هدف","نمایش برنامهٔ هفتگی، امتحان‌ها و تکلیف‌ها به کاربران مجاز و کنترل دسترسی بر اساس نقش."],
["کجا ذخیره می‌شود","روی سرور مدرسه. نام ارائه‌دهندهٔ هاست و کشور ذخیره‌سازی: "+TODO],
["اشخاص ثالث","این سایت از آنالیتیکس، تبلیغات، ردیاب یا محتوای جاسازی‌شدهٔ شخص ثالث استفاده نمی‌کند."],
["مدت نگه‌داری و حقوق شما","مدت نگه‌داری: "+TODO+". حق دسترسی، اصلاح و حذف داده: با مدیر مدرسه تماس بگیرید ("+BIZ.contact+"). جزئیات حقوق قانونی: "+TODO],
["دانش‌آموزان زیر سن قانونی","شرایط رضایت ولی و ثبت اطلاعات افراد زیر سن قانونی: "+TODO]]],
terms:["قوانین و مقررات",[
["دامنهٔ استفاده","این سایت فقط برای اعضای مدرسه است. حساب‌ها را مدیر می‌سازد و کاربران خودشان ثبت‌نام نمی‌کنند."],
["مسئولیت کاربران","رمز عبور خود را محرمانه نگه دارید. معلمان مسئول محتوایی هستند که ثبت می‌کنند. مدیر می‌تواند محتوا و حساب‌ها را تغییر دهد یا حذف کند."],
["محدودیت‌ها","برنامه و محتوا ممکن است تغییر کند و تضمینی برای در دسترس بودن بدون وقفه وجود ندارد: "+TODO],
["پرداخت","این سایت فروش یا پرداختی ندارد؛ بنابراین شرایط بازگشت وجه ندارد."],
["قانون حاکم و حل اختلاف",TODO],
["تماس","نام: "+BIZ.name+" | آدرس: "+BIZ.addr+" | تماس: "+BIZ.contact]]],
cookies:["سیاست کوکی",[
["کوکی‌ها","این سایت فقط یک کوکی ضروری به نام sid برای نگه‌داشتن ورود شما می‌گذارد (HttpOnly؛ پس از ۱۲ ساعت یا خروج از حساب بی‌اعتبار می‌شود). کوکی تحلیلی، تبلیغاتی یا ردیاب وجود ندارد."],
["رضایت","چون کوکی فقط برای ورود به حساب ضروری است، بنر رضایت لازم نیست؛ این را می‌توانید با وکیل در کشور خودتان تأیید کنید: "+TODO]]]};
var S={me:null,setup:false,classes:[],items:[],users:[],loaded:false},cur=null,msg="",last="";
function h(t,a,k){var e=document.createElement(t);for(var x in a||{}){if(x==="text")e.textContent=a[x];else if(x==="on")for(var ev in a.on)e.addEventListener(ev,a.on[ev]);else e.setAttribute(x,a[x])}(k||[]).forEach(function(c){e.appendChild(c)});return e}
function $(i){return document.getElementById(i)}
async function api(m,u,b){var r=await fetch(u,{method:m,headers:{"Content-Type":"application/json"},body:(m==="GET"||m==="DELETE")?undefined:JSON.stringify(b||{}),credentials:"same-origin"});var d={};try{d=await r.json()}catch(e){}if(!r.ok)throw new Error(d.error||"خطای سرور");return d}
async function load(){var m=await api("GET","/api/me");S.me=m.user;S.setup=m.setup;if(m.user){var d=await api("GET","/api/state");S.classes=d.classes;S.items=d.items;S.users=d.users||[]}else{S.classes=[];S.items=[];S.users=[]}S.loaded=true;var sig=JSON.stringify([S.me,S.setup,S.classes,S.items,S.users]);if(sig!==last){last=sig;render()}}
function act(p){msg="";return p.then(load).catch(function(e){msg="خطا: "+e.message;render()})}
function byId(id){return S.classes.filter(function(c){return c.id===id})[0]}
function sorted(){return S.classes.slice().sort(function(a,b){return a.name.localeCompare(b.name,"fa")})}
function sure(b,fn){if(b.dataset.a){fn();return}b.dataset.a="1";var t=b.textContent;b.textContent="تأیید حذف؟";setTimeout(function(){delete b.dataset.a;b.textContent=t},4000)}
var note="";function showPw(t){note=t;render()}
function warn(t){msg="خطا: "+t;render()}
function foot(){var f=$("foot");f.textContent="";[["privacy","حریم خصوصی"],["terms","قوانین و مقررات"],["cookies","سیاست کوکی"]].forEach(function(l){f.appendChild(h("a",{href:"#"+l[0],text:l[1]}))});f.appendChild(h("span",{text:"سازندگان: امیرعلی خودسیانی، امیر حسین طاهریان، مهراد ربانی، رها قاسمی زاده"}))}
function legalView(app,pg){var k=[h("h2",{text:LEGAL[pg][0]})];LEGAL[pg][1].forEach(function(x){k.push(h("h3",{text:x[0]}),h("p",{text:x[1]}))});k.push(h("p",{class:"note",text:"این متن پیش‌نویس است و پیش از استفاده باید وکیل آن را بررسی کند. بخش‌های داخل [ ] هنوز تکمیل نشده‌اند."}),h("a",{href:"#home",text:"بازگشت"}));app.appendChild(h("div",{class:"card"},k))}
function render(){
  var app=$("app");app.textContent="";foot();
  var pg=location.hash.slice(1);if(LEGAL[pg])return legalView(app,pg);
  if(msg)app.appendChild(h("p",{class:"err",role:"alert",text:msg}));
  if(note)app.appendChild(h("div",{class:"card"},[h("p",{text:note}),h("button",{text:"بستن",on:{click:function(){note="";render()}}})]));
  if(!S.loaded){app.appendChild(h("p",{class:"note",text:"در حال بارگذاری…"}));return}
  if(S.setup)return setupView(app);
  var me=S.me;if(!me)return loginView(app);
  var isA=me.role==="admin",isT=me.role==="teacher",isS=me.role==="student";
  if(isS)cur=me.cls;else if(!byId(cur))cur=(sorted()[0]||{}).id||null;
  var who=[h("span",{class:"note",text:me.username+" ("+RN[me.role]+")"}),h("button",{class:"ghost",text:"خروج",on:{click:function(){act(api("POST","/api/logout"))}}})];
  if(!isS){
    var sel=h("select",{"aria-label":"کلاس"},sorted().map(function(c){var o=h("option",{value:c.id,text:c.name});if(c.id===cur)o.selected=true;return o}));
    sel.addEventListener("change",function(){cur=+sel.value;render()});
    var bar=[h("label",{text:"کلاس:"}),sel];
    if(isA){var nm=h("input",{placeholder:"کلاس جدید","aria-label":"نام کلاس جدید"});bar.push(nm,h("button",{text:"افزودن کلاس",on:{click:function(){if(nm.value.trim())act(api("POST","/api/classes",{name:nm.value.trim()}).then(function(r){cur=r.id}))}}}))}
    bar.push(h("span",{class:"sp"}));app.appendChild(h("div",{class:"card bar"},bar.concat(who)));
  }else app.appendChild(h("div",{class:"card bar"},[h("span",{class:"sp"})].concat(who)));
  if(!byId(cur)){app.appendChild(h("p",{class:"empty",text:isS?"برنامهٔ کلاس شما هنوز ثبت نشده است. از مدیر مدرسه بخواهید آن را وارد کند.":"هنوز کلاسی ثبت نشده است. نام کلاس را در بالا بنویسید و «افزودن کلاس» را بزنید."}));if(isA)usersView(app);return}
  app.appendChild(h("h2",{class:"cls",text:byId(cur).name}));
  app.appendChild(weekView(isA));
  if(isA||isT)itemForm(app);
  if(isA)usersView(app);
}
function weekView(isA){
  var c=byId(cur),grid=c.grid||{},today=["sun","mon","tue","wed","thu",null,"sat"][new Date().getDay()];
  var wk=h("div",{class:"week",role:"group","aria-label":"برنامهٔ هفتگی کلاس "+c.name});
  DAYS.forEach(function(d){
    var isToday=d[0]===today;
    var col=h("section",{class:"col"+(isToday?" today":"")},[h("h3",{text:d[1]+(isToday?" (امروز)":"")})]);
    if(isToday)col.setAttribute("aria-current","date");
    for(var p=0;p<PER;p++)(function(p){
      var v=(grid[d[0]]||[])[p]||"";
      var cell=h("div",{class:"per"},[h("span",{class:"pn",text:"زنگ "+(p+1)})]);
      if(isA){
        var inp=h("input",{value:v,placeholder:"درس","aria-label":d[1]+" زنگ "+(p+1)});
        inp.addEventListener("change",function(){var g=JSON.parse(JSON.stringify(grid));g[d[0]]=g[d[0]]||[];for(var i=0;i<PER;i++)g[d[0]][i]=g[d[0]][i]||"";g[d[0]][p]=inp.value.trim();act(api("PUT","/api/classes/"+cur+"/grid",{grid:g}))});
        cell.appendChild(inp);
      }else cell.appendChild(h("b",{text:v||"—"}));
      col.appendChild(cell)})(p);
    var list=S.items.filter(function(x){return x.cls===cur&&x.day===d[0]}),box=h("div",{class:"notes"});
    list.forEach(function(x){
      var ex=x.type==="exam";
      var el=h("div",{class:"nt "+(ex?"ex":"hw")},[h("span",{class:"tag",text:ex?"امتحان":"تکلیف"}),h("b",{class:ex?"":"hl",text:x.subject}),h("span",{text:x.text||""})]);
      if(isA||(S.me.role==="teacher"&&x.author===S.me.id))el.appendChild(h("button",{text:"حذف","aria-label":"حذف "+x.subject,on:{click:function(e){sure(e.currentTarget,function(){act(api("DELETE","/api/items/"+x.id))})}}}));
      box.appendChild(el)});
    if(!list.length)box.appendChild(h("span",{class:"empty",text:"امتحان یا تکلیفی ثبت نشده"}));
    col.appendChild(box);wk.appendChild(col)});
  return wk;
}
function itemForm(app){
  var day=h("select",{"aria-label":"روز"},DAYS.map(function(d){return h("option",{value:d[0],text:d[1]})}));
  var type=h("select",{"aria-label":"نوع"},[h("option",{value:"exam",text:"امتحان"}),h("option",{value:"hw",text:"تکلیف"})]);
  var sub=h("input",{placeholder:"درس","aria-label":"درس"}),txt=h("textarea",{placeholder:"توضیحات","aria-label":"توضیحات"});
  var b=h("button",{text:"ثبت برای این کلاس",on:{click:function(){if(!sub.value.trim())return;act(api("POST","/api/items",{cls:cur,day:day.value,type:type.value,subject:sub.value,text:txt.value}))}}});
  app.appendChild(h("div",{class:"card"},[h("b",{text:"ثبت امتحان یا تکلیف"}),h("div",{class:"form"},[day,type,sub,txt,b])]));
}
function usersView(app){
  var rows=[h("tr",{},["نام کاربری","نقش","کلاس","عملیات"].map(function(t){return h("th",{text:t})}))];
  S.users.forEach(function(u){
    var act2=h("td",{},[h("button",{class:"ghost",text:"رمز جدید",on:{click:function(){api("POST","/api/users/"+u.id+"/reset").then(function(r){showPw("رمز جدید "+u.username+": "+r.password+" (فقط همین یک بار نمایش داده می‌شود)")}).catch(function(e){msg="خطا: "+e.message;render()})}}})]);
    if(u.id!==S.me.id)act2.appendChild(h("button",{class:"ghost",text:"حذف",on:{click:function(e){sure(e.currentTarget,function(){act(api("DELETE","/api/users/"+u.id))})}}}));
    rows.push(h("tr",{},[h("td",{text:u.username}),h("td",{text:RN[u.role]}),h("td",{text:u.role==="student"&&byId(u.cls)?byId(u.cls).name:"—"}),act2]))});
  var un=h("input",{placeholder:"نام کاربری","aria-label":"نام کاربری جدید"}),pw=h("input",{placeholder:"رمز (خالی = ساخت خودکار)","aria-label":"رمز"});
  var ck=h("input",{type:"checkbox"});
  var lab=h("label",{class:"full"},[ck,h("span",{text:" تأیید می‌کنم کاربر (برای دانش‌آموز: ولی او) از "}),h("a",{href:"#privacy",text:"سیاست حریم خصوصی"}),h("span",{text:" مطلع شده است."})]);
  var role=h("select",{"aria-label":"نقش"},Object.keys(RN).map(function(r){return h("option",{value:r,text:RN[r]})}));
  var cl=h("select",{"aria-label":"کلاس دانش‌آموز"},[h("option",{value:"",text:"کلاس (برای دانش‌آموز)"})].concat(sorted().map(function(c){return h("option",{value:c.id,text:c.name})})));
  var add=h("button",{text:"افزودن کاربر",on:{click:function(){
    if(!un.value.trim())return;
    if(!ck.checked)return warn("ابتدا تیک تأیید اطلاع‌رسانی حریم خصوصی را بزنید.");
    if(role.value==="student"&&!cl.value)return warn("برای دانش‌آموز کلاس را انتخاب کنید.");
    api("POST","/api/users",{username:un.value,password:pw.value,role:role.value,cls:cl.value}).then(function(r){var nn=un.value.trim();return load().then(function(){showPw("رمز "+nn+": "+r.password+" (فقط همین یک بار نمایش داده می‌شود)")})}).catch(function(e){msg="خطا: "+e.message;render()})}}});
  app.appendChild(h("h2",{text:"مدیریت کاربران"}));
  app.appendChild(h("div",{class:"card"},[h("div",{class:"scroll"},[h("table",{},rows)]),h("div",{class:"form mt"},[un,pw,role,cl,lab,add])]));
}
function authForm(app,title,btn,url,hint){
  var u=h("input",{placeholder:"نام کاربری","aria-label":"نام کاربری",autocomplete:"username"}),p=h("input",{type:"password",placeholder:"رمز عبور","aria-label":"رمز عبور",autocomplete:url==="/api/setup"?"new-password":"current-password"});
  var go=h("button",{text:btn,on:{click:function(){act(api("POST",url,{username:u.value,password:p.value}))}}});
  app.appendChild(h("div",{class:"card"},[h("b",{text:title}),hint?h("p",{class:"note",text:hint}):h("span"),h("div",{class:"form"},[u,p,go])]));
}
function loginView(app){authForm(app,"ورود","ورود","/api/login")}
function setupView(app){authForm(app,"راه‌اندازی اولیه: حساب مدیر را بسازید","ساخت حساب مدیر","/api/setup","رمز حداقل ۸ نویسه باشد.")}
window.addEventListener("hashchange",render);
load().catch(function(e){msg="خطا: "+e.message;render()});
setInterval(function(){var a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;load().catch(function(){})},30000);
