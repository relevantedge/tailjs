var e=Object.defineProperty,t=Object.getOwnPropertySymbols,r=Object.prototype.hasOwnProperty,n=Object.prototype.propertyIsEnumerable,i=(t,r,n)=>r in t?e(t,r,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[r]=n;function o(e,o){return a(e=((e,o)=>{for(var a in o||(o={}))r.call(o,a)&&i(e,a,o[a]);if(t)for(var a of t(o))n.call(o,a)&&i(e,a,o[a]);return e})({},e),"id"),a(e,"view"),a(e,"related"),e;function a(e,t){(null==e?void 0:e[t])&&(e[t]=o(e[t])||e[t])}}var a,s,u=void 0,f=e=>!(e=>e===u)(e),l=e=>null!=e,c=(a=e=>"string"==typeof e,s=e=>l(e)?""+e:e,(e,t=!0)=>a(e)||s&&t&&f(e=s(e))?e:u),h=(Array.isArray,[]),d=[],p=(e,t=0)=>e.charCodeAt(t);[..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"].forEach(((e,t)=>h[d[t]=e.charCodeAt(0)]=t));var v,y={32:[0x811c9dc5n,0x01000193n],64:[0xcbf29ce484222325n,0x100000001b3n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},g=(e=256)=>e*Math.random()|0;v={exports:{}},function(){function e(e,t){if(t&&t.multiple&&!Array.isArray(e))throw new Error("Invalid argument type: Expected an Array to serialize multiple values.");var r,n,i=4294967296,o=new Uint8Array(128),a=0;if(t&&t.multiple)for(var s=0;s<e.length;s++)u(e[s]);else u(e);return o.subarray(0,a);function u(e,o){switch(typeof e){case"undefined":f();break;case"boolean":!function(e){c(e?195:194)}(e);break;case"number":!function(e){if(isFinite(e)&&Math.floor(e)===e)if(e>=0&&e<=127)c(e);else if(e<0&&e>=-32)c(e);else if(e>0&&e<=255)h([204,e]);else if(e>=-128&&e<=127)h([208,e]);else if(e>0&&e<=65535)h([205,e>>>8,e]);else if(e>=-32768&&e<=32767)h([209,e>>>8,e]);else if(e>0&&e<=4294967295)h([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)h([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=0x10000000000000000){var t=e/i,o=e%i;h([211,t>>>24,t>>>16,t>>>8,t,o>>>24,o>>>16,o>>>8,o])}else e>=-0x8000000000000000&&e<=0x8000000000000000?(c(211),d(e)):h(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]);else n||(r=new ArrayBuffer(8),n=new DataView(r)),n.setFloat64(0,e),c(203),h(new Uint8Array(r))}(e);break;case"string":!function(e){var t=function(e){for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var i=0,o=new Uint8Array(e.length*(t?1:4)),a=0;a!==r;a++){var s=e.charCodeAt(a);if(s<128)o[i++]=s;else{if(s<2048)o[i++]=s>>6|192;else{if(s>55295&&s<56320){if(++a>=r)throw new Error("UTF-8 encode: incomplete surrogate pair");var u=e.charCodeAt(a);if(u<56320||u>57343)throw new Error("UTF-8 encode: second surrogate character 0x"+u.toString(16)+" at index "+a+" out of range");s=65536+((1023&s)<<10)+(1023&u),o[i++]=s>>18|240,o[i++]=s>>12&63|128}else o[i++]=s>>12|224;o[i++]=s>>6&63|128}o[i++]=63&s|128}}return t?o:o.subarray(0,i)}(e),r=t.length;r<=31?c(160+r):h(r<=255?[217,r]:r<=65535?[218,r>>>8,r]:[219,r>>>24,r>>>16,r>>>8,r]),h(t)}(e);break;case"object":null===e?f():e instanceof Date?function(e){var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)h([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184)h([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/i,t>>>24,t>>>16,t>>>8,t]);else{var r;h([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),d(t)}}(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?function(e){var t=e.length;h(t<=15?[196,t]:t<=65535?[197,t>>>8,t]:[198,t>>>24,t>>>16,t>>>8,t]),h(e)}(e):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):function(e){var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?c(128+t):h(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(u(r),u(n))}}(e);break;default:if(o||!t||!t.invalidTypeReplacement)throw new Error("Invalid argument type: The type '"+typeof e+"' cannot be serialized.");"function"==typeof t.invalidTypeReplacement?u(t.invalidTypeReplacement(e),!0):u(t.invalidTypeReplacement,!0)}}function f(e){c(192)}function l(e){var t=e.length;t<=15?c(144+t):h(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)u(e[r])}function c(e){if(o.length<a+1){for(var t=2*o.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(o),o=r}o[a]=e,a++}function h(e){if(o.length<a+e.length){for(var t=2*o.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(o),o=r}o.set(e,a),a+=e.length}function d(e){var t,r;e>=0?(t=e/i,r=e%i):(e++,t=~(t=Math.abs(e)/i),r=~(r=Math.abs(e)%i)),h([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function t(e,t){var r,n=4294967296,i=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),"object"!=typeof e||void 0===e.length)throw new Error("Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.");if(!e.length)throw new Error("Invalid argument: The byte array to deserialize is empty.");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];i<e.length;)r.push(o());else r=o();return r;function o(){var t=e[i++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return l(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return h(t-160);if(192===t)return null;if(193===t)throw new Error("Invalid byte code 0xc1 found.");if(194===t)return!1;if(195===t)return!0;if(196===t)return f(-1,1);if(197===t)return f(-1,2);if(198===t)return f(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return u(4);if(203===t)return u(8);if(204===t)return s(1);if(205===t)return s(2);if(206===t)return s(4);if(207===t)return s(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return h(-1,1);if(218===t)return h(-1,2);if(219===t)return h(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return l(-1,2);if(223===t)return l(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug("msgpack array:",e),new Error("Invalid byte value '"+t+"' at index "+(i-1)+" in the MessagePack binary data (length "+e.length+"): Expecting a range of 0 to 255. This is not a byte array.")}function a(t){for(var r=0,n=!0;t-- >0;)if(n){var o=e[i++];r+=127&o,128&o&&(r-=128),n=!1}else r*=256,r+=e[i++];return r}function s(t){for(var r=0;t-- >0;)r*=256,r+=e[i++];return r}function u(t){var r=new DataView(e.buffer,i+e.byteOffset,t);return i+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function f(t,r){t<0&&(t=s(r));var n=e.subarray(i,i+t);return i+=t,n}function l(e,t){e<0&&(e=s(t));for(var r={};e-- >0;)r[o()]=o();return r}function c(e,t){e<0&&(e=s(t));for(var r=[];e-- >0;)r.push(o());return r}function h(t,r){t<0&&(t=s(r));var n=i;return i+=t,function(e,t,r){var n=t,i="";for(r+=t;n<r;){var o=e[n++];if(o>127)if(o>191&&o<224){if(n>=r)throw new Error("UTF-8 decode: incomplete 2-byte sequence");o=(31&o)<<6|63&e[n++]}else if(o>223&&o<240){if(n+1>=r)throw new Error("UTF-8 decode: incomplete 3-byte sequence");o=(15&o)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(o>239&&o<248))throw new Error("UTF-8 decode: unknown multibyte start 0x"+o.toString(16)+" at index "+(n-1));if(n+2>=r)throw new Error("UTF-8 decode: incomplete 4-byte sequence");o=(7&o)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(o<=65535)i+=String.fromCharCode(o);else{if(!(o<=1114111))throw new Error("UTF-8 decode: code point 0x"+o.toString(16)+" exceeds UTF-16 reach");o-=65536,i+=String.fromCharCode(o>>10|55296),i+=String.fromCharCode(1023&o|56320)}}return i}(e,n,t)}function d(e,t){e<0&&(e=s(t));var r=s(1),o=f(e);return 255===r?function(e){if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2);return t=(3&e[3])*n+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6)}if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],i-=8,t=a(8),new Date(1e3*t+r/1e6);throw new Error("Invalid data length for a date value.")}(o):{type:r,data:o}}}var r={serialize:e,deserialize:t,encode:e,decode:t};v?v.exports=r:window[window.msgpackJsName||"msgpack"]=r}();var w=new ArrayBuffer(8);new DataView(w),(e=>{var[t,r,n]=((e="")=>{var t,r,n,i,o,a=0n,s=0n,u=[],f=0,c=0,h=0,d=0,v=[];for(h=0;h<e.length;d+=v[h]=p(e,h++));var w=e?()=>{u=[...v],c=255&(f=d),h=-1}:()=>{},b=e=>(c=255&(f+=-u[h=(h+1)%u.length]+(u[h]=e)),e);return[e?e=>{for(w(),t=e.length,i=16-(t+4)%16,o=new Uint8Array(4+t+i),n=0;n<3;o[n++]=b(g()));for(o[n++]=b(c^16*g(16)+i),r=0;r<t;o[n++]=b(c^e[r++]));for(;i--;)o[n++]=g();return o}:e=>e,e?e=>{for(w(),r=0;r<3;b(e[r++]));if((t=e.length-4-((c^b(e[r++]))%16||16))<=0)return new Uint8Array(0);for(o=new Uint8Array(t),n=0;n<t;o[n++]=c^b(e[r++]));return o}:e=>e,(e,t=64)=>{if(!l(e))return null;var n="boolean"==typeof t?64:t;for(w(),[a,s]=y[n],r=0;r<e.length;a=BigInt.asUintN(n,(a^BigInt(c^b(e[r++])))*s));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})("")})();var b="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},m={},_={};!function(e){var t=b&&b.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function a(e){try{u(n.next(e))}catch(e){o(e)}}function s(e){try{u(n.throw(e))}catch(e){o(e)}}function u(e){e.done?i(e.value):new r((function(t){t(e.value)})).then(a,s)}u((n=n.apply(e,t||[])).next())}))},r=b&&b.__generator||function(e,t){var r,n,i,o={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return{next:a(0),throw:a(1),return:a(2)};function a(a){return function(s){return function(a){if(r)throw new TypeError("Generator is already executing.");for(;o;)try{if(r=1,n&&(i=n[2&a[0]?"return":a[0]?"throw":"next"])&&!(i=i.call(n,a[1])).done)return i;switch(n=0,i&&(a=[0,i.value]),a[0]){case 0:case 1:i=a;break;case 4:return o.label++,{value:a[1],done:!1};case 5:o.label++,n=a[1],a=[0];continue;case 7:a=o.ops.pop(),o.trys.pop();continue;default:if(!((i=(i=o.trys).length>0&&i[i.length-1])||6!==a[0]&&2!==a[0])){o=0;continue}if(3===a[0]&&(!i||a[1]>i[0]&&a[1]<i[3])){o.label=a[1];break}if(6===a[0]&&o.label<i[1]){o.label=i[1],i=a;break}if(i&&o.label<i[2]){o.label=i[2],o.ops.push(a);break}i[2]&&o.ops.pop(),o.trys.pop();continue}a=t.call(e,o)}catch(e){a=[6,e],n=0}finally{r=i=0}if(5&a[0])throw a[1];return{value:a[0]?a[1]:void 0,done:!0}}([a,s])}}};e.__esModule=!0;var n=function(){function e(e){this.promiseResolverQueue=[],this.permits=e}return e.prototype.getPermits=function(){return this.permits},e.prototype.wait=function(){return t(this,void 0,void 0,(function(){var e=this;return r(this,(function(t){return this.permits>0?(this.permits-=1,[2,Promise.resolve(!0)]):[2,new Promise((function(t){return e.promiseResolverQueue.push(t)}))]}))}))},e.prototype.acquire=function(){return t(this,void 0,void 0,(function(){return r(this,(function(e){return[2,this.wait()]}))}))},e.prototype.waitFor=function(e){return t(this,void 0,void 0,(function(){var t,n,i=this;return r(this,(function(r){return this.permits>0?(this.permits-=1,[2,Promise.resolve(!0)]):(t=function(e){},n=new Promise((function(e){t=e})),this.promiseResolverQueue.push(t),setTimeout((function(){var e=i.promiseResolverQueue.indexOf(t);-1!==e&&i.promiseResolverQueue.splice(e,1),t(!1)}),e),[2,n])}))}))},e.prototype.tryAcquire=function(){return this.permits>0&&(this.permits-=1,!0)},e.prototype.drainPermits=function(){if(this.permits>0){var e=this.permits;return this.permits=0,e}return 0},e.prototype.signal=function(){if(this.permits+=1,this.permits>1&&this.promiseResolverQueue.length>0)throw new Error("this.permits should never be > 0 when there is someone waiting.");if(1===this.permits&&this.promiseResolverQueue.length>0){this.permits-=1;var e=this.promiseResolverQueue.shift();e&&e(!0)}},e.prototype.release=function(){this.signal()},e.prototype.execute=function(e){return t(this,void 0,void 0,(function(){return r(this,(function(t){switch(t.label){case 0:return[4,this.wait()];case 1:t.sent(),t.label=2;case 2:return t.trys.push([2,,4,5]),[4,e()];case 3:return[2,t.sent()];case 4:return this.signal(),[7];case 5:return[2]}}))}))},e}();e.default=n}(_);var x,I={},A=b&&b.__extends||(x=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var r in t)t.hasOwnProperty(r)&&(e[r]=t[r])},function(e,t){function r(){this.constructor=e}x(e,t),e.prototype=null===t?Object.create(t):(r.prototype=t.prototype,new r)});I.__esModule=!0;var E=function(e){function t(){return e.call(this,1)||this}return A(t,e),t}(_.default);I.Lock=E,function(e){e.__esModule=!0;var t=_;e.default=t.default,function(t){for(var r in t)e.hasOwnProperty(r)||(e[r]=t[r])}(I)}(m);var U=Object.defineProperty,T=Object.defineProperties,O=Object.getOwnPropertyDescriptors,S=Object.getOwnPropertySymbols,k=Object.prototype.hasOwnProperty,P=Object.prototype.propertyIsEnumerable,R=(e,t,r)=>t in e?U(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,M=(e,t)=>{for(var r in t||(t={}))k.call(t,r)&&R(e,r,t[r]);if(S)for(var r of S(t))P.call(t,r)&&R(e,r,t[r]);return e};class N{constructor(e){this.name="ravendb",this._nextId=0,this._idIndex=1,this._idRangeMax=0,this._idBatchSize=1e3,this._settings=e,this._lock=new m.Lock}async initialize(e){var t;try{if(this._env=e,this._settings.x509){var r="cert"in this._settings.x509?this._settings.x509.cert:await this._env.read(this._settings.x509.certPath),n="keyPath"in this._settings.x509?null!=(t=await this._env.readText(this._settings.x509.keyPath))?t:void 0:this._settings.x509.key;if(!r)throw new Error("Certificate not found.");this._cert={id:this.name,cert:r,key:n}}}catch(t){e.log({group:this.name,level:"error",source:`${this.name}:initialize`,data:""+t})}}async post(e,t,r){var n,i,a,s,u;try{var f=[],l=c(null==(n=t.vars.rd_s)?void 0:n.value),h=c(null==(i=t.vars.rd_d)?void 0:i.value),d=c(null==(a=t.vars.rd_ds)?void 0:a.value);for(var p of(t.vars.rd_s={scope:"session",essential:!0,critical:!0,value:null!=l?l:l=(await this._getNextId()).toString(36)},t.vars.rd_d={scope:"device",essential:!0,critical:!0,value:null!=h?h:h=(await this._getNextId()).toString(36)},t.vars.rd_ds={scope:"device-session",essential:!0,critical:!0,value:null!=d?d:d=(await this._getNextId()).toString(36)},e)){p["rdb:timestamp"]=Date.now(),p=o(p,(e=>`${l}/${e}`));var v=(await this._getNextId()).toString(36);null==p.id&&(p.id=`${v}`),p.session&&(p.session["rdb:deviceId"]=p.session.deviceId,p.session["rdb:sessionId"]=p.session.sessionId,p.session["rdb:deviceSessionId"]=p.session.deviceSessionId,p.session.deviceId=h,p.session.sessionId=l,p.session.deviceSessionId=d),f.push({Type:"PUT",Id:`events/${v}`,Document:(s=M({},p),u={"@metadata":{"@collection":"events"}},T(s,O(u)))})}await this._env.request({method:"POST",url:`${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/bulk_docs`,headers:{"content-type":"application/json"},x509:this._cert,body:JSON.stringify({Commands:f})})}catch(e){r.log({group:this.name,level:"error",source:`${this.name}:post`,data:""+e})}}async _getNextId(){var e=++this._nextId;if(e>=this._idRangeMax){await this._lock.wait();try{if((e=++this._nextId)>=this._idRangeMax){for(var t=this._idRangeMax+this._idBatchSize,r=0;r<=100;r++){var n=(await this._env.request({method:"PUT",url:`${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/cmpxchg?key=NextEventId&index=${this._idIndex}`,headers:{"content-type":"application/json"},body:JSON.stringify({Object:t}),x509:this._cert})).body,i=JSON.parse(n),o=i.Successful;if("boolean"!=typeof o)throw new Error(`Unexpected response: ${n}`);var a=i.Index,s=i.Value.Object;if(this._idIndex=a,o){this._idRangeMax=s,this._nextId=this._idRangeMax-this._idBatchSize-1;break}if(r>=10)throw new Error(`Unable to allocate event IDs. Current counter is ${s}@${a}`);t=s+this._idBatchSize,this._env.log({group:this.name,level:"debug",source:"ids",data:`The server reported the next global ID to be ${s}. Retrying with next ID ${t}.`})}e=++this._nextId}}catch(e){this._env.log({group:this.name,level:"error",source:this.name,data:""+e})}finally{this._lock.release()}}return e}}export{N as RavenDbTracker};