(()=>{"use strict";var n,i,o=".tail.rs",e=(...e)=>t=>t?.type&&e.some(e=>e===t?.type),V=e=>e&&"string"==typeof e.type,W=e("VIEW"),l=e("VIEW_ENDED"),B=e("CONSENT"),u=e=>e?.toLowerCase().replace(/[^a-zA-Z0-9:.-]/g,"_").split(":").filter(e=>e)??[],f=(e,t,i)=>{if(!e)return[];if(Array.isArray(e)&&(e=e.join(",")),/(?<!(?<!\\)\\)%[A-Z0-9]{2}/.test(e))try{e=decodeURIComponent(e.replace(/([^=&]+)(?:\=([^&]+))?(&|$)/g,(e,t,r,n)=>[t,r&&`="${r.replace(/(?<!(?<!\\)\\)("|%22)/g,'\\"')}"`,n&&","].join("")))}catch{}var o,s=[],l=u(t);return e.replace(/\s*(\s*(?=\=)|(?:\\.|[^,=\r\n])+)\s*(?:\=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|((?:\\.|[^,])*)))?\s*(?:[,\s]+|$)/g,(e,t,r,n,a)=>{r=r||n||a,n=u(t);return l.length&&(1===n.length&&(r=r||n.pop()),n=l.concat(n)),n.length&&(s.push(o={ranks:n,value:r||void 0}),i?.add(null==(a=o)?a:""+a.ranks.join(":")+(a.value?"="+a.value.replace(/,/g,"\\,"):""))),""}),s},w=void 0,A=null,T=!0,E=!1,d=Object.fromEntries,L=Object.assign,H=setTimeout,G=parseInt,K=Number.MAX_SAFE_INTEGER,X="undefined"==typeof window,x=window,h=document,Z=navigator,J=h.body,k=location,Y=performance,b=(e,t,r)=>console.error(...R([e??r?.message??r??"error",t,r])),a=(e,t=0)=>(se(t)?--t:t)<0?e:(t=Math.pow(10,t),Math.round(e*t)/t),Q=e=>e==A?A:decodeURIComponent(e),ee=e=>e==A?A:encodeURIComponent(e),te={},re=(t,...e)=>e.some(t==A?e=>e==A:e=>t===e),ne=e=>e?.toLowerCase()??e,ae=(e,t,r=null)=>e&&t?e+" "+t:(e||t)??r,ie=["s","b","n","f","o"],oe=(e,t)=>5===e?Array.isArray(t):t!=A&&ie[e]===(typeof t)[0]||6===e&&t.exec,e=(n,a)=>(e,t,...r)=>void 0===t?oe(n,e):oe(n,e)?e:t?a?.(e,t,...r):void 0,se=e(1,e=>"0"!==e&&"false"!==e&&"no"!==e&&!!e),I=e(0,e=>e?.toString()),S=e(3,e=>{}),le=e(4),N=e(5,e=>ce(e)?[...e]:void 0),ce=e=>e&&!I(e)&&!!e[Symbol.iterator],ue=(e,r=e=>e)=>(e?.sort((e,t)=>r(e)-r(t)),e),fe=(e,t,r,...n)=>e&&(r!=A?e.splice(t,r,...n):e.splice(t)),de=(e,...t)=>(e?.unshift(...t),e),ge=e=>e?.shift(),C=(e,...t)=>(e?.push(...t),e),he=(...e)=>U(e=R(e))<2?M(e[0]):[].concat(...M(e,M)),U=e=>e==A?0:e.length??e.size??(le(e)?me(e).length:0),O=(e,r)=>e?N(e)?M(e,(e,t)=>r?r(t,e):[t,e]):M(e.entries?.()??Object.entries(e),r):[],me=(e,t)=>e?M(e.keys?.()??Object.keys(e),t):[],pe=(e,t)=>e?M(e.values?.()??Object.values(e),t):[],g=(e,t,r)=>{if(ye!=A&&U(ce(e)?e:e=[e])){var n,a=(...e)=>(i=0,U(e)?e[0]:r),i=0;for(n of e)if(r=t(n,i++,a,r),!i)break}return r},M=(e,r)=>e==A?[]:S(r)?M(e,E).map((e,t)=>r(e,t)):N(e)&&!r?e:ce(e)?[...e]:[e],ve=(e,r=e=>e)=>e==A?[]:R(M(e,E)).flatMap((e,t)=>r(e,t)),ye=(e,t=0)=>e==A?void 0:((e=null==e.length?M(e):e).item,e[t<0?e.length+t:t]),R=(e,r,t=se(r)||E)=>(e=M(e).filter((e,t)=>(S(r,!0)??(e=>e!=A))(e,t)),t&&!U(e)?A:e),we=(e,n=e=>e!=A&&e!==E)=>e!=A&&(ce(e)||(e=[e]))&&(n?g(e,(e,t,r)=>n(e,t)&&r(T),E):!!U(e)),$=e=>new Set(e),be=(t,...e)=>(t!=A&&(t.clear?t.clear(...e):N(t)?t.length=0:me(t,e=>D(t,e))),t),m=(e,t)=>e.get?.(t)??e?.has(t)??e?.[t],D=(t,e)=>t?N(e)?(g(e,e=>t.delete?.(e)??delete t[e]),t):null!=(n=t.has?.(e))?n?(n=t.get?.(e),t.delete(e),n??T):void 0:(n=t[e],delete t[e],n):void 0,Ae=(e,t,r=void 0)=>e.add?(n=e.has(t))===(r??=T)?E:(r?e.add(t):D(e,t),T):(n=e.get?.(t)??e[t],(r=S(r)?r(n):r)===n?E:(void 0===r?D(e,t):e.set?.(t,r)??(e[t]=r),T)),Te=(e,t,r)=>e.has?.(t)?e.get?.(t):(n=r(t),e.set?.(t,n)?n:e[t]??=r(t)),Ee=(e,t,r)=>r?L(Ee(e,t),r):t?d(R(O(e,t))):e,xe=(...e)=>e.length?new Promise(e[0]):Promise.resolve(),ke=Symbol(),Ie=Symbol(),Se=e=>{var n=A,t=A,a=w,r=()=>{a=w;var r=A;t=xe(t=>{n=r=e=>r&&(r=A,t(a=e))}),e&&lt(e).then(()=>r?.(Ie))},i=(r(),L((...e)=>U(e)?(e[0]===ke?e[1]===T&&a===w||r():n(e[0]),i):a,{then:(...e)=>t.then(...e)}));return i},Ne=(e,t,r,n)=>e&&t&&(r?(N(n)?Ne(e,t,(...e)=>(i=r(...e))!=A&&C(n,i)):e.replace(t,(...e)=>(n=r(...e),"")),n):e.match(t)),Ce=e=>e.replace(/[\^$\\.*+?()[\]{}|]/g,"\\$&"),Ue=/\z./g,Oe=(e,t)=>{return(t=$e((e=[R(e,U)],M($(R(he(...e))))),"|"))?new RegExp(t,"gu"):Ue},Me={},Re=e(6,(e,n=[","," "])=>Re(e)?e:N(e)?Oe(M(e,e=>Re(e,!1,n)?.source)):se(e)?e?/./g:Ue:I(e)?Me[e]??=Ne(e||"",/^(?:\/(.+?)\/?|(.*))$/gu,(e,t,r)=>t?new RegExp(t,"gu"):Oe(M(p(r,new RegExp(`?<!(?<!\\)\\)[${$e(M(n,Ce))}]/`)),e=>e&&`^${$e(M(p(e,/(?<!(?<!\\)\\)\*/),e=>Ce(v(e,/\\(.)/g,"$1"))),".*")}$`))):w),p=(e,t)=>e?.split(t)??e,v=(e,t,r)=>e?.replace(t,r)??e,$e=(e,t="")=>e?.join(t)??e,De=e=>void 0===e,Fe=Array.isArray,_e=e=>e&&"object"==typeof e,qe=e=>"symbol"==typeof e,je=e=>e?.[Symbol.iterator]&&!("string"==typeof e),ze=[],Pe=[],Ve=(e,t=0)=>e.charCodeAt(t);[..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"].forEach((e,t)=>ze[Pe[t]=e.charCodeAt(0)]=t);var We={32:[0x811c9dc5n,0x01000193n],64:[0xcbf29ce484222325n,0x100000001b3n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},Be=(e=256)=>e*Math.random()|0,e={exports:{}};function Le(e,i){if(i&&i.multiple&&!Array.isArray(e))throw new Error("Invalid argument type: Expected an Array to serialize multiple values.");var o,s,l=4294967296,n=new Uint8Array(128),a=0;if(i&&i.multiple)for(var t=0;t<e.length;t++)c(e[t]);else c(e);return n.subarray(0,a);function c(e,t){switch(typeof e){case"undefined":u();break;case"boolean":d(e?195:194);break;case"number":n=e,isFinite(n)&&Math.floor(n)===n?!(n<0||127<n)||n<0&&-32<=n?d(n):0<n&&n<=255?g([204,n]):n<-128||127<n?0<n&&n<=65535?g([205,n>>>8,n]):n<-32768||32767<n?0<n&&n<=4294967295?g([206,n>>>24,n>>>16,n>>>8,n]):n<-2147483648||2147483647<n?0<n&&n<=0x10000000000000000?g([211,(a=n/l)>>>24,a>>>16,a>>>8,a,(a=n%l)>>>24,a>>>16,a>>>8,a]):n<-0x8000000000000000||0x8000000000000000<n?g(n<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):(d(211),h(n)):g([210,n>>>24,n>>>16,n>>>8,n]):g([209,n>>>8,n]):g([208,n]):(s||(o=new ArrayBuffer(8),s=new DataView(o)),s.setFloat64(0,n),d(203),g(new Uint8Array(o)));break;case"string":31<(n=(a=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128)i[a++]=s;else{if(s<2048)i[a++]=s>>6|192;else{if(55295<s&&s<56320){if(++o>=r)throw new Error("UTF-8 encode: incomplete surrogate pair");var l=e.charCodeAt(o);if(l<56320||57343<l)throw new Error("UTF-8 encode: second surrogate character 0x"+l.toString(16)+" at index "+o+" out of range");i[a++]=(s=65536+((1023&s)<<10)+(1023&l))>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}}return t?i:i.subarray(0,a)})(e)).length)?g(255<n?65535<n?[219,n>>>24,n>>>16,n>>>8,n]:[218,n>>>8,n]:[217,n]):d(160+n),g(a);break;case"object":null===e?u():e instanceof Date?(a=(n=e).getTime()/1e3,0===n.getMilliseconds()&&0<=a&&a<4294967296?g([214,255,a>>>24,a>>>16,a>>>8,a]):0<=a&&a<17179869184?g([215,255,(r=1e6*n.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|a/l,a>>>24,a>>>16,a>>>8,a]):(g([199,12,255,(r=1e6*n.getMilliseconds())>>>24,r>>>16,r>>>8,r]),h(a))):Array.isArray(e)?f(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?(g(15<(r=(n=e).length)?65535<r?[198,r>>>24,r>>>16,r>>>8,r]:[197,r>>>8,r]:[196,r]),g(n)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?f:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in 15<r?g(65535<r?[223,r>>>24,r>>>16,r>>>8,r]:[222,r>>>8,r]):d(128+r),e){var n=e[t];void 0!==n&&(c(t),c(n))}})(e);break;default:if(t||!i||!i.invalidTypeReplacement)throw new Error("Invalid argument type: The type '"+typeof e+"' cannot be serialized.");"function"==typeof i.invalidTypeReplacement?c(i.invalidTypeReplacement(e),!0):c(i.invalidTypeReplacement,!0)}var r,n,a}function u(){d(192)}function f(e){var t=e.length;15<t?g(65535<t?[221,t>>>24,t>>>16,t>>>8,t]:[220,t>>>8,t]):d(144+t);for(var r=0;r<t;r++)c(e[r])}function d(e){if(n.length<a+1){for(var t=2*n.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(n),n=r}n[a]=e,a++}function g(e){if(n.length<a+e.length){for(var t=2*n.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(n),n=r}n.set(e,a),a+=e.length}function h(e){var t,e=e<0?(e++,t=~(Math.abs(e)/l),~(Math.abs(e)%l)):(t=e/l,e%l);g([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function He(s,e){var t,a=4294967296,l=0;if("object"!=typeof(s=s instanceof ArrayBuffer?new Uint8Array(s):s)||void 0===s.length)throw new Error("Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.");if(!s.length)throw new Error("Invalid argument: The byte array to deserialize is empty.");if(s instanceof Uint8Array||(s=new Uint8Array(s)),e&&e.multiple)for(t=[];l<s.length;)t.push(n());else t=n();return t;function n(){var e=s[l++];if(0<=e&&e<=127)return e;if(128<=e&&e<=143)return u(e-128);if(144<=e&&e<=159)return f(e-144);if(160<=e&&e<=191)return d(e-160);if(192===e)return null;if(193===e)throw new Error("Invalid byte code 0xc1 found.");if(194===e)return!1;if(195===e)return!0;if(196===e)return o(-1,1);if(197===e)return o(-1,2);if(198===e)return o(-1,4);if(199===e)return g(-1,1);if(200===e)return g(-1,2);if(201===e)return g(-1,4);if(202===e)return r(4);if(203===e)return r(8);if(204===e)return c(1);if(205===e)return c(2);if(206===e)return c(4);if(207===e)return c(8);if(208===e)return i(1);if(209===e)return i(2);if(210===e)return i(4);if(211===e)return i(8);if(212===e)return g(1);if(213===e)return g(2);if(214===e)return g(4);if(215===e)return g(8);if(216===e)return g(16);if(217===e)return d(-1,1);if(218===e)return d(-1,2);if(219===e)return d(-1,4);if(220===e)return f(-1,2);if(221===e)return f(-1,4);if(222===e)return u(-1,2);if(223===e)return u(-1,4);if(224<=e&&e<=255)return e-256;throw console.debug("msgpack array:",s),new Error("Invalid byte value '"+e+"' at index "+(l-1)+" in the MessagePack binary data (length "+s.length+"): Expecting a range of 0 to 255. This is not a byte array.")}function i(e){for(var t,r=0,n=!0;0<e--;)n?(r+=127&(t=s[l++]),128&t&&(r-=128),n=!1):r=(r*=256)+s[l++];return r}function c(e){for(var t=0;0<e--;)t=256*t+s[l++];return t}function r(e){var t=new DataView(s.buffer,l+s.byteOffset,e);return l+=e,4===e?t.getFloat32(0,!1):8===e?t.getFloat64(0,!1):void 0}function o(e,t){e<0&&(e=c(t));t=s.subarray(l,l+e);return l+=e,t}function u(e,t){e<0&&(e=c(t));for(var r={};0<e--;)r[n()]=n();return r}function f(e,t){e<0&&(e=c(t));for(var r=[];0<e--;)r.push(n());return r}function d(e,t){e<0&&(e=c(t));var t=l,r=(l+=e,s),n=e,a=t,i="";for(n+=t;a<n;){var o=r[a++];if(127<o)if(191<o&&o<224){if(n<=a)throw new Error("UTF-8 decode: incomplete 2-byte sequence");o=(31&o)<<6|63&r[a++]}else if(223<o&&o<240){if(n<=a+1)throw new Error("UTF-8 decode: incomplete 3-byte sequence");o=(15&o)<<12|(63&r[a++])<<6|63&r[a++]}else{if(o<=239||248<=o)throw new Error("UTF-8 decode: unknown multibyte start 0x"+o.toString(16)+" at index "+(a-1));if(n<=a+2)throw new Error("UTF-8 decode: incomplete 4-byte sequence");o=(7&o)<<18|(63&r[a++])<<12|(63&r[a++])<<6|63&r[a++]}if(65535<o){if(1114111<o)throw new Error("UTF-8 decode: code point 0x"+o.toString(16)+" exceeds UTF-16 reach");o-=65536,i=(i+=String.fromCharCode(o>>10|55296))+String.fromCharCode(1023&o|56320)}else i+=String.fromCharCode(o)}return i}function g(e,t){e<0&&(e=c(t));var r,n,t=c(1),e=o(e);if(255!==t)return{type:t,data:e};t=e;if(4===t.length)return n=(t[0]<<24>>>0)+(t[1]<<16>>>0)+(t[2]<<8>>>0)+t[3],new Date(1e3*n);if(8===t.length)return r=(t[0]<<22>>>0)+(t[1]<<14>>>0)+(t[2]<<6>>>0)+(t[3]>>>2),n=(3&t[3])*a+(t[4]<<24>>>0)+(t[5]<<16>>>0)+(t[6]<<8>>>0)+t[7],new Date(1e3*n+r/1e6);if(12===t.length)return r=(t[0]<<24>>>0)+(t[1]<<16>>>0)+(t[2]<<8>>>0)+t[3],l-=8,n=i(8),new Date(1e3*n+r/1e6);throw new Error("Invalid data length for a date value.")}}e.exports={serialize:Le,deserialize:He,encode:Le,decode:He};var Ge,Ke,Xe,Ze,Je,Ye,Qe=e.exports,et=new ArrayBuffer(8),tt=new DataView(et),rt=e=>{var[d,r,n]=(e=>{for(var t,n,r,a,i,o=0n,s=0n,l=[],c=0,u=0,f=0,d=0,g=[],f=0;f<e.length;d+=g[f]=Ve(e,f++));var h=e?()=>{l=[...g],u=255&(c=d),f=-1}:()=>{},m=e=>(u=255&(c+=-l[f=(f+1)%l.length]+(l[f]=e)),e);return[e?e=>{for(h(),t=e.length,a=16-(t+4)%16,i=new Uint8Array(4+t+a),r=0;r<3;i[r++]=m(Be()));for(i[r++]=m(u^16*Be(16)+a),n=0;n<t;i[r++]=m(u^e[n++]));for(;a--;)i[r++]=Be();return i}:e=>e,e?e=>{for(h(),n=0;n<3;m(e[n++]));if((t=e.length-4-((u^m(e[n++]))%16||16))<=0)return new Uint8Array(0);for(i=new Uint8Array(t),r=0;r<t;i[r++]=u^m(e[n++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;var r="boolean"==typeof t?64:t;for(h(),[o,s]=We[r],n=0;n<e.length;o=BigInt.asUintN(r,(o^BigInt(u^m(e[n++])))*s));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]})(e??"");return[e=>{for(var t,r,n,a,i,o,s,l=(d((i=(e,t,r=e[t],n=s(r))=>(r===n&&!qe(t)||(e[t]=n,o(()=>e[t]=r)),r),o=e=>(r??=[]).push(e),s=r=>null===r||De(r)||"function"==typeof r||qe(r)?null:Number.isFinite(r)&&!Number.isSafeInteger(r)?(tt.setFloat64(0,r,!0),{"":[...new Uint32Array(et)]}):_e(r)?r.toJSON&&r!==(r=r.toJSON())?s(r):(a=(n??=new Map).get(r),De(a)?(_e(r)&&!je(r)?(n.set(r,n.size+1),Object.keys(r).forEach(e=>(De(i(r,e))||qe(e))&&delete r[e])):je(r)&&(!Fe(r)||Object.keys(r).length<r.length?[...r]:r).forEach((e,t)=>t in r?i(r,t):(r[t]=null,o(()=>delete r[t]))),r):(r.$ref||(r.$ref=a,o(()=>delete r.$ref)),{$ref:a})):r,e=Qe.serialize(s(e)),r?.forEach(e=>e()),e))),c=0,u=l.length,f=[];c<u;)t=l[c++]<<16|l[c++]<<8|l[c++],f.push(Pe[(16515072&t)>>18],Pe[(258048&t)>>12],Pe[(4032&t)>>6],Pe[63&t]);return f.length+=u-c,String.fromCharCode(...f)},e=>{if(null==e)return null;if(e=r((e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);r<a;)i[n++]=ze[Ve(e,r++)]<<2|(t=ze[Ve(e,r++)])>>4,r<a&&(i[n++]=(15&t)<<4|(t=ze[Ve(e,r++)])>>2,r<a)&&(i[n++]=(3&t)<<6|ze[Ve(e,r++)]);return i})(e)),a=r=>_e(r)?Fe(r[""])&&2===(r=r[""]).length?new DataView(new Uint32Array(r).buffer).getFloat64(0,!0):r.$ref&&(n=(t??=[])[r.$ref])?n:(r.$ref&&delete(t[r.$ref]=r).$ref,Object.entries(r).forEach(([e,t])=>t!==(t=a(t))&&(r[e]=t)),r):r,null==e)return e;try{return a(Qe.deserialize(e))}catch(e){}var t,n,a},(e,t)=>n(Qe.serialize(e),t)]},[nt,,,]=rt(),[at,it]=rt(),[ot,st]=[null,null],F=(e=T,t)=>(t=X?Date.now():Y.timeOrigin+Y.now(),e?Math.trunc(t):t),lt=t=>xe(e=>H(e,t)),_=(e,t)=>{var n=0,r=e,a=null,i=()=>(r=w,n<0?clearInterval(-n):clearTimeout(n),n=0),o=(e,t)=>{i(),e&&(r=e,n=t<0?-setInterval(e,-t):H(()=>(r=w,e()),t))};return o.clear=(e,t,r=n)=>n&&(e?H(()=>n===r&&(i(),t?.()),e):(i(),t?.())),o.wait=t=>xe(e=>o(e,t)),o.pulse=()=>(r?.(),o),o.isActive=()=>r!=A,o.finish=()=>(a=r)&&(i(),a()),e&&o(e,t),o},ct=(t=()=>F(),e=T)=>{var r=0,n=e?t():0,e=e=>(n?r+=-n+(n=t()):e===T&&(n=t()),e===E&&(n=0),r);return e.reset=()=>(n=n&&t(),r=0),e},ut=(e,t=0)=>t?H(e,t):window.queueMicrotask(e),ft=e=>crypto.getRandomValues(e),dt=e=>(ft(e=new Uint32Array(2)),1048576*e[0]+(e[1]>>>12)),gt=new Uint32Array(2),ht=()=>dt(gt).toString(36),mt=(e,t)=>e.localeCompare(t,"en")<0?e:t,c=F().toString(36)+"-"+dt().toString(36),q={name:"tail",src:"/_t.js",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,heartbeatFrequency:0,clientKey:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:"auto",tags:{default:["data-id","data-name"]}},pt=K,vt=(e,t,r=(e,t)=>pt<=t)=>{for(var n,a=0,i=E;1===e?.nodeType&&!r(e,a++)&&t(e,(e,t)=>(e!=A&&(n=e,i=t!==T&&n!=A),T),a-1)!==E&&!i;){var o=e;(e=e.parentElement)===A&&o?.ownerDocument!==h&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},yt=(e,r)=>vt(e,(e,t)=>t(j(e,r))),j=(e,t,r)=>e?.getAttribute?r===w?e.getAttribute(t):(r===A?e.removeAttribute(t):e.setAttribute(t,r),r):A,wt=(e,t)=>getComputedStyle(e).getPropertyValue(t)||A,bt=(e,t)=>(Ge={},M(R(O(t),([,e])=>e!=A),([e,[t,r=E]=[]])=>Ge[e]={writable:r,configurable:r,value:t}),Object.defineProperties(e,Ge)),At=e=>e!=A?e.tagName:A,Tt=e=>({x:a(scrollX,e),y:a(scrollY,e)}),Et=(e,t)=>v(e,/#.*$/,"")===v(t,/#.*$/,""),xt=(e,t,r=T)=>(Xe=kt(e,t))&&{xpx:Xe.x,ypx:Xe.y,x:a(Xe.x/J.offsetWidth,4),y:a(Xe.y/J.offsetHeight,4),pageFolds:r?Xe.y/x.innerHeight:w},kt=(e,t)=>t?.pointerType&&t?.pageY!=A?{x:t.pageX,y:t.pageY}:e?({x:Ze,y:Je}=It(e),{x:Ze,y:Je}):w,It=e=>e?(Ye=e.getBoundingClientRect(),Ke=Tt(E),{x:a(Ye.left+Ke.x),y:a(Ye.top+Ke.y),width:a(Ye.width),height:a(Ye.height)}):w,z=(n,e,a,i=T,o=T)=>{var s=[];return M(e,(e,t)=>{var r=e=>{a(e,s[t])};return C(s,()=>n.removeEventListener(e,r,i)),n.addEventListener(e,r,{capture:i,passive:o})}),()=>0<s.length&&M(s,e=>e())?(s=[],T):E},St=n=>n==A?w:Ne(n,/^(?:([a-zA-Z0-9]+):)?(?:\/\/)?([^\s\/]*)/,(e,t,r)=>r?{href:n.substring(e.length),domain:{protocol:t,domainName:r}}:{href:n}),Nt=()=>({...Ke=Tt(T),width:x.innerWidth,height:x.innerHeight,totalWidth:J.offsetWidth,totalHeight:J.offsetHeight}),Ct=(e,t=e=>b(A,A,e),r)=>{var n=z(x,"error",e=>e.stopImmediatePropagation());try{return e()}catch(e){return t===E?w:S(t)?t(e):(C(t,e)??b(A,A,e),w)}finally{n(),r?.()}},e=p(""+h.currentScript.src,"#"),t=p(""+(e[1]||""),";"),Ut=e[0],Ot=t[1]||St(Ut)?.domain?.domainName,Mt=e=>!(!Ot||St(e)?.domain?.domainName.endsWith(Ot)!==T),Rt=(...e)=>v($e(e),/(^(?=\?))|(^\.(?=\/))/,Ut.split("?")[0]),$t=Rt("?","var"),Dt=Rt("?","mnt"),e=(Rt("?","usr"),(t=!1)=>{var r=$(),n=e=>()=>D(r,e),a=null;return[e=>(t&&a?e(...a,()=>{}):Ae(r,e),n(e)),(...t)=>g(r,e=>{e(...a=t,n(e))})]}),Ft=Se(),[t,_t]=e(!0);t(()=>Ft(!0));var qt,jt,zt,Pt,Vt,Wt,Bt,Lt,Ht=new WeakMap(void 0),Gt=e=>m(Ht,e),Kt=(e,t=E)=>(t?"--track-":"track-")+e,Xt=(o,e,t,r,n,s)=>e?.[1]&&g(o?.getAttributeNames(),i=>e[0][i]??=(s=E,!I(r=g(e[1],([e,t,r],n,a)=>!(!i||!e)&&e.test(i)&&(s=void 0,!t||!!o?.matches(t))&&a(r??i)))||(n=o.getAttribute(i))&&!se(n,!1)||f(n,v(r,/\-/g,":"),t),s)),Zt=()=>{},Jt=(e,t)=>ae(wt(e,Kt(t,T)),wt(e,Kt("base-"+t,T)),""),Yt={},Qt=(e,r,t=E,n)=>(t?vt(e,(e,t)=>t(Qt(e,r,E)),S(t,E)):ae(j(e,Kt(r)),wt(e,Kt(r,T))))??(n&&(jt=Gt(e))&&n(jt))??A,er=(e,t,r=E,n)=>""===(zt=Qt(e,t,r,n))||(zt==A?zt:se(zt,T)),tr=(e,t,i,o)=>e&&(((e,t,r=Jt(e,"attributes"))=>{Xt(e,Yt[r]??=[{},R(Ne(r,/(?:(\S+)\:\s*)?(?:\((\S+)\)|([^\s,:]+))\s*(?!\S*\:)/g,(e,t,r,n)=>[Re(r||n,!1),,t],[]),T)],t),f(Jt(e,"tags"),void 0,t)})(e,o??=$()),vt(e,e=>{var t,r,n=e,a=o;(qt===(qt=q.tags)?Zt:(r=[{},[[/^(?:track\-)?tags?(?:$|\-)(.*)/],...(t=e=>e?Re(e)?[[e]]:ce(e)?ve(e,t):[le(e)?[Re(e.match,!1),e.selector,e.prefix]:[Re(e,!1)]]:[])(pe(qt))]],Zt=(e,t)=>Xt(e,r,t)))(n,a),f(M(i?.(e)),void 0,o)},t),U(o))?{tags:[...o]}:{},rr=(e,t,r=!1)=>e?(Pt=(r?st:it)(e)).$?0<(Vt=+((Pt=Pt.$)[1]??0))&&Vt<F(E)?(t?.(),A):[Pt[0],Vt,Pt[2]]:[Pt]:A,r=(u,f,d)=>{var g=f?c:w,h=e=>()=>e&&u.removeItem(e),m=new Set,p=Object.assign((e,t,r)=>{var n,a,i,o,s,l,c;return S(e)?f?([n,l=E]=[e,t],a=(...e)=>n(...e)===E&&o?.(),o=()=>(o=A,f(i,T),m.delete(a)),f(i=({key:e,newValue:t,oldValue:r})=>(Wt=rr(t,h(e),d),Bt=rr(r,w,d),e&&a(e,Wt?.[0]??A,Bt?.[0]??A,Wt?.[2]??A))),l&&m.add(a),o):void 0:([s,l,e=0]=[e,t,r],l===w?rr(u.getItem(s),h(s),d)?.[0]??A:S(l)?p(s,l(p(s)),e):((c=l==A||e<0||([t,r,c=!1]=[l,e&&!u.supportsExpiry?F(T)+e:w,d],t==A)?A:(c?ot:at)(g||r?{$:[t,r,g]}:t))==A?u?.removeItem(s):u?.setItem(s,c,0<e?e:w),m.size&&(Wt=rr(c,w,d),Bt=rr(u.getItem(s),w,d),m.forEach(e=>e(s,Wt?.[0]??A,Bt?.[0]??A,Wt?.[2]??A))),l))});return p},nr={getItem:t=>(t=ee(t),Q(document.cookie.split(";").map(e=>e.split("=")).find(e=>e[0].trim()===t)?.[1]||A)),setItem:(e,t,r)=>document.cookie=`${ee(e)}=${ee(t??"")}; Path=/; SameSite=Lax`+(t&&r==A?"":"; Max-Age="+Math.round((r??0)/1e3)),removeItem:e=>nr.setItem(e,"",0),supportsExpiry:!0};r((Lt={},{getItem:e=>Lt[e],setItem:(e,t)=>Lt[e]=t,removeItem:e=>delete Lt[e]}));var ar,ir=r(nr),or=r(nr,w,!0),sr=r(sessionStorage),lr=r(localStorage,(e,t)=>t?window.removeEventListener("storage",e):window.addEventListener("storage",e),!0),r=(r,n,i)=>{var o=r="(t~c_"+r,s=e=>r+"!"+e,l=s(c),e=(a,...e)=>{var t=T;if(S(a))return lr((e,t,r,n)=>{if(t!=A&&n&&(e===o||e===l))return a(t,n,e===l)!==E},(e[0]??i)===T);e=R(e),M(U(e)?M(e,s):[r],e=>{t=E,lr(e,a),ut(()=>t!==(t=T)&&lr(e,A))})};return n&&e((e,t,r)=>n[ge(e)]?.([t,r,t===c],...e)),e},cr=Symbol(),ur=$(),fr=new Map(void 0),dr=e=>!we(e[cr],e=>!m(ur,e)),gr=r("ss"),hr={},[mr,pr]=e(!0),vr=E,yr=_(),wr=(t,e,r)=>(hr[t]?b("key",t):hr[t]=[e,r],e=>gr({[t]:e})),br=(t(()=>{yr(()=>(vr=T,pr()),75);var t=E;gr((r,e)=>1===r?gr(2,e):2===r?(t!==(t=T)&&gr(3,e),T):3===r?gr(d(O(hr,([e,[t]])=>[e,t()])),e):(O(hr,([e,[,t]])=>t(r[e])),yr.finish())),gr(1),z(window,"pageshow",()=>!t&&gr(1)),z(window,"pagehide",()=>t=E)}),{}),Ar={},Tr={},Er=()=>{var e=Tr;return Tr={},e},xr={},kr=e=>xr[e]??=[[],Se(2*q.requestTimeout)([T,0])],Ir=r=>O(br,([e,t])=>t&&Date.now()-t>r&&D(br,e)),Sr=()=>{return[t,...e]=[c,...me(br)],0===e.length?t:1===e.length?mt(t,e[0]):(r=(e,t)=>mt(t,e),t=t,M(e).reduce((e,t)=>r(e,t),t));var e,r,t},s=r("cs",{1([e,t]){br[e]??=A,t||e===c||Cr||s([1],e)},2([e],t,r){br[e]=Date.now(),O(r,([e,t])=>Nr(e,t)),t||me(Ar,e=>!we(pe(br),e=>!e)&&Sr()===c&&s([5,e,c,T]))},3(e,t){O(t,([e,t])=>Nr(e,t))},4(e,t){Rr(t)},5(e,r,t,n){var[a,i]=kr(r),o=fe(a,0);c===t&&(async()=>{var e=U(o),t=!e||(await(async e=>{try{return await(S(e)?e():e)}catch(e){return console.error(e),await(S(void 0)?(void 0)(e):e)}finally{await 0}})(Ar[r]?.[0](o,n))??T);t||s([3,{[r]:o}]),i([t,e])})()},6:([e])=>(Ir(0),Fr(e)),7:()=>Fr(A)},T),Nr=(e,t)=>C(kr(e)[0],...t),Cr=T,Ur=A,Or=async()=>{if(await Ur,Cr!==(Cr=E)){Ur=Se();try{be(br),s([1]),await lt(50)}finally{Ur(T)}}},Mr=async e=>{Cr!==(Cr=T)&&(pe(Ar,e=>e[1]?.(T)),s([2,e,Er()]),jr(E))},Rr=async e=>{var t;return await Ur,Cr?0:(t=Sr())!==c?(s([4,e],t),0):(t=kr(e)[1],F(E),await t,t(ke),s([5,e,c,E]),(await t)[1])},$r=K,Dr=A,Fr=e=>$r=(Dr=e??=Sr())===c?Math.min($r,F()+25):K,_r=()=>Ur?.()===T&&(Ir(500),F()>$r),qr=E,jr=e=>qr!==(qr=e)&&e?s([6]):!e&&c===Dr&&s([7]),zr=(t(()=>{z(x,"pageshow",()=>Or()),z(document,"resume",()=>Or()),Or(),z(x,["beforeunload","pagehide"],()=>Mr(E)),z(document,"freeze",()=>Mr(T)),_(()=>_r()&&me(Ar,e=>Rr(e)),-q.postFrequency),z(document,"visibilitychange",()=>jr("visible"===document.visibilityState)),z(x,"focus",()=>jr(T)),z(x,"blur",()=>jr(E)),jr("visible"===document.visibilityState)}),or),[Pr,Vr]=e(),Wr=r("req"),Br=()=>Ct(()=>{return t=(e,t,r,n)=>(zr(o,A),Vr(e,n),Wr(r?{error:r}:T),T),(e=zr(o))&&t(...e);var e,t})||E,Lr=_(),Hr=()=>(_r()&&Br(),Lr(Hr,zr(".tail.rq")?25:500));t(()=>Hr());var Gr,[Kr,Xr]=e(),[Zr,Jr]=e(),[Yr,Qr]=(Ar.events=[async(e,t)=>{return U(e)?(await Ft,t&&!Gr&&(t=E),Xr(e),t=t,r=`(${c??"(unknown)"})`,Br(),a=!!zr(".tail.rq"),await(!t&&a?E:(t=F(),zr(".tail.rq",[r,t],q.requestTimeout),zr(o,A),r=a,n=F(),t=nt([M(e,(e,t,r={...e,timestamp:Math.min(0,(e.timestamp??=n)-n)})=>{return(a=n=>g(O(n),([e,t],r)=>t==A||le(t)&&!a(t)?(D(n,e),r):T))(r),r;var a}),[Gr,r]]),void(Z.sendBeacon($t,new Blob([t],{type:"text/plain"}))||b("post-failed",e))===E?(zr(".tail.rq",A),T):await xe(t=>Wr(e=>(t(e===T),E),T))))):E;var n,r,a},e=>{e&&Jr()}],[(...e)=>U(e)&&(C(Tr.events??=[],...e),!Cr)&&ut(()=>U(Tr)&&s([3,Er()])),()=>Rr("events")]),en=wr("affinity",()=>Gr,e=>Gr=e),tn=(Pr(e=>en(Gr=e)),$()),rn=E,nn=()=>{},an=t=>{var r=(e=T)=>D(tn,r)&&e&&t(rn);return tn.add(r),r};Zr(()=>{rn=T,M(tn,e=>e(T))});var y,on,sn,ln,cn,or={id:"navigation",setup(y){var w=_(),b=nn,t=v=>{z(v,["click","contextmenu","auxclick"],e=>{b?.(E);var r,n,a=A,i=E;if(vt(e.target,e=>{var t;a??=((e,t=At(e),r=er(e,"button"))=>r!==E&&(re(t,"A","BUTTON")||"INPUT"===t&&re(ne(j(e,"type")),"button","submit")||r===T))(e)?e:A,i=i||"NAV"===At(e),r??=er(e,"clicks",T,e=>e.track?.clicks)??((t=Gt(e)?.component)&&we(t,e=>e.track?.clicks!==E)),n??=er(e,"region",T,e=>e.track?.region)??((t=Gt(e)?.component)&&we(t,e=>e.track?.region))}),a){var t=Cn(a),o=kn(a);r??=!i;var s,l,c={...(n??=T)?{pos:xt(a,e),viewport:Nt()}:A,...(c=e.target,s=a,vt(c??s,e=>re(At(e),"IMG")||e===s?(l={element:{tagName:e.tagName,text:j(e,"title")||j(e,"alt")||e.innerText?.trim().substring(0,100)||void 0}},E):T),l),...t,...o,timing:{}};if(((e,t="A"===At(e)&&j(e,"href"))=>t&&"#"!=t&&!t.startsWith("javascript:"))(a)){var t=a.hostname!==k.hostname,{domain:o,href:u}=St(a.href);if(a.host===k.host&&a.pathname===k.pathname&&a.search===k.search)return"#"===a.hash?void 0:void(a.hash!==k.hash&&C(y,{type:"ANCHOR_NAVIGATION",anchor:a.hash,...c}));var f={id:ht(),type:"NAVIGATION",href:t?a.href:u,external:t,domain:o,self:T,anchor:a.hash,...c};if("contextmenu"===e.type){var d=gn(f.id),g=a.href;if(!Mt(g)){if(!q.captureContextMenu)return;a.href=Rt(Dt,"=",ee(g)),Ct(()=>Z.userActivation?.isActive&&Z.clipboard.writeText(g))}var h=Date.now(),m=(ir(".tail.cm",h,11e3),w(()=>{a.href=g,d()&&+ir(".tail.cm")!==h+1||(ir(".tail.cm",A),f.self=E,C(y,f),be(w))},-100),z(v,["keydown","keyup","visibilitychange","pointermove"],()=>m()&&be(w,1e4,()=>ir(".tail.cm",""))))}else e.button<=1&&(1===e.button||e.ctrlKey||e.shiftKey||e.altKey||j(a,"target")!==x.name?(gn(f.id),f.self=E,C(y,f)):(Et(k.href,a.href)||(f.exit=f.external,gn(f.id)),b=an(()=>C(y,f))))}else{u=e.target,vt(u,(e,t)=>!!(p??=An(Gt(e)?.cart??Qt(e,"cart")))&&!p.item&&(p.item=ye(Gt(e)?.content,-1))&&t(p));var p,t=Tn(p);(t||r)&&C(y,t?{type:"CART_UPDATED",...c,...t}:{type:"COMPONENT_CLICK",...c})}}})};return t(h),vn(e=>e.contentDocument&&t(e.contentDocument)),{decorate(e){l(e)&&b(T)}}}},[un,fn]=e(),dn=([sn,ln,r=T]=[lr,"ref",T],r&&(ln="(t~"+ln),cn=(...e)=>sn(ln,...e),(r,e=E)=>{var t,n,a,i;return r===w?(t=A,cn(e=>(e=R(e,e=>e[1]>F()),t=ge(e)?.[0]??A,e)),t):(n=T,(a=t=>cn(e=>t?M(e,e=>e[0]===r?(n=T,[r,F()+1e4]):e):C(e??[],[r,F()+1e4])))(e),(i=_())(()=>(a(T),n||i(),n),-5e3),()=>n)}),gn=e=>dn([y.id,e]),hn=ct(),mn=ct(),pn=ct(),[vn,yn]=e(),wn=new WeakSet,bn=h.getElementsByTagName("iframe"),t={id:"context",setup(a){_(()=>g(bn,e=>{return((t=wn).has(r=e)?E:(t.add(r),T))&&yn(e);var t,r}),-1e3).pulse();var i=T,r=1,o=E,s=sr("t",e=>(i=!e)?[ht(),F(),F(),0]:(e[2]=F(),e)),l=T,c=(wr("first",()=>E,e=>{e||(l=E,y&&D(y,["firstTab","landingPage"]))}),nn),u=nn,f=A,n=(e=E)=>{var r,n,t;Et(""+f,f=k.href)&&!e||(c(),u(),hn.reset(),mn.reset(),pn.reset(),sr("t",()=>(s[2]=F(),++s[3],s)),{href:e,domain:t}=St(k.href)??{},y={type:"VIEW",timestamp:F(),id:ht(),tab:s[0],href:e,path:k.pathname,hash:k.hash||w,domain:t,tabIndex:s[3],viewport:{width:x.innerWidth,height:x.innerHeight}},fn(y.id),(y.firstTab=l)&&1===s[3]&&(y.landingPage=T),r=(e,t,r=p(e,t))=>1<r.length?r:A,(t=(e=v(k.href,/^[^?]*\??/,""))==A?e:(te={},Ne(e,/([^&=]+)(?:=([^&]+))?/g,(e,t,r)=>C(te[ne(Q(t))]??=[],Q(I(r,E)))),te))&&(n=y.queryString=Ee(t,([e,t])=>[e.toLowerCase(),!(1<t.length)&&(r(t[0],"|")||r(t[0],";")||r(t[0],","))||t]),M(["source","medium","campaign","term","content"],(e,t)=>(y.utm??={})[e]=n["utm_"+e]?.[0])),!(y.navigationType=on)&&performance&&M(performance.getEntriesByType("navigation"),e=>{y.redirects=e.redirectCount,y.navigationType=v(e.type,/\_/g,"-")}),on=w,"navigate"===(y.navigationType??="navigate")&&i&&Mt(h.referrer)&&(e=dn(),y.view=e?.[0],y.related=e?.[1]),(t=h.referrer||A)&&!Mt(t)&&(y.externalReferrer={href:t,domain:St(t)?.domain}),o=E,c=an(()=>(o=T,C(a,y),y?.firstTab&&C(a,{flush:T}))),u=an(()=>{C(a,{type:"VIEW_ENDED",timing:{}},{set:{view:w}}),i=E}),C(a,{get:{view:e=>y.definition=e,rendered(){_(c,100)}}}),a.push({get:{qd(e){var t,r,n;e&&_r()&&C(a,{type:"USER_AGENT",hasTouch:0<Z.maxTouchPoints,userAgent:Z.userAgent,view:y?.id,languages:M(Z.languages,(e,t,r=p(e,"-"))=>({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(e=x?.screen,e?({width:e,height:t,orientation:n}=e,r=e<t,-90!==(n=n?.angle??x.orientation??0)&&90!==n||([e,t]=[t,e]),{deviceType:e<480?"mobile":1024<e?"desktop":"tablet",screen:{dpr:x.devicePixelRatio,width:e,height:t,landscape:r}}):{})})}}}))},e=_(),t=(z(h,["pointermove","scroll","pointerdown","keydown"],()=>{pn(T),e(()=>pn(E),1e4)}),z(h,"visibilitychange",()=>{"hidden"===h.visibilityState?(mn(E),pn(E)):(mn(T),++r)}),z(x,"popstate",()=>(on="back-forward",n())),M(["push","replace"],e=>{var t=history[e+="State"];history[e]=(...e)=>{t.apply(history,e),on="navigate",n()}}),n(),_()),d=()=>o&&0<q.heartbeatFrequency&&t(()=>_r()&&a.push({type:"HEARTBEAT",timing:{}}),-q.heartbeatFrequency);return d(),{processCommand(e){return Dn(e)?(a.push(e.username?{type:"LOGIN",username:e.username}:{type:"LOGOUT"}),T):E},decorate(e){var t;d(),y&&!W(e)&&(t={view:y?.id,timing:e?.timing&&{activations:r,totalTime:hn(),visibleTime:mn(),interactiveTime:pn()}},L(e,t),e!==(t=y))&&(e[cr]??=[]).push(t)}}}},An=e=>I(e=e==A||e!==T&&""!==e?e:"add")&&re(e,"add","remove","update","clear")?{action:e}:le(e)?e:w;function Tn(e){if(!e)return w;if(e.units!=A&&re(e.action,A,"add","remove")){if(0===e.units)return w;e.action=0<e.units?"add":"remove"}return e}var En,xn,P,r={id:"cart",setup(r){return{processCommand(e){var t;return $n(e)?("clear"===(t=e.cart)?C(r,{type:"CART_UPDATED",action:"clear"}):(t=Tn(t))&&C(r,{...t,type:"CART_UPDATED"}),T):Wn(e)?(C(r,{type:"ORDER",...e.order}),T):E}}}},kn=e=>tr(e,w,e=>M(m(Ht,e)?.tags)),In=e=>e?.component||e?.content,Sn=(e,t)=>t?e:{...e,rect:w,content:(xn=e.content)&&M(xn,e=>({...e,rect:w}))},Nn=_(),Cn=(e,i=E)=>{be(Nn);var o,t,r,s=[],l=[],c=0;return vt(e,e=>{var r,t,n,a=m(Ht,e);a&&(In(a)&&(t=R(a.component,e=>0===c||!i&&(1===c&&e.track?.secondary!==T||e.track?.promote)),o=we(t,e=>e.track?.region)&&It(e)||w,r=tr(n=e,e=>e!==n&&!!In(m(Ht,e)),e=>(En=m(Ht,e))&&he(ve([En.component,En.content],e=>ve(e,e=>M(e.tags,E))),En.tags)),a.content&&de(s,...M(a.content,e=>({...e,rect:o,...r}))),t.length)&&(de(l,...M(t,e=>{return t=[c,e.track?.secondary?1:2],c=Math.max(...t),Sn({...e,content:s,rect:o,...r},!!o);var t})),s=[]),t=a.area||Qt(e,"area"))&&de(l,...M(t))}),s.length&&C(l,Sn({id:"",rect:o,content:s})),g(l,e=>{I(e)?C(t??=[],e):(e.area??=$e(t,"/"),de(r??=[],e))}),r||t?{components:r,area:$e(t,"/")}:w},Un=Symbol(),e={id:"components",setup(f){var r=new IntersectionObserver(e=>g(e,({target:e,isIntersecting:t,boundingClientRect:r,intersectionRatio:n})=>e[Un]?.(t,r,n)),{threshold:[.05,.1,.15,.2,.3,.4,.5,.6,.75]});function t({boundary:n,...t}){var a,i,o,s,l,c,u,e="add"in t?e=>({...e,component:he(e?.component,t.component),content:he(e?.content,t.content),area:t?.area??e?.area,tags:he(e?.tags,t.tags),cart:t.cart??e?.cart,track:t.track??e?.track}):t.update;Ae(Ht,n,e??t),(a=R(m(Ht,n)?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==T))&&U(a)&&(o=E,s=0,l=A,c=_(),u=ct(()=>mn(),E),n[Un]=(e,t,r)=>{e=.75<=r||t.top<(i=window.innerHeight/2)&&t.bottom>i,u(e),o!==(o=e)&&(o?c(()=>{var e;++s,l||(e=R(M(a,e=>e.track?.impressions||er(n,"impressions",T,e=>e.track?.impressions)?{type:"IMPRESSION",pos:xt(n),viewport:Nt(),...Cn(n,T)}:A)),l=an(()=>C(f,...M(e,e=>(e.duration=u(),e.impressions=s,e)))))},-q.impressionThreshold):be(c)),n.isConnected||(l?.(),l=A)},r.observe(n))}return{decorate(e){g(e.components,e=>D(e,"track"))},processCommand(e){return qn(e)?(t(e),T):Bn(e)?(M((l=e.scan.attribute,(c=e.scan.components)?(u=[],f=$(),h.querySelectorAll(`[${l}]`).forEach(t=>{if(!m(f,t))for(var e=[];j(t,l)!=A;){Ae(f,t);var r=p(j(t,l),"|");j(t,l,A);for(var n=0;n<r.length;n++){var a=r[n];if(""!==a){var i="-"===a?-1:G(I(a,E)??"",36);if(i<0)e.length+=i;else{if(0===n&&(e.length=0),isNaN(i)&&/^["\[{]/.test(a))for(var o="";n<r.length;n++)try{a=JSON.parse(o+=r[n]);break}catch(e){}0<=i&&c[i]&&(a=c[i]),e.push(a)}}}C(u,...M(e,e=>({add:T,...e,boundary:t})));var s=t.nextElementSibling;"WBR"===t.tagName&&t.parentNode?.removeChild(t),t=s}}),u):[]),t),T):E;var l,c,u,f}}}},On={id:"scroll",setup(n){var a={},i=Tt(T);un(()=>ut(()=>(a={},i=Tt(T)),250)),z(x,"scroll",()=>{var e,t=Tt(),r={x:(Ke=Tt(E)).x/(J.offsetWidth-x.innerWidth)||0,y:Ke.y/(J.offsetHeight-x.innerHeight)||0};t.y>=i.y&&(e=[],!a.fold&&t.y>=i.y+200&&(a.fold=T,e.push("fold")),!a["page-middle"]&&.5<=r.y&&(a["page-middle"]=T,e.push("page-middle")),!a["page-end"]&&.99<=r.y&&(a["page-end"]=T,e.push("page-end")),(t=M(e,e=>({type:"SCROLL",scrollType:e,offset:r}))).length)&&C(n,t)})}},Mn=Symbol(),Rn=[t,e,or,On,r,{id:"forms",setup(s){var l=new Map,c=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(","):"checkbox"===e.type?e.checked?"yes":"no":e.value,u=A,f=()=>{var e,r,t,n,a,i,o;u&&([e,r,t,n]=u,a=-(d-(d=mn())),i=-(g-(g=F(T))),o=r[Mn],(r[Mn]=c(t))!==o&&(r.fillOrder??=n[5]++,r.filled&&(r.corrections=(r.corrections??0)+1),r.filled=T,n[3]=2,O(e.fields,([e,t])=>t.lastField=e===r.name||w)),r.activeTime+=a,r.totalTime+=i,e.activeTime+=a,u=A)},d=0,g=0,t=e=>{e&&z(e,["focusin","focusout","change"],(e,t,r=((e,[t,r]=(e=>{var i,n,a,o=e.form;if(o)return n=yt(o,Kt("ref"))||"track_ref",a=Te(l,o,()=>{var e,t=new Map,r={type:"FORM",name:yt(o,Kt("form-name"))||j(o,"name")||o.id||w,activeTime:0,totalTime:0,fields:{}},n=()=>{f(),2<=e[3]&&(r.completed=3===e[3]||!(o.isConnected&&It(o).width)),C(s,{...i,...r,totalTime:F(T)-e[4]}),e[3]=1},a=(un(n),Zr(n),_());return z(o,"submit",()=>{i=Cn(o),e[3]=3,a(()=>{(o.isConnected&&0<It(o).width?(e[3]=2,a):n)()},750)}),e=[r,t,o,0,F(T),1]}),m(a[1],e)||M(o.querySelectorAll("INPUT,SELECT,TEXTAREA"),(e,t)=>{var r;e.name&&"hidden"!==e.type?(r=e.name,r=a[0].fields[r]??={id:e.id||r,name:r,label:v(ye(e.labels,0)?.innerText??e.name,/^\s*(.*?)\s*\*?\s*$/g,"$1"),activeTime:0,type:e.type??"unknown",[Mn]:c(e)},a[0].fields[r.name]=r,a[1].set(e,r)):"hidden"!==e.type||e.name!==n&&!er(e,"ref")||(e.value||(e.value=v([1e7]+-1e3+-4e3+-8e3+-1e11,/[018]/g,e=>((e*=1)^ft(new Uint8Array(1))[0]&15>>e/4).toString(16))),a[0].ref=e.value)}),[e,a]})(e)??[],n=r?.[1].get(t))=>n&&[r[0],n,t,r])(e.target))=>{r&&(u=r,"focusin"===e.type?(g=F(T),d=mn()):f())})};t(h),vn(e=>e.contentDocument&&t)}}],t=(...e)=>t=>t===e[0]||e.some(e=>"string"==typeof e&&void 0!==t?.[e]),$n=t("cart"),Dn=t("username"),Fn=t("tagAttributes"),_n=t("disable"),qn=t("boundary"),jn=t("extension"),zn=t(T,"flush"),Pn=t("get"),Vn=t("listener"),Wn=t("order"),Bn=t("scan"),Ln=t("set"),Hn=e=>"function"==typeof e,Gn=t=>{var r,e,l,c,u,n,a,i,f,d,o,g,h,m,s,p,v,y;return P||(I(t)&&(t=it(t)),M(["vars","hub"],e=>!S(t[e])&&(t[e]=Rt(t[e]))),L(q,t),e=D(q,"clientKey"),[ot,st]=rt(e),r=D(q,"apiKey"),e=x[q.name]??[],N(e)?(l=[],c=[],u=(t,...r)=>{var n=T;c=R(c,e=>Ct(()=>(e[t]?.(...r,{tracker:P,unsubscribe:()=>n=E}),n)))},Kr(e=>u("post",e)),n=[],mr(()=>n.length&&C(P,...n)),i=Object.fromEntries(M(["view","tags","rendered","loaded","scripts","qd"],e=>[e,T])),[f,d]=(s=P,p={},v={},y=(e,t)=>[v[e]??=[],t?v[e]=[]:v[e]],[(e,i)=>{if(!e)return p;M(O(e),([e,t])=>{if(!t)return b("invalid-argument",e);var n=t,[r]=y(e,E),a=E;t=(e,t,r)=>(a=T,Ct(()=>n(e,t,r,s))),p[e]===w&&0!==i?(C(r,t),i&&0<i&&setTimeout(()=>!a&&t(w,e,T,s)!==T&&(n=()=>{}),i)):t(p[e],e,T,s)===T&&C(r,t)})},(...e)=>{var t=ye(e,-1)===T,e=N(e[0])?e[0]:le(e[0])?O(e[0]):[[e[0],e[1]]];M(e,([t,r])=>{p[t=""+t]=r;var[e,n]=y(t,T);M(e,e=>e(r,t,E,s)===T&&C(n,e))}),t||U(a=R(e,([e])=>!i[e]))&&o(a)}]),Pr((e,t)=>d(t)),o=wr("vars",()=>M(R(O(f()),([e])=>!i[e]),([e,t])=>[e,t]),e=>e&&d(e,T)),g=A,h=0,m=E,bt(x,{[q.name]:[P=bt({},{id:[ht()],push:[(...e)=>{if(!g&&r){if(e[0]!==r)throw new Error("Invalid API key.");e.splice(0,1)}if(e.length){e=e.flatMap(e=>(e&&"string"==typeof e&&(e=it(e)),N(e)?e:[e]));var t=E;if((e=R(e,e=>{if(!e)return E;if(Fn(e))q.tags=L({},q.tags,e.tagAttributes);else{if(_n(e))return q.disabled=e.disable,E;if(zn(e))return t=T,E;if(Hn(e))return e(P),E}return vr||Vn(e)||jn(e)?T:(n.push(e),E)})).length||t){e=ue(e,e=>jn(e)?-100:Vn(e)?-50:Ln(e)?-10:V(e)?90:0);if(!g||!fe(g,m?h+1:g.length,0,...e)){for(g=e,h=0;h<g.length;h++)g[h]&&Ct(()=>{var r=g[h];if(u("command",r),m=E,V(r)){r.timestamp??=F(),B(r)&&fe(g,h+1,0,{set:{consent:r.nonEssentialTracking}}),m=T;var n=E;if(M(l,([,e],t)=>{!n&&e.decorate?.(r)!==E||(n=T)}),!n){for(var e,t=[r],a=[];t.length;){var i=ge(t);(t=>!dr(t)&&(M(t[cr],e=>Ae(Te(fr,e,()=>$()),t)),T))(i)||(Ae(ur,e=i),(e=(ar=fr.get(e))&&(ar.size||D(fr,e),R(ar,e=>dr(e)&&(D(ar,e),T))))&&fe(t,1,0,...e),C(a,i))}Yr(...a)}}else if(Pn(r))f(r.get,r.timeout);else if(Ln(r))d(r.set),M(O(r.set),([e,t])=>u("set",e,t));else if(Vn(r))C(c,r.listener);else if(jn(r))(o=Ct(()=>r.extension.setup(P),e=>b(A,r.extension,e)))&&(C(l,[r.priority??100,o]),ue(l,([e])=>e));else if(Hn(r))r(P);else{var o,s=E;for([,o]of l)if(s=o.processCommand?.(r)??E)break;s||b("invalid-command",r)}},e=>b("internal-error",A,e));g=A,t&&Qr()}}}}],__isTracker:[T]})]}),_t(),C(P,{set:{loaded:T}},...M(Rn,e=>({extension:e})),...e),P):void b(`The global variable for the tracker "${q.name}" is used for something else than an array of queued commands.`))},Kn=E;bt(x,{".tail.js.init":[e=>{Kn!==(Kn=T)&&e(Gn)}]})})();
//# sourceMappingURL=tail.js.map