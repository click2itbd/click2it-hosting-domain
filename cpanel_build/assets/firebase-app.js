const Ri=()=>{};var cr={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ir=function(n){const r=[];let s=0;for(let a=0;a<n.length;a++){let h=n.charCodeAt(a);h<128?r[s++]=h:h<2048?(r[s++]=h>>6|192,r[s++]=h&63|128):(h&64512)===55296&&a+1<n.length&&(n.charCodeAt(a+1)&64512)===56320?(h=65536+((h&1023)<<10)+(n.charCodeAt(++a)&1023),r[s++]=h>>18|240,r[s++]=h>>12&63|128,r[s++]=h>>6&63|128,r[s++]=h&63|128):(r[s++]=h>>12|224,r[s++]=h>>6&63|128,r[s++]=h&63|128)}return r},Oi=function(n){const r=[];let s=0,a=0;for(;s<n.length;){const h=n[s++];if(h<128)r[a++]=String.fromCharCode(h);else if(h>191&&h<224){const v=n[s++];r[a++]=String.fromCharCode((h&31)<<6|v&63)}else if(h>239&&h<365){const v=n[s++],m=n[s++],E=n[s++],A=((h&7)<<18|(v&63)<<12|(m&63)<<6|E&63)-65536;r[a++]=String.fromCharCode(55296+(A>>10)),r[a++]=String.fromCharCode(56320+(A&1023))}else{const v=n[s++],m=n[s++];r[a++]=String.fromCharCode((h&15)<<12|(v&63)<<6|m&63)}}return r.join("")},Ze={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,r){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const s=r?this.byteToCharMapWebSafe_:this.byteToCharMap_,a=[];for(let h=0;h<n.length;h+=3){const v=n[h],m=h+1<n.length,E=m?n[h+1]:0,A=h+2<n.length,T=A?n[h+2]:0,x=v>>2,C=(v&3)<<4|E>>4;let V=(E&15)<<2|T>>6,W=T&63;A||(W=64,m||(V=64)),a.push(s[x],s[C],s[V],s[W])}return a.join("")},encodeString(n,r){return this.HAS_NATIVE_SUPPORT&&!r?btoa(n):this.encodeByteArray(Ir(n),r)},decodeString(n,r){return this.HAS_NATIVE_SUPPORT&&!r?atob(n):Oi(this.decodeStringToByteArray(n,r))},decodeStringToByteArray(n,r){this.init_();const s=r?this.charToByteMapWebSafe_:this.charToByteMap_,a=[];for(let h=0;h<n.length;){const v=s[n.charAt(h++)],E=h<n.length?s[n.charAt(h)]:0;++h;const T=h<n.length?s[n.charAt(h)]:64;++h;const C=h<n.length?s[n.charAt(h)]:64;if(++h,v==null||E==null||T==null||C==null)throw new Pi;const V=v<<2|E>>4;if(a.push(V),T!==64){const W=E<<4&240|T>>2;if(a.push(W),C!==64){const $=T<<6&192|C;a.push($)}}}return a},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class Pi extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Mi=function(n){const r=Ir(n);return Ze.encodeByteArray(r,!0)},ae=function(n){return Mi(n).replace(/\./g,"")},xi=function(n){try{return Ze.decodeString(n,!0)}catch{}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kr(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bi=()=>kr().__FIREBASE_DEFAULTS__,Ni=()=>{if(typeof process>"u"||typeof cr>"u")return;const n=cr.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},ji=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const r=n&&xi(n[1]);return r&&JSON.parse(r)},le=()=>{try{return Ri()||Bi()||Ni()||ji()}catch{return}},$i=n=>{var r,s;return(s=(r=le())==null?void 0:r.emulatorHosts)==null?void 0:s[n]},Li=n=>{const r=$i(n);if(!r)return;const s=r.lastIndexOf(":");if(s<=0||s+1===r.length)throw new Error(`Invalid host ${r} with no separate hostname and port!`);const a=parseInt(r.substring(s+1),10);return r[0]==="["?[r.substring(1,s-1),a]:[r.substring(0,s),a]},Dr=()=>{var n;return(n=le())==null?void 0:n.config},ga=n=>{var r;return(r=le())==null?void 0:r[`_${n}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((r,s)=>{this.resolve=r,this.reject=s})}wrapCallback(r){return(s,a)=>{s?this.reject(s):this.resolve(a),typeof r=="function"&&(this.promise.catch(()=>{}),r.length===1?r(s):r(s,a))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pa(n,r){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const s={alg:"none",type:"JWT"},a=r||"demo-project",h=n.iat||0,v=n.sub||n.user_id;if(!v)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const m={iss:`https://securetoken.google.com/${a}`,aud:a,iat:h,exp:h+3600,auth_time:h,sub:v,user_id:v,firebase:{sign_in_provider:"custom",identities:{}},...n};return[ae(JSON.stringify(s)),ae(JSON.stringify(m)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rr(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function da(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Rr())}function Or(){var r;const n=(r=le())==null?void 0:r.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function ma(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function ya(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function va(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function ba(){const n=Rr();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function wa(){return!Or()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Ea(){return!Or()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Qe(){try{return typeof indexedDB=="object"}catch{return!1}}function Hi(){return new Promise((n,r)=>{try{let s=!0;const a="validate-browser-context-for-indexeddb-analytics-module",h=self.indexedDB.open(a);h.onsuccess=()=>{h.result.close(),s||self.indexedDB.deleteDatabase(a),n(!0)},h.onupgradeneeded=()=>{s=!1},h.onerror=()=>{var v;r(((v=h.error)==null?void 0:v.message)||"")}}catch(s){r(s)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fi="FirebaseError";class Ut extends Error{constructor(r,s,a){super(s),this.code=r,this.customData=a,this.name=Fi,Object.setPrototypeOf(this,Ut.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,tn.prototype.create)}}class tn{constructor(r,s,a){this.service=r,this.serviceName=s,this.errors=a}create(r,...s){const a=s[0]||{},h=`${this.service}/${r}`,v=this.errors[r],m=v?Ui(v,a):"Error",E=`${this.serviceName}: ${m} (${h}).`;return new Ut(h,E,a)}}function Ui(n,r){try{let s=0,a="";for(;s<n.length;){const h=n.indexOf("{$",s);if(h===-1){a+=n.substring(s);break}const v=n.indexOf("}",h+2);if(v===-1){a+=n.substring(s);break}const m=n.substring(h+2,v),E=r[m];a+=n.substring(s,h)+(E!=null?String(E):`<${m}?>`),s=v+1}return a}catch{return n}}function Ta(n){for(const r in n)if(Object.prototype.hasOwnProperty.call(n,r))return!1;return!0}function We(n,r){if(n===r)return!0;const s=Object.keys(n),a=Object.keys(r);for(const h of s){if(!a.includes(h))return!1;const v=n[h],m=r[h];if(lr(v)&&lr(m)){if(!We(v,m))return!1}else if(v!==m)return!1}for(const h of a)if(!s.includes(h))return!1;return!0}function lr(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Aa(n){const r=[];for(const[s,a]of Object.entries(n))Array.isArray(a)?a.forEach(h=>{r.push(encodeURIComponent(s)+"="+encodeURIComponent(h))}):r.push(encodeURIComponent(s)+"="+encodeURIComponent(a));return r.length?"&"+r.join("&"):""}function Ca(n){const r={};return n.replace(/^\?/,"").split("&").forEach(a=>{if(a){const[h,v]=a.split("=");r[decodeURIComponent(h)]=decodeURIComponent(v)}}),r}function Sa(n){const r=n.indexOf("?");if(!r)return"";const s=n.indexOf("#",r);return n.substring(r,s>0?s:void 0)}function _a(n,r){const s=new zi(n,r);return s.subscribe.bind(s)}class zi{constructor(r,s){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=s,this.task.then(()=>{r(this)}).catch(a=>{this.error(a)})}next(r){this.forEachObserver(s=>{s.next(r)})}error(r){this.forEachObserver(s=>{s.error(r)}),this.close(r)}complete(){this.forEachObserver(r=>{r.complete()}),this.close()}subscribe(r,s,a){let h;if(r===void 0&&s===void 0&&a===void 0)throw new Error("Missing Observer.");Wi(r,["next","error","complete"])?h=r:h={next:r,error:s,complete:a},h.next===void 0&&(h.next=je),h.error===void 0&&(h.error=je),h.complete===void 0&&(h.complete=je);const v=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?h.error(this.finalError):h.complete()}catch{}}),this.observers.push(h),v}unsubscribeOne(r){this.observers===void 0||this.observers[r]===void 0||(delete this.observers[r],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(r){if(!this.finalized)for(let s=0;s<this.observers.length;s++)this.sendOne(s,r)}sendOne(r,s){this.task.then(()=>{if(this.observers!==void 0&&this.observers[r]!==void 0)try{s(this.observers[r])}catch{}})}close(r){this.finalized||(this.finalized=!0,r!==void 0&&(this.finalError=r),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Wi(n,r){if(typeof n!="object"||n===null)return!1;for(const s of r)if(s in n&&typeof n[s]=="function")return!0;return!1}function je(){}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vi=1e3,Ki=2,Gi=14400*1e3,Xi=.5;function Ji(n,r=Vi,s=Ki){const a=r*Math.pow(s,n),h=Math.round(Xi*a*(Math.random()-.5)*2);return Math.min(Gi,a+h)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function en(n){return n&&n._delegate?n._delegate:n}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yi(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function qi(n){return(await fetch(n,{credentials:"include"})).ok}class pt{constructor(r,s,a){this.name=r,this.instanceFactory=s,this.type=a,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(r){return this.instantiationMode=r,this}setMultipleInstances(r){return this.multipleInstances=r,this}setServiceProps(r){return this.serviceProps=r,this}setInstanceCreatedCallback(r){return this.onInstanceCreated=r,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ft="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zi{constructor(r,s){this.name=r,this.container=s,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(r){const s=this.normalizeInstanceIdentifier(r);if(!this.instancesDeferred.has(s)){const a=new Lt;if(this.instancesDeferred.set(s,a),this.isInitialized(s)||this.shouldAutoInitialize())try{const h=this.getOrInitializeService({instanceIdentifier:s});h&&a.resolve(h)}catch{}}return this.instancesDeferred.get(s).promise}getImmediate(r){const s=this.normalizeInstanceIdentifier(r==null?void 0:r.identifier),a=(r==null?void 0:r.optional)??!1;if(this.isInitialized(s)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:s})}catch(h){if(a)return null;throw h}else{if(a)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(r){if(r.name!==this.name)throw Error(`Mismatching Component ${r.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=r,!!this.shouldAutoInitialize()){if(ts(r))try{this.getOrInitializeService({instanceIdentifier:ft})}catch{}for(const[s,a]of this.instancesDeferred.entries()){const h=this.normalizeInstanceIdentifier(s);try{const v=this.getOrInitializeService({instanceIdentifier:h});a.resolve(v)}catch{}}}}clearInstance(r=ft){this.instancesDeferred.delete(r),this.instancesOptions.delete(r),this.instances.delete(r)}async delete(){const r=Array.from(this.instances.values());await Promise.all([...r.filter(s=>"INTERNAL"in s).map(s=>s.INTERNAL.delete()),...r.filter(s=>"_delete"in s).map(s=>s._delete())])}isComponentSet(){return this.component!=null}isInitialized(r=ft){return this.instances.has(r)}getOptions(r=ft){return this.instancesOptions.get(r)||{}}initialize(r={}){const{options:s={}}=r,a=this.normalizeInstanceIdentifier(r.instanceIdentifier);if(this.isInitialized(a))throw Error(`${this.name}(${a}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const h=this.getOrInitializeService({instanceIdentifier:a,options:s});for(const[v,m]of this.instancesDeferred.entries()){const E=this.normalizeInstanceIdentifier(v);a===E&&m.resolve(h)}return h}onInit(r,s){const a=this.normalizeInstanceIdentifier(s),h=this.onInitCallbacks.get(a)??new Set;h.add(r),this.onInitCallbacks.set(a,h);const v=this.instances.get(a);return v&&r(v,a),()=>{h.delete(r)}}invokeOnInitCallbacks(r,s){const a=this.onInitCallbacks.get(s);if(a)for(const h of a)try{h(r,s)}catch{}}getOrInitializeService({instanceIdentifier:r,options:s={}}){let a=this.instances.get(r);if(!a&&this.component&&(a=this.component.instanceFactory(this.container,{instanceIdentifier:Qi(r),options:s}),this.instances.set(r,a),this.instancesOptions.set(r,s),this.invokeOnInitCallbacks(a,r),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,r,a)}catch{}return a||null}normalizeInstanceIdentifier(r=ft){return this.component?this.component.multipleInstances?r:ft:r}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Qi(n){return n===ft?void 0:n}function ts(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class es{constructor(r){this.name=r,this.providers=new Map}addComponent(r){const s=this.getProvider(r.name);if(s.isComponentSet())throw new Error(`Component ${r.name} has already been registered with ${this.name}`);s.setComponent(r)}addOrOverwriteComponent(r){this.getProvider(r.name).isComponentSet()&&this.providers.delete(r.name),this.addComponent(r)}getProvider(r){if(this.providers.has(r))return this.providers.get(r);const s=new Zi(r,this);return this.providers.set(r,s),s}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var k;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(k||(k={}));const ns={debug:k.DEBUG,verbose:k.VERBOSE,info:k.INFO,warn:k.WARN,error:k.ERROR,silent:k.SILENT},rs=k.INFO,is={[k.DEBUG]:"log",[k.VERBOSE]:"log",[k.INFO]:"info",[k.WARN]:"warn",[k.ERROR]:"error"},ss=(n,r,...s)=>{if(r<n.logLevel)return;const a=new Date().toISOString(),h=is[r];if(!h)throw new Error(`Attempted to log a message with an invalid logType (value: ${r})`)};class Pr{constructor(r){this.name=r,this._logLevel=rs,this._logHandler=ss,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(r){if(!(r in k))throw new TypeError(`Invalid value "${r}" assigned to \`logLevel\``);this._logLevel=r}setLogLevel(r){this._logLevel=typeof r=="string"?ns[r]:r}get logHandler(){return this._logHandler}set logHandler(r){if(typeof r!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=r}get userLogHandler(){return this._userLogHandler}set userLogHandler(r){this._userLogHandler=r}debug(...r){this._userLogHandler&&this._userLogHandler(this,k.DEBUG,...r),this._logHandler(this,k.DEBUG,...r)}log(...r){this._userLogHandler&&this._userLogHandler(this,k.VERBOSE,...r),this._logHandler(this,k.VERBOSE,...r)}info(...r){this._userLogHandler&&this._userLogHandler(this,k.INFO,...r),this._logHandler(this,k.INFO,...r)}warn(...r){this._userLogHandler&&this._userLogHandler(this,k.WARN,...r),this._logHandler(this,k.WARN,...r)}error(...r){this._userLogHandler&&this._userLogHandler(this,k.ERROR,...r),this._logHandler(this,k.ERROR,...r)}}const os=(n,r)=>r.some(s=>n instanceof s);let ur,fr;function as(){return ur||(ur=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function hs(){return fr||(fr=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Mr=new WeakMap,Ve=new WeakMap,xr=new WeakMap,$e=new WeakMap,nn=new WeakMap;function cs(n){const r=new Promise((s,a)=>{const h=()=>{n.removeEventListener("success",v),n.removeEventListener("error",m)},v=()=>{s(st(n.result)),h()},m=()=>{a(n.error),h()};n.addEventListener("success",v),n.addEventListener("error",m)});return r.then(s=>{s instanceof IDBCursor&&Mr.set(s,n)}).catch(()=>{}),nn.set(r,n),r}function ls(n){if(Ve.has(n))return;const r=new Promise((s,a)=>{const h=()=>{n.removeEventListener("complete",v),n.removeEventListener("error",m),n.removeEventListener("abort",m)},v=()=>{s(),h()},m=()=>{a(n.error||new DOMException("AbortError","AbortError")),h()};n.addEventListener("complete",v),n.addEventListener("error",m),n.addEventListener("abort",m)});Ve.set(n,r)}let Ke={get(n,r,s){if(n instanceof IDBTransaction){if(r==="done")return Ve.get(n);if(r==="objectStoreNames")return n.objectStoreNames||xr.get(n);if(r==="store")return s.objectStoreNames[1]?void 0:s.objectStore(s.objectStoreNames[0])}return st(n[r])},set(n,r,s){return n[r]=s,!0},has(n,r){return n instanceof IDBTransaction&&(r==="done"||r==="store")?!0:r in n}};function us(n){Ke=n(Ke)}function fs(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(r,...s){const a=n.call(Le(this),r,...s);return xr.set(a,r.sort?r.sort():[r]),st(a)}:hs().includes(n)?function(...r){return n.apply(Le(this),r),st(Mr.get(this))}:function(...r){return st(n.apply(Le(this),r))}}function gs(n){return typeof n=="function"?fs(n):(n instanceof IDBTransaction&&ls(n),os(n,as())?new Proxy(n,Ke):n)}function st(n){if(n instanceof IDBRequest)return cs(n);if($e.has(n))return $e.get(n);const r=gs(n);return r!==n&&($e.set(n,r),nn.set(r,n)),r}const Le=n=>nn.get(n);function ps(n,r,{blocked:s,upgrade:a,blocking:h,terminated:v}={}){const m=indexedDB.open(n,r),E=st(m);return a&&m.addEventListener("upgradeneeded",A=>{a(st(m.result),A.oldVersion,A.newVersion,st(m.transaction),A)}),s&&m.addEventListener("blocked",A=>s(A.oldVersion,A.newVersion,A)),E.then(A=>{v&&A.addEventListener("close",()=>v()),h&&A.addEventListener("versionchange",T=>h(T.oldVersion,T.newVersion,T))}).catch(()=>{}),E}const ds=["get","getKey","getAll","getAllKeys","count"],ms=["put","add","delete","clear"],He=new Map;function gr(n,r){if(!(n instanceof IDBDatabase&&!(r in n)&&typeof r=="string"))return;if(He.get(r))return He.get(r);const s=r.replace(/FromIndex$/,""),a=r!==s,h=ms.includes(s);if(!(s in(a?IDBIndex:IDBObjectStore).prototype)||!(h||ds.includes(s)))return;const v=async function(m,...E){const A=this.transaction(m,h?"readwrite":"readonly");let T=A.store;return a&&(T=T.index(E.shift())),(await Promise.all([T[s](...E),h&&A.done]))[0]};return He.set(r,v),v}us(n=>({...n,get:(r,s,a)=>gr(r,s)||n.get(r,s,a),has:(r,s)=>!!gr(r,s)||n.has(r,s)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ys{constructor(r){this.container=r}getPlatformInfoString(){return this.container.getProviders().map(s=>{if(vs(s)){const a=s.getImmediate();return`${a.library}/${a.version}`}else return null}).filter(s=>s).join(" ")}}function vs(n){const r=n.getComponent();return(r==null?void 0:r.type)==="VERSION"}const Ge="@firebase/app",pr="0.16.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const J=new Pr("@firebase/app"),bs="@firebase/app-compat",ws="@firebase/analytics-compat",Es="@firebase/analytics",Ts="@firebase/app-check-compat",As="@firebase/app-check",Cs="@firebase/auth",Ss="@firebase/auth-compat",_s="@firebase/database",Is="@firebase/data-connect",ks="@firebase/database-compat",Ds="@firebase/functions",Rs="@firebase/functions-compat",Os="@firebase/installations",Ps="@firebase/installations-compat",Ms="@firebase/messaging",xs="@firebase/messaging-compat",Bs="@firebase/performance",Ns="@firebase/performance-compat",js="@firebase/remote-config",$s="@firebase/remote-config-compat",Ls="@firebase/storage",Hs="@firebase/storage-compat",Fs="@firebase/firestore",Us="@firebase/ai",zs="@firebase/firestore-compat",Ws="firebase",Vs="12.19.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const he="[DEFAULT]",Ks={[Ge]:"fire-core",[bs]:"fire-core-compat",[Es]:"fire-analytics",[ws]:"fire-analytics-compat",[As]:"fire-app-check",[Ts]:"fire-app-check-compat",[Cs]:"fire-auth",[Ss]:"fire-auth-compat",[_s]:"fire-rtdb",[Is]:"fire-data-connect",[ks]:"fire-rtdb-compat",[Ds]:"fire-fn",[Rs]:"fire-fn-compat",[Os]:"fire-iid",[Ps]:"fire-iid-compat",[Ms]:"fire-fcm",[xs]:"fire-fcm-compat",[Bs]:"fire-perf",[Ns]:"fire-perf-compat",[js]:"fire-rc",[$s]:"fire-rc-compat",[Ls]:"fire-gcs",[Hs]:"fire-gcs-compat",[Fs]:"fire-fst",[zs]:"fire-fst-compat",[Us]:"fire-vertex","fire-js":"fire-js",[Ws]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ce=new Map,Gs=new Map,Xe=new Map;function dr(n,r){try{n.container.addComponent(r)}catch(s){J.debug(`Component ${r.name} failed to register with FirebaseApp ${n.name}`,s)}}function Tt(n){const r=n.name;if(Xe.has(r))return J.debug(`There were multiple attempts to register component ${r}.`),!1;Xe.set(r,n);for(const s of ce.values())dr(s,n);for(const s of Gs.values())dr(s,n);return!0}function ue(n,r){const s=n.container.getProvider("heartbeat").getImmediate({optional:!0});return s&&s.triggerHeartbeat(),n.container.getProvider(r)}function Ia(n,r,s=he){ue(n,r).clearInstance(s)}function Xs(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Js={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},X=new tn("app","Firebase",Js);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ys{constructor(r,s,a){this._isDeleted=!1,this._options={...r},this._config={...s},this._name=s.name,this._automaticDataCollectionEnabled=s.automaticDataCollectionEnabled,this._container=a,this.container.addComponent(new pt("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(r){this.checkDestroyed(),this._automaticDataCollectionEnabled=r}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(r){this._isDeleted=r}checkDestroyed(){if(this.isDeleted)throw X.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ka=Vs;function qs(n,r={}){let s=n;typeof r!="object"&&(r={name:r});const a={name:he,automaticDataCollectionEnabled:!0,...r},h=a.name;if(typeof h!="string"||!h)throw X.create("bad-app-name",{appName:String(h)});if(s||(s=Dr()),!s)throw X.create("no-options");const v=ce.get(h);if(v)if(We(s,v.options)){if(We(a,v.config))return v;throw X.create("duplicate-app",{appName:h,mismatchedParam:"config",oldValue:JSON.stringify(v.config),newValue:JSON.stringify(a)})}else throw X.create("duplicate-app",{appName:h,mismatchedParam:"options",oldValue:JSON.stringify(v.options),newValue:JSON.stringify(s)});const m=new es(h);for(const A of Xe.values())m.addComponent(A);const E=new Ys(s,a,m);return ce.set(h,E),E}function Br(n=he){const r=ce.get(n);if(!r&&n===he&&Dr())return qs();if(!r)throw X.create("no-app",{appName:n});return r}function gt(n,r,s){let a=Ks[n]??n;s&&(a+=`-${s}`);const h=a.match(/\s|\//),v=r.match(/\s|\//);if(h||v){const m=[`Unable to register library "${a}" with version "${r}":`];h&&m.push(`library name "${a}" contains illegal characters (whitespace or "/")`),h&&v&&m.push("and"),v&&m.push(`version name "${r}" contains illegal characters (whitespace or "/")`),J.warn(m.join(" "));return}Tt(new pt(`${a}-version`,()=>({library:a,version:r}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zs="firebase-heartbeat-database",Qs=1,Ht="firebase-heartbeat-store";let Fe=null;function Nr(){return Fe||(Fe=ps(Zs,Qs,{upgrade:(n,r)=>{switch(r){case 0:try{n.createObjectStore(Ht)}catch{}}}}).catch(n=>{throw X.create("idb-open",{originalErrorMessage:n.message})})),Fe}async function to(n){try{const s=(await Nr()).transaction(Ht),a=await s.objectStore(Ht).get(jr(n));return await s.done,a}catch(r){if(r instanceof Ut)J.warn(r.message);else{const s=X.create("idb-get",{originalErrorMessage:r==null?void 0:r.message});J.warn(s.message)}}}async function mr(n,r){try{const a=(await Nr()).transaction(Ht,"readwrite");await a.objectStore(Ht).put(r,jr(n)),await a.done}catch(s){if(s instanceof Ut)J.warn(s.message);else{const a=X.create("idb-set",{originalErrorMessage:s==null?void 0:s.message});J.warn(a.message)}}}function jr(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eo=1024,no=30;class ro{constructor(r){this.container=r,this._heartbeatsCache=null;const s=this.container.getProvider("app").getImmediate();this._storage=new so(s),this._heartbeatsCachePromise=this._storage.read().then(a=>(this._heartbeatsCache=a,a))}async triggerHeartbeat(){var r,s;try{const h=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),v=yr();if(((r=this._heartbeatsCache)==null?void 0:r.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((s=this._heartbeatsCache)==null?void 0:s.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===v||this._heartbeatsCache.heartbeats.some(m=>m.date===v))return;if(this._heartbeatsCache.heartbeats.push({date:v,agent:h}),this._heartbeatsCache.heartbeats.length>no){const m=oo(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(m,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(a){J.warn(a)}}async getHeartbeatsHeader(){var r;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((r=this._heartbeatsCache)==null?void 0:r.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const s=yr(),{heartbeatsToSend:a,unsentEntries:h}=io(this._heartbeatsCache.heartbeats),v=ae(JSON.stringify({version:2,heartbeats:a}));return this._heartbeatsCache.lastSentHeartbeatDate=s,h.length>0?(this._heartbeatsCache.heartbeats=h,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),v}catch(s){return J.warn(s),""}}}function yr(){return new Date().toISOString().substring(0,10)}function io(n,r=eo){const s=[];let a=n.slice();for(const h of n){const v=s.find(m=>m.agent===h.agent);if(v){if(v.dates.push(h.date),vr(s)>r){v.dates.pop();break}}else if(s.push({agent:h.agent,dates:[h.date]}),vr(s)>r){s.pop();break}a=a.slice(1)}return{heartbeatsToSend:s,unsentEntries:a}}class so{constructor(r){this.app=r,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Qe()?Hi().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const s=await to(this.app);return s!=null&&s.heartbeats?s:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(r){if(await this._canUseIndexedDBPromise){const a=await this.read();return mr(this.app,{lastSentHeartbeatDate:r.lastSentHeartbeatDate??a.lastSentHeartbeatDate,heartbeats:r.heartbeats})}else return}async add(r){if(await this._canUseIndexedDBPromise){const a=await this.read();return mr(this.app,{lastSentHeartbeatDate:r.lastSentHeartbeatDate??a.lastSentHeartbeatDate,heartbeats:[...a.heartbeats,...r.heartbeats]})}else return}}function vr(n){return ae(JSON.stringify({version:2,heartbeats:n})).length}function oo(n){if(n.length===0)return-1;let r=0,s=n[0].date;for(let a=1;a<n.length;a++)n[a].date<s&&(s=n[a].date,r=a);return r}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ao(n){Tt(new pt("platform-logger",r=>new ys(r),"PRIVATE")),Tt(new pt("heartbeat",r=>new ro(r),"PRIVATE")),gt(Ge,pr,n),gt(Ge,pr,"esm2020"),gt("fire-js","")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ao("");var br=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var ho,co;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function r(g,c){function u(){}u.prototype=c.prototype,g.F=c.prototype,g.prototype=new u,g.prototype.constructor=g,g.D=function(p,f,y){for(var l=Array(arguments.length-2),H=2;H<arguments.length;H++)l[H-2]=arguments[H];return c.prototype[f].apply(p,l)}}function s(){this.blockSize=-1}function a(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}r(a,s),a.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function h(g,c,u){u||(u=0);const p=Array(16);if(typeof c=="string")for(var f=0;f<16;++f)p[f]=c.charCodeAt(u++)|c.charCodeAt(u++)<<8|c.charCodeAt(u++)<<16|c.charCodeAt(u++)<<24;else for(f=0;f<16;++f)p[f]=c[u++]|c[u++]<<8|c[u++]<<16|c[u++]<<24;c=g.g[0],u=g.g[1],f=g.g[2];let y=g.g[3],l;l=c+(y^u&(f^y))+p[0]+3614090360&4294967295,c=u+(l<<7&4294967295|l>>>25),l=y+(f^c&(u^f))+p[1]+3905402710&4294967295,y=c+(l<<12&4294967295|l>>>20),l=f+(u^y&(c^u))+p[2]+606105819&4294967295,f=y+(l<<17&4294967295|l>>>15),l=u+(c^f&(y^c))+p[3]+3250441966&4294967295,u=f+(l<<22&4294967295|l>>>10),l=c+(y^u&(f^y))+p[4]+4118548399&4294967295,c=u+(l<<7&4294967295|l>>>25),l=y+(f^c&(u^f))+p[5]+1200080426&4294967295,y=c+(l<<12&4294967295|l>>>20),l=f+(u^y&(c^u))+p[6]+2821735955&4294967295,f=y+(l<<17&4294967295|l>>>15),l=u+(c^f&(y^c))+p[7]+4249261313&4294967295,u=f+(l<<22&4294967295|l>>>10),l=c+(y^u&(f^y))+p[8]+1770035416&4294967295,c=u+(l<<7&4294967295|l>>>25),l=y+(f^c&(u^f))+p[9]+2336552879&4294967295,y=c+(l<<12&4294967295|l>>>20),l=f+(u^y&(c^u))+p[10]+4294925233&4294967295,f=y+(l<<17&4294967295|l>>>15),l=u+(c^f&(y^c))+p[11]+2304563134&4294967295,u=f+(l<<22&4294967295|l>>>10),l=c+(y^u&(f^y))+p[12]+1804603682&4294967295,c=u+(l<<7&4294967295|l>>>25),l=y+(f^c&(u^f))+p[13]+4254626195&4294967295,y=c+(l<<12&4294967295|l>>>20),l=f+(u^y&(c^u))+p[14]+2792965006&4294967295,f=y+(l<<17&4294967295|l>>>15),l=u+(c^f&(y^c))+p[15]+1236535329&4294967295,u=f+(l<<22&4294967295|l>>>10),l=c+(f^y&(u^f))+p[1]+4129170786&4294967295,c=u+(l<<5&4294967295|l>>>27),l=y+(u^f&(c^u))+p[6]+3225465664&4294967295,y=c+(l<<9&4294967295|l>>>23),l=f+(c^u&(y^c))+p[11]+643717713&4294967295,f=y+(l<<14&4294967295|l>>>18),l=u+(y^c&(f^y))+p[0]+3921069994&4294967295,u=f+(l<<20&4294967295|l>>>12),l=c+(f^y&(u^f))+p[5]+3593408605&4294967295,c=u+(l<<5&4294967295|l>>>27),l=y+(u^f&(c^u))+p[10]+38016083&4294967295,y=c+(l<<9&4294967295|l>>>23),l=f+(c^u&(y^c))+p[15]+3634488961&4294967295,f=y+(l<<14&4294967295|l>>>18),l=u+(y^c&(f^y))+p[4]+3889429448&4294967295,u=f+(l<<20&4294967295|l>>>12),l=c+(f^y&(u^f))+p[9]+568446438&4294967295,c=u+(l<<5&4294967295|l>>>27),l=y+(u^f&(c^u))+p[14]+3275163606&4294967295,y=c+(l<<9&4294967295|l>>>23),l=f+(c^u&(y^c))+p[3]+4107603335&4294967295,f=y+(l<<14&4294967295|l>>>18),l=u+(y^c&(f^y))+p[8]+1163531501&4294967295,u=f+(l<<20&4294967295|l>>>12),l=c+(f^y&(u^f))+p[13]+2850285829&4294967295,c=u+(l<<5&4294967295|l>>>27),l=y+(u^f&(c^u))+p[2]+4243563512&4294967295,y=c+(l<<9&4294967295|l>>>23),l=f+(c^u&(y^c))+p[7]+1735328473&4294967295,f=y+(l<<14&4294967295|l>>>18),l=u+(y^c&(f^y))+p[12]+2368359562&4294967295,u=f+(l<<20&4294967295|l>>>12),l=c+(u^f^y)+p[5]+4294588738&4294967295,c=u+(l<<4&4294967295|l>>>28),l=y+(c^u^f)+p[8]+2272392833&4294967295,y=c+(l<<11&4294967295|l>>>21),l=f+(y^c^u)+p[11]+1839030562&4294967295,f=y+(l<<16&4294967295|l>>>16),l=u+(f^y^c)+p[14]+4259657740&4294967295,u=f+(l<<23&4294967295|l>>>9),l=c+(u^f^y)+p[1]+2763975236&4294967295,c=u+(l<<4&4294967295|l>>>28),l=y+(c^u^f)+p[4]+1272893353&4294967295,y=c+(l<<11&4294967295|l>>>21),l=f+(y^c^u)+p[7]+4139469664&4294967295,f=y+(l<<16&4294967295|l>>>16),l=u+(f^y^c)+p[10]+3200236656&4294967295,u=f+(l<<23&4294967295|l>>>9),l=c+(u^f^y)+p[13]+681279174&4294967295,c=u+(l<<4&4294967295|l>>>28),l=y+(c^u^f)+p[0]+3936430074&4294967295,y=c+(l<<11&4294967295|l>>>21),l=f+(y^c^u)+p[3]+3572445317&4294967295,f=y+(l<<16&4294967295|l>>>16),l=u+(f^y^c)+p[6]+76029189&4294967295,u=f+(l<<23&4294967295|l>>>9),l=c+(u^f^y)+p[9]+3654602809&4294967295,c=u+(l<<4&4294967295|l>>>28),l=y+(c^u^f)+p[12]+3873151461&4294967295,y=c+(l<<11&4294967295|l>>>21),l=f+(y^c^u)+p[15]+530742520&4294967295,f=y+(l<<16&4294967295|l>>>16),l=u+(f^y^c)+p[2]+3299628645&4294967295,u=f+(l<<23&4294967295|l>>>9),l=c+(f^(u|~y))+p[0]+4096336452&4294967295,c=u+(l<<6&4294967295|l>>>26),l=y+(u^(c|~f))+p[7]+1126891415&4294967295,y=c+(l<<10&4294967295|l>>>22),l=f+(c^(y|~u))+p[14]+2878612391&4294967295,f=y+(l<<15&4294967295|l>>>17),l=u+(y^(f|~c))+p[5]+4237533241&4294967295,u=f+(l<<21&4294967295|l>>>11),l=c+(f^(u|~y))+p[12]+1700485571&4294967295,c=u+(l<<6&4294967295|l>>>26),l=y+(u^(c|~f))+p[3]+2399980690&4294967295,y=c+(l<<10&4294967295|l>>>22),l=f+(c^(y|~u))+p[10]+4293915773&4294967295,f=y+(l<<15&4294967295|l>>>17),l=u+(y^(f|~c))+p[1]+2240044497&4294967295,u=f+(l<<21&4294967295|l>>>11),l=c+(f^(u|~y))+p[8]+1873313359&4294967295,c=u+(l<<6&4294967295|l>>>26),l=y+(u^(c|~f))+p[15]+4264355552&4294967295,y=c+(l<<10&4294967295|l>>>22),l=f+(c^(y|~u))+p[6]+2734768916&4294967295,f=y+(l<<15&4294967295|l>>>17),l=u+(y^(f|~c))+p[13]+1309151649&4294967295,u=f+(l<<21&4294967295|l>>>11),l=c+(f^(u|~y))+p[4]+4149444226&4294967295,c=u+(l<<6&4294967295|l>>>26),l=y+(u^(c|~f))+p[11]+3174756917&4294967295,y=c+(l<<10&4294967295|l>>>22),l=f+(c^(y|~u))+p[2]+718787259&4294967295,f=y+(l<<15&4294967295|l>>>17),l=u+(y^(f|~c))+p[9]+3951481745&4294967295,g.g[0]=g.g[0]+c&4294967295,g.g[1]=g.g[1]+(f+(l<<21&4294967295|l>>>11))&4294967295,g.g[2]=g.g[2]+f&4294967295,g.g[3]=g.g[3]+y&4294967295}a.prototype.v=function(g,c){c===void 0&&(c=g.length);const u=c-this.blockSize,p=this.C;let f=this.h,y=0;for(;y<c;){if(f==0)for(;y<=u;)h(this,g,y),y+=this.blockSize;if(typeof g=="string"){for(;y<c;)if(p[f++]=g.charCodeAt(y++),f==this.blockSize){h(this,p),f=0;break}}else for(;y<c;)if(p[f++]=g[y++],f==this.blockSize){h(this,p),f=0;break}}this.h=f,this.o+=c},a.prototype.A=function(){var g=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);g[0]=128;for(var c=1;c<g.length-8;++c)g[c]=0;c=this.o*8;for(var u=g.length-8;u<g.length;++u)g[u]=c&255,c/=256;for(this.v(g),g=Array(16),c=0,u=0;u<4;++u)for(let p=0;p<32;p+=8)g[c++]=this.g[u]>>>p&255;return g};function v(g,c){var u=E;return Object.prototype.hasOwnProperty.call(u,g)?u[g]:u[g]=c(g)}function m(g,c){this.h=c;const u=[];let p=!0;for(let f=g.length-1;f>=0;f--){const y=g[f]|0;p&&y==c||(u[f]=y,p=!1)}this.g=u}var E={};function A(g){return-128<=g&&g<128?v(g,function(c){return new m([c|0],c<0?-1:0)}):new m([g|0],g<0?-1:0)}function T(g){if(isNaN(g)||!isFinite(g))return C;if(g<0)return R(T(-g));const c=[];let u=1;for(let p=0;g>=u;p++)c[p]=g/u|0,u*=4294967296;return new m(c,0)}function x(g,c){if(g.length==0)throw Error("number format error: empty string");if(c=c||10,c<2||36<c)throw Error("radix out of range: "+c);if(g.charAt(0)=="-")return R(x(g.substring(1),c));if(g.indexOf("-")>=0)throw Error('number format error: interior "-" character');const u=T(Math.pow(c,8));let p=C;for(let y=0;y<g.length;y+=8){var f=Math.min(8,g.length-y);const l=parseInt(g.substring(y,y+f),c);f<8?(f=T(Math.pow(c,f)),p=p.j(f).add(T(l))):(p=p.j(u),p=p.add(T(l)))}return p}var C=A(0),V=A(1),W=A(16777216);n=m.prototype,n.m=function(){if(L(this))return-R(this).m();let g=0,c=1;for(let u=0;u<this.g.length;u++){const p=this.i(u);g+=(p>=0?p:4294967296+p)*c,c*=4294967296}return g},n.toString=function(g){if(g=g||10,g<2||36<g)throw Error("radix out of range: "+g);if($(this))return"0";if(L(this))return"-"+R(this).toString(g);const c=T(Math.pow(g,6));var u=this;let p="";for(;;){const f=yt(u,c).g;u=dt(u,f.j(c));let y=((u.g.length>0?u.g[0]:u.h)>>>0).toString(g);if(u=f,$(u))return y+p;for(;y.length<6;)y="0"+y;p=y+p}},n.i=function(g){return g<0?0:g<this.g.length?this.g[g]:this.h};function $(g){if(g.h!=0)return!1;for(let c=0;c<g.g.length;c++)if(g.g[c]!=0)return!1;return!0}function L(g){return g.h==-1}n.l=function(g){return g=dt(this,g),L(g)?-1:$(g)?0:1};function R(g){const c=g.g.length,u=[];for(let p=0;p<c;p++)u[p]=~g.g[p];return new m(u,~g.h).add(V)}n.abs=function(){return L(this)?R(this):this},n.add=function(g){const c=Math.max(this.g.length,g.g.length),u=[];let p=0;for(let f=0;f<=c;f++){let y=p+(this.i(f)&65535)+(g.i(f)&65535),l=(y>>>16)+(this.i(f)>>>16)+(g.i(f)>>>16);p=l>>>16,y&=65535,l&=65535,u[f]=l<<16|y}return new m(u,u[u.length-1]&-2147483648?-1:0)};function dt(g,c){return g.add(R(c))}n.j=function(g){if($(this)||$(g))return C;if(L(this))return L(g)?R(this).j(R(g)):R(R(this).j(g));if(L(g))return R(this.j(R(g)));if(this.l(W)<0&&g.l(W)<0)return T(this.m()*g.m());const c=this.g.length+g.g.length,u=[];for(var p=0;p<2*c;p++)u[p]=0;for(p=0;p<this.g.length;p++)for(let f=0;f<g.g.length;f++){const y=this.i(p)>>>16,l=this.i(p)&65535,H=g.i(f)>>>16,ot=g.i(f)&65535;u[2*p+2*f]+=l*ot,mt(u,2*p+2*f),u[2*p+2*f+1]+=y*ot,mt(u,2*p+2*f+1),u[2*p+2*f+1]+=l*H,mt(u,2*p+2*f+1),u[2*p+2*f+2]+=y*H,mt(u,2*p+2*f+2)}for(g=0;g<c;g++)u[g]=u[2*g+1]<<16|u[2*g];for(g=c;g<2*c;g++)u[g]=0;return new m(u,0)};function mt(g,c){for(;(g[c]&65535)!=g[c];)g[c+1]+=g[c]>>>16,g[c]&=65535,c++}function Y(g,c){this.g=g,this.h=c}function yt(g,c){if($(c))throw Error("division by zero");if($(g))return new Y(C,C);if(L(g))return c=yt(R(g),c),new Y(R(c.g),R(c.h));if(L(c))return c=yt(g,R(c)),new Y(R(c.g),c.h);if(g.g.length>30){if(L(g)||L(c))throw Error("slowDivide_ only works with positive integers.");for(var u=V,p=c;p.l(g)<=0;)u=q(u),p=q(p);var f=z(u,1),y=z(p,1);for(p=z(p,2),u=z(u,2);!$(p);){var l=y.add(p);l.l(g)<=0&&(f=f.add(u),y=l),p=z(p,1),u=z(u,1)}return c=dt(g,f.j(c)),new Y(f,c)}for(f=C;g.l(c)>=0;){for(u=Math.max(1,Math.floor(g.m()/c.m())),p=Math.ceil(Math.log(u)/Math.LN2),p=p<=48?1:Math.pow(2,p-48),y=T(u),l=y.j(c);L(l)||l.l(g)>0;)u-=p,y=T(u),l=y.j(c);$(y)&&(y=V),f=f.add(y),g=dt(g,l)}return new Y(f,g)}n.B=function(g){return yt(this,g).h},n.and=function(g){const c=Math.max(this.g.length,g.g.length),u=[];for(let p=0;p<c;p++)u[p]=this.i(p)&g.i(p);return new m(u,this.h&g.h)},n.or=function(g){const c=Math.max(this.g.length,g.g.length),u=[];for(let p=0;p<c;p++)u[p]=this.i(p)|g.i(p);return new m(u,this.h|g.h)},n.xor=function(g){const c=Math.max(this.g.length,g.g.length),u=[];for(let p=0;p<c;p++)u[p]=this.i(p)^g.i(p);return new m(u,this.h^g.h)};function q(g){const c=g.g.length+1,u=[];for(let p=0;p<c;p++)u[p]=g.i(p)<<1|g.i(p-1)>>>31;return new m(u,g.h)}function z(g,c){const u=c>>5;c%=32;const p=g.g.length-u,f=[];for(let y=0;y<p;y++)f[y]=c>0?g.i(y+u)>>>c|g.i(y+u+1)<<32-c:g.i(y+u);return new m(f,g.h)}a.prototype.digest=a.prototype.A,a.prototype.reset=a.prototype.u,a.prototype.update=a.prototype.v,co=a,m.prototype.add=m.prototype.add,m.prototype.multiply=m.prototype.j,m.prototype.modulo=m.prototype.B,m.prototype.compare=m.prototype.l,m.prototype.toNumber=m.prototype.m,m.prototype.toString=m.prototype.toString,m.prototype.getBits=m.prototype.i,m.fromNumber=T,m.fromString=x,ho=m}).apply(typeof br<"u"?br:typeof self<"u"?self:typeof window<"u"?window:{});var ie=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var lo,uo,fo,go,po,mo,yo,vo;(function(){var n,r=Object.defineProperty;function s(t){t=[typeof globalThis=="object"&&globalThis,t,typeof window=="object"&&window,typeof self=="object"&&self,typeof ie=="object"&&ie];for(var e=0;e<t.length;++e){var i=t[e];if(i&&i.Math==Math)return i}throw Error("Cannot find global object")}var a=s(this);function h(t,e){if(e)t:{var i=a;t=t.split(".");for(var o=0;o<t.length-1;o++){var d=t[o];if(!(d in i))break t;i=i[d]}t=t[t.length-1],o=i[t],e=e(o),e!=o&&e!=null&&r(i,t,{configurable:!0,writable:!0,value:e})}}h("Symbol.dispose",function(t){return t||Symbol("Symbol.dispose")}),h("Array.prototype.values",function(t){return t||function(){return this[Symbol.iterator]()}}),h("Object.entries",function(t){return t||function(e){var i=[],o;for(o in e)Object.prototype.hasOwnProperty.call(e,o)&&i.push([o,e[o]]);return i}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var v=v||{},m=this||self;function E(t){var e=typeof t;return e=="object"&&t!=null||e=="function"}function A(t,e,i){return t.call.apply(t.bind,arguments)}function T(t,e,i){return T=A,T.apply(null,arguments)}function x(t,e){var i=Array.prototype.slice.call(arguments,1);return function(){var o=i.slice();return o.push.apply(o,arguments),t.apply(this,o)}}function C(t,e){function i(){}i.prototype=e.prototype,t.Z=e.prototype,t.prototype=new i,t.prototype.constructor=t,t.Ob=function(o,d,b){for(var w=Array(arguments.length-2),S=2;S<arguments.length;S++)w[S-2]=arguments[S];return e.prototype[d].apply(o,w)}}var V=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?t=>t&&AsyncContext.Snapshot.wrap(t):t=>t;function W(t){const e=t.length;if(e>0){const i=Array(e);for(let o=0;o<e;o++)i[o]=t[o];return i}return[]}function $(t,e){for(let o=1;o<arguments.length;o++){const d=arguments[o];var i=typeof d;if(i=i!="object"?i:d?Array.isArray(d)?"array":i:"null",i=="array"||i=="object"&&typeof d.length=="number"){i=t.length||0;const b=d.length||0;t.length=i+b;for(let w=0;w<b;w++)t[i+w]=d[w]}else t.push(d)}}class L{constructor(e,i){this.i=e,this.j=i,this.h=0,this.g=null}get(){let e;return this.h>0?(this.h--,e=this.g,this.g=e.next,e.next=null):e=this.i(),e}}function R(t){m.setTimeout(()=>{throw t},0)}function dt(){var t=g;let e=null;return t.g&&(e=t.g,t.g=t.g.next,t.g||(t.h=null),e.next=null),e}class mt{constructor(){this.h=this.g=null}add(e,i){const o=Y.get();o.set(e,i),this.h?this.h.next=o:this.g=o,this.h=o}}var Y=new L(()=>new yt,t=>t.reset());class yt{constructor(){this.next=this.g=this.h=null}set(e,i){this.h=e,this.g=i,this.next=null}reset(){this.next=this.g=this.h=null}}let q,z=!1,g=new mt,c=()=>{const t=Promise.resolve(void 0);q=()=>{t.then(u)}};function u(){for(var t;t=dt();){try{t.h.call(t.g)}catch(i){R(i)}var e=Y;e.j(t),e.h<100&&(e.h++,t.next=e.g,e.g=t)}z=!1}function p(){this.u=this.u,this.C=this.C}p.prototype.u=!1,p.prototype.dispose=function(){this.u||(this.u=!0,this.N())},p.prototype[Symbol.dispose]=function(){this.dispose()},p.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function f(t,e){this.type=t,this.g=this.target=e,this.defaultPrevented=!1}f.prototype.h=function(){this.defaultPrevented=!0};var y=(function(){if(!m.addEventListener||!Object.defineProperty)return!1;var t=!1,e=Object.defineProperty({},"passive",{get:function(){t=!0}});try{const i=()=>{};m.addEventListener("test",i,e),m.removeEventListener("test",i,e)}catch{}return t})();function l(t){return/^[\s\xa0]*$/.test(t)}function H(t,e){f.call(this,t?t.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,t&&this.init(t,e)}C(H,f),H.prototype.init=function(t,e){const i=this.type=t.type,o=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;this.target=t.target||t.srcElement,this.g=e,e=t.relatedTarget,e||(i=="mouseover"?e=t.fromElement:i=="mouseout"&&(e=t.toElement)),this.relatedTarget=e,o?(this.clientX=o.clientX!==void 0?o.clientX:o.pageX,this.clientY=o.clientY!==void 0?o.clientY:o.pageY,this.screenX=o.screenX||0,this.screenY=o.screenY||0):(this.clientX=t.clientX!==void 0?t.clientX:t.pageX,this.clientY=t.clientY!==void 0?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType=t.pointerType,this.state=t.state,this.i=t,t.defaultPrevented&&H.Z.h.call(this)},H.prototype.h=function(){H.Z.h.call(this);const t=this.i;t.preventDefault?t.preventDefault():t.returnValue=!1};var ot="closure_listenable_"+(Math.random()*1e6|0),Zr=0;function Qr(t,e,i,o,d){this.listener=t,this.proxy=null,this.src=e,this.type=i,this.capture=!!o,this.ha=d,this.key=++Zr,this.da=this.fa=!1}function zt(t){t.da=!0,t.listener=null,t.proxy=null,t.src=null,t.ha=null}function Wt(t,e,i){for(const o in t)e.call(i,t[o],o,t)}function ti(t,e){for(const i in t)e.call(void 0,t[i],i,t)}function hn(t){const e={};for(const i in t)e[i]=t[i];return e}const cn="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function ln(t,e){let i,o;for(let d=1;d<arguments.length;d++){o=arguments[d];for(i in o)t[i]=o[i];for(let b=0;b<cn.length;b++)i=cn[b],Object.prototype.hasOwnProperty.call(o,i)&&(t[i]=o[i])}}function Vt(t){this.src=t,this.g={},this.h=0}Vt.prototype.add=function(t,e,i,o,d){const b=t.toString();t=this.g[b],t||(t=this.g[b]=[],this.h++);const w=pe(t,e,o,d);return w>-1?(e=t[w],i||(e.fa=!1)):(e=new Qr(e,this.src,b,!!o,d),e.fa=i,t.push(e)),e};function ge(t,e){const i=e.type;if(i in t.g){var o=t.g[i],d=Array.prototype.indexOf.call(o,e,void 0),b;(b=d>=0)&&Array.prototype.splice.call(o,d,1),b&&(zt(e),t.g[i].length==0&&(delete t.g[i],t.h--))}}function pe(t,e,i,o){for(let d=0;d<t.length;++d){const b=t[d];if(!b.da&&b.listener==e&&b.capture==!!i&&b.ha==o)return d}return-1}var de="closure_lm_"+(Math.random()*1e6|0),me={};function un(t,e,i,o,d){if(Array.isArray(e)){for(let b=0;b<e.length;b++)un(t,e[b],i,o,d);return null}return i=pn(i),t&&t[ot]?t.J(e,i,E(o)?!!o.capture:!1,d):ei(t,e,i,!1,o,d)}function ei(t,e,i,o,d,b){if(!e)throw Error("Invalid event type");const w=E(d)?!!d.capture:!!d;let S=ve(t);if(S||(t[de]=S=new Vt(t)),i=S.add(e,i,o,w,b),i.proxy)return i;if(o=ni(),i.proxy=o,o.src=t,o.listener=i,t.addEventListener)y||(d=w),d===void 0&&(d=!1),t.addEventListener(e.toString(),o,d);else if(t.attachEvent)t.attachEvent(gn(e.toString()),o);else if(t.addListener&&t.removeListener)t.addListener(o);else throw Error("addEventListener and attachEvent are unavailable.");return i}function ni(){function t(i){return e.call(t.src,t.listener,i)}const e=ri;return t}function fn(t,e,i,o,d){if(Array.isArray(e))for(var b=0;b<e.length;b++)fn(t,e[b],i,o,d);else o=E(o)?!!o.capture:!!o,i=pn(i),t&&t[ot]?(t=t.i,b=String(e).toString(),b in t.g&&(e=t.g[b],i=pe(e,i,o,d),i>-1&&(zt(e[i]),Array.prototype.splice.call(e,i,1),e.length==0&&(delete t.g[b],t.h--)))):t&&(t=ve(t))&&(e=t.g[e.toString()],t=-1,e&&(t=pe(e,i,o,d)),(i=t>-1?e[t]:null)&&ye(i))}function ye(t){if(typeof t!="number"&&t&&!t.da){var e=t.src;if(e&&e[ot])ge(e.i,t);else{var i=t.type,o=t.proxy;e.removeEventListener?e.removeEventListener(i,o,t.capture):e.detachEvent?e.detachEvent(gn(i),o):e.addListener&&e.removeListener&&e.removeListener(o),(i=ve(e))?(ge(i,t),i.h==0&&(i.src=null,e[de]=null)):zt(t)}}}function gn(t){return t in me?me[t]:me[t]="on"+t}function ri(t,e){if(t.da)t=!0;else{e=new H(e,this);const i=t.listener,o=t.ha||t.src;t.fa&&ye(t),t=i.call(o,e)}return t}function ve(t){return t=t[de],t instanceof Vt?t:null}var be="__closure_events_fn_"+(Math.random()*1e9>>>0);function pn(t){return typeof t=="function"?t:(t[be]||(t[be]=function(e){return t.handleEvent(e)}),t[be])}function B(){p.call(this),this.i=new Vt(this),this.M=this,this.G=null}C(B,p),B.prototype[ot]=!0,B.prototype.removeEventListener=function(t,e,i,o){fn(this,t,e,i,o)};function N(t,e){var i,o=t.G;if(o)for(i=[];o;o=o.G)i.push(o);if(t=t.M,o=e.type||e,typeof e=="string")e=new f(e,t);else if(e instanceof f)e.target=e.target||t;else{var d=e;e=new f(o,t),ln(e,d)}d=!0;let b,w;if(i)for(w=i.length-1;w>=0;w--)b=e.g=i[w],d=Kt(b,o,!0,e)&&d;if(b=e.g=t,d=Kt(b,o,!0,e)&&d,d=Kt(b,o,!1,e)&&d,i)for(w=0;w<i.length;w++)b=e.g=i[w],d=Kt(b,o,!1,e)&&d}B.prototype.N=function(){if(B.Z.N.call(this),this.i){var t=this.i;for(const e in t.g){const i=t.g[e];for(let o=0;o<i.length;o++)zt(i[o]);delete t.g[e],t.h--}}this.G=null},B.prototype.J=function(t,e,i,o){return this.i.add(String(t),e,!1,i,o)},B.prototype.K=function(t,e,i,o){return this.i.add(String(t),e,!0,i,o)};function Kt(t,e,i,o){if(e=t.i.g[String(e)],!e)return!0;e=e.concat();let d=!0;for(let b=0;b<e.length;++b){const w=e[b];if(w&&!w.da&&w.capture==i){const S=w.listener,O=w.ha||w.src;w.fa&&ge(t.i,w),d=S.call(O,o)!==!1&&d}}return d&&!o.defaultPrevented}function ii(t,e){if(typeof t!="function")if(t&&typeof t.handleEvent=="function")t=T(t.handleEvent,t);else throw Error("Invalid listener argument");return Number(e)>2147483647?-1:m.setTimeout(t,e||0)}function dn(t){t.g=ii(()=>{t.g=null,t.i&&(t.i=!1,dn(t))},t.l);const e=t.h;t.h=null,t.m.apply(null,e)}class si extends p{constructor(e,i){super(),this.m=e,this.l=i,this.h=null,this.i=!1,this.g=null}j(e){this.h=arguments,this.g?this.i=!0:dn(this)}N(){super.N(),this.g&&(m.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function At(t){p.call(this),this.h=t,this.g={}}C(At,p);var mn=[];function yn(t){Wt(t.g,function(e,i){this.g.hasOwnProperty(i)&&ye(e)},t),t.g={}}At.prototype.N=function(){At.Z.N.call(this),yn(this)},At.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var we=m.JSON.stringify,oi=m.JSON.parse,ai=class{stringify(t){return m.JSON.stringify(t,void 0)}parse(t){return m.JSON.parse(t,void 0)}};function vn(){}function bn(){}var Ct={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Ee(){f.call(this,"d")}C(Ee,f);function Te(){f.call(this,"c")}C(Te,f);var at={},wn=null;function Gt(){return wn=wn||new B}at.Ia="serverreachability";function En(t){f.call(this,at.Ia,t)}C(En,f);function St(t){const e=Gt();N(e,new En(e))}at.STAT_EVENT="statevent";function Tn(t,e){f.call(this,at.STAT_EVENT,t),this.stat=e}C(Tn,f);function j(t){const e=Gt();N(e,new Tn(e,t))}at.Ja="timingevent";function An(t,e){f.call(this,at.Ja,t),this.size=e}C(An,f);function _t(t,e){if(typeof t!="function")throw Error("Fn must not be null and must be a function");return m.setTimeout(function(){t()},e)}function It(){this.g=!0}It.prototype.ua=function(){this.g=!1};function hi(t,e,i,o,d,b){t.info(function(){if(t.g)if(b){var w="",S=b.split("&");for(let _=0;_<S.length;_++){var O=S[_].split("=");if(O.length>1){const M=O[0];O=O[1];const G=M.split("_");w=G.length>=2&&G[1]=="type"?w+(M+"="+O+"&"):w+(M+"=redacted&")}}}else w=null;else w=b;return"XMLHTTP REQ ("+o+") [attempt "+d+"]: "+e+`
`+i+`
`+w})}function ci(t,e,i,o,d,b,w){t.info(function(){return"XMLHTTP RESP ("+o+") [ attempt "+d+"]: "+e+`
`+i+`
`+b+" "+w})}function vt(t,e,i,o){t.info(function(){return"XMLHTTP TEXT ("+e+"): "+ui(t,i)+(o?" "+o:"")})}function li(t,e){t.info(function(){return"TIMEOUT: "+e})}It.prototype.info=function(){};function ui(t,e){if(!t.g)return e;if(!e)return null;try{const b=JSON.parse(e);if(b){for(t=0;t<b.length;t++)if(Array.isArray(b[t])){var i=b[t];if(!(i.length<2)){var o=i[1];if(Array.isArray(o)&&!(o.length<1)){var d=o[0];if(d!="noop"&&d!="stop"&&d!="close")for(let w=1;w<o.length;w++)o[w]=""}}}}return we(b)}catch{return e}}var Xt={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Cn={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Sn;function Ae(){}C(Ae,vn),Ae.prototype.g=function(){return new XMLHttpRequest},Sn=new Ae;function kt(t){return encodeURIComponent(String(t))}function fi(t){var e=1;t=t.split(":");const i=[];for(;e>0&&t.length;)i.push(t.shift()),e--;return t.length&&i.push(t.join(":")),i}function Z(t,e,i,o){this.j=t,this.i=e,this.l=i,this.S=o||1,this.V=new At(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new _n}function _n(){this.i=null,this.g="",this.h=!1}var In={},Ce={};function Se(t,e,i){t.M=1,t.A=Yt(K(e)),t.u=i,t.R=!0,kn(t,null)}function kn(t,e){t.F=Date.now(),Jt(t),t.B=K(t.A);var i=t.B,o=t.S;Array.isArray(o)||(o=[String(o)]),Fn(i.i,"t",o),t.C=0,i=t.j.L,t.h=new _n,t.g=sr(t.j,i?e:null,!t.u),t.P>0&&(t.O=new si(T(t.Y,t,t.g),t.P)),e=t.V,i=t.g,o=t.ba;var d="readystatechange";Array.isArray(d)||(d&&(mn[0]=d.toString()),d=mn);for(let b=0;b<d.length;b++){const w=un(i,d[b],o||e.handleEvent,!1,e.h||e);if(!w)break;e.g[w.key]=w}e=t.J?hn(t.J):{},t.u?(t.v||(t.v="POST"),e["Content-Type"]="application/x-www-form-urlencoded",t.g.ea(t.B,t.v,t.u,e)):(t.v="GET",t.g.ea(t.B,t.v,null,e)),St(),hi(t.i,t.v,t.B,t.l,t.S,t.u)}Z.prototype.ba=function(t){t=t.target;const e=this.O;e&&et(t)==3?e.j():this.Y(t)},Z.prototype.Y=function(t){try{if(t==this.g)t:{const S=et(this.g),O=this.g.ya(),_=this.g.ca();if(!(S<3)&&(S!=3||this.g&&(this.h.h||this.g.la()||Xn(this.g)))){this.K||S!=4||O==7||(O==8||_<=0?St(3):St(2)),_e(this);var e=this.g.ca();this.X=e;var i=gi(this);if(this.o=e==200,ci(this.i,this.v,this.B,this.l,this.S,S,e),this.o){if(this.U&&!this.L){e:{if(this.g){var o,d=this.g;if((o=d.g?d.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!l(o)){var b=o;break e}}b=null}if(t=b)vt(this.i,this.l,t,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Ie(this,t);else{this.o=!1,this.m=3,j(12),ht(this),Dt(this);break t}}if(this.R){t=!0;let M;for(;!this.K&&this.C<i.length;)if(M=pi(this,i),M==Ce){S==4&&(this.m=4,j(14),t=!1),vt(this.i,this.l,null,"[Incomplete Response]");break}else if(M==In){this.m=4,j(15),vt(this.i,this.l,i,"[Invalid Chunk]"),t=!1;break}else vt(this.i,this.l,M,null),Ie(this,M);if(Dn(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),S!=4||i.length!=0||this.h.h||(this.m=1,j(16),t=!1),this.o=this.o&&t,!t)vt(this.i,this.l,i,"[Invalid Chunked Response]"),ht(this),Dt(this);else if(i.length>0&&!this.W){this.W=!0;var w=this.j;w.g==this&&w.aa&&!w.P&&(w.j.info("Great, no buffering proxy detected. Bytes received: "+i.length),Be(w),w.P=!0,j(11))}}else vt(this.i,this.l,i,null),Ie(this,i);S==4&&ht(this),this.o&&!this.K&&(S==4?er(this.j,this):(this.o=!1,Jt(this)))}else ki(this.g),e==400&&i.indexOf("Unknown SID")>0?(this.m=3,j(12)):(this.m=0,j(13)),ht(this),Dt(this)}}}catch{}finally{}};function gi(t){if(!Dn(t))return t.g.la();const e=Xn(t.g);if(e==="")return"";let i="";const o=e.length,d=et(t.g)==4;if(!t.h.i){if(typeof TextDecoder>"u")return ht(t),Dt(t),"";t.h.i=new m.TextDecoder}for(let b=0;b<o;b++)t.h.h=!0,i+=t.h.i.decode(e[b],{stream:!(d&&b==o-1)});return e.length=0,t.h.g+=i,t.C=0,t.h.g}function Dn(t){return t.g?t.v=="GET"&&t.M!=2&&t.j.Aa:!1}function pi(t,e){var i=t.C,o=e.indexOf(`
`,i);return o==-1?Ce:(i=Number(e.substring(i,o)),isNaN(i)?In:(o+=1,o+i>e.length?Ce:(e=e.slice(o,o+i),t.C=o+i,e)))}Z.prototype.cancel=function(){this.K=!0,ht(this)};function Jt(t){t.T=Date.now()+t.H,Rn(t,t.H)}function Rn(t,e){if(t.D!=null)throw Error("WatchDog timer not null");t.D=_t(T(t.aa,t),e)}function _e(t){t.D&&(m.clearTimeout(t.D),t.D=null)}Z.prototype.aa=function(){this.D=null;const t=Date.now();t-this.T>=0?(li(this.i,this.B),this.M!=2&&(St(),j(17)),ht(this),this.m=2,Dt(this)):Rn(this,this.T-t)};function Dt(t){t.j.I==0||t.K||er(t.j,t)}function ht(t){_e(t);var e=t.O;e&&typeof e.dispose=="function"&&e.dispose(),t.O=null,yn(t.V),t.g&&(e=t.g,t.g=null,e.abort(),e.dispose())}function Ie(t,e){try{var i=t.j;if(i.I!=0&&(i.g==t||ke(i.h,t))){if(!t.L&&ke(i.h,t)&&i.I==3){try{var o=i.Ba.g.parse(e)}catch{o=null}if(Array.isArray(o)&&o.length==3){var d=o;if(d[0]==0){t:if(!i.v){if(i.g)if(i.g.F+3e3<t.F)ee(i),Qt(i);else break t;xe(i),j(18)}}else i.xa=d[1],0<i.xa-i.K&&d[2]<37500&&i.F&&i.A==0&&!i.C&&(i.C=_t(T(i.Va,i),6e3));Mn(i.h)<=1&&i.ta&&(i.ta=void 0)}else lt(i,11)}else if((t.L||i.g==t)&&ee(i),!l(e))for(d=i.Ba.g.parse(e),e=0;e<d.length;e++){let _=d[e];const M=_[0];if(!(M<=i.K))if(i.K=M,_=_[1],i.I==2)if(_[0]=="c"){i.M=_[1],i.ba=_[2];const G=_[3];G!=null&&(i.ka=G,i.j.info("VER="+i.ka));const ut=_[4];ut!=null&&(i.za=ut,i.j.info("SVER="+i.za));const nt=_[5];nt!=null&&typeof nt=="number"&&nt>0&&(o=1.5*nt,i.O=o,i.j.info("backChannelRequestTimeoutMs_="+o)),o=i;const rt=t.g;if(rt){const re=rt.g?rt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(re){var b=o.h;b.g||re.indexOf("spdy")==-1&&re.indexOf("quic")==-1&&re.indexOf("h2")==-1||(b.j=b.l,b.g=new Set,b.h&&(De(b,b.h),b.h=null))}if(o.G){const Ne=rt.g?rt.g.getResponseHeader("X-HTTP-Session-Id"):null;Ne&&(o.wa=Ne,I(o.J,o.G,Ne))}}i.I=3,i.l&&i.l.ra(),i.aa&&(i.T=Date.now()-t.F,i.j.info("Handshake RTT: "+i.T+"ms")),o=i;var w=t;if(o.na=ir(o,o.L?o.ba:null,o.W),w.L){xn(o.h,w);var S=w,O=o.O;O&&(S.H=O),S.D&&(_e(S),Jt(S)),o.g=w}else Qn(o);i.i.length>0&&te(i)}else _[0]!="stop"&&_[0]!="close"||lt(i,7);else i.I==3&&(_[0]=="stop"||_[0]=="close"?_[0]=="stop"?lt(i,7):Me(i):_[0]!="noop"&&i.l&&i.l.qa(_),i.A=0)}}St(4)}catch{}}var di=class{constructor(t,e){this.g=t,this.map=e}};function On(t){this.l=t||10,m.PerformanceNavigationTiming?(t=m.performance.getEntriesByType("navigation"),t=t.length>0&&(t[0].nextHopProtocol=="hq"||t[0].nextHopProtocol=="h2")):t=!!(m.chrome&&m.chrome.loadTimes&&m.chrome.loadTimes()&&m.chrome.loadTimes().wasFetchedViaSpdy),this.j=t?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Pn(t){return t.h?!0:t.g?t.g.size>=t.j:!1}function Mn(t){return t.h?1:t.g?t.g.size:0}function ke(t,e){return t.h?t.h==e:t.g?t.g.has(e):!1}function De(t,e){t.g?t.g.add(e):t.h=e}function xn(t,e){t.h&&t.h==e?t.h=null:t.g&&t.g.has(e)&&t.g.delete(e)}On.prototype.cancel=function(){if(this.i=Bn(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const t of this.g.values())t.cancel();this.g.clear()}};function Bn(t){if(t.h!=null)return t.i.concat(t.h.G);if(t.g!=null&&t.g.size!==0){let e=t.i;for(const i of t.g.values())e=e.concat(i.G);return e}return W(t.i)}var Nn=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function mi(t,e){if(t){t=t.split("&");for(let i=0;i<t.length;i++){const o=t[i].indexOf("=");let d,b=null;o>=0?(d=t[i].substring(0,o),b=t[i].substring(o+1)):d=t[i],e(d,b?decodeURIComponent(b.replace(/\+/g," ")):"")}}}function Q(t){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let e;t instanceof Q?(this.l=t.l,Rt(this,t.j),this.o=t.o,this.g=t.g,Ot(this,t.u),this.h=t.h,Re(this,Un(t.i)),this.m=t.m):t&&(e=String(t).match(Nn))?(this.l=!1,Rt(this,e[1]||"",!0),this.o=Pt(e[2]||""),this.g=Pt(e[3]||"",!0),Ot(this,e[4]),this.h=Pt(e[5]||"",!0),Re(this,e[6]||"",!0),this.m=Pt(e[7]||"")):(this.l=!1,this.i=new xt(null,this.l))}Q.prototype.toString=function(){const t=[];var e=this.j;e&&t.push(Mt(e,jn,!0),":");var i=this.g;return(i||e=="file")&&(t.push("//"),(e=this.o)&&t.push(Mt(e,jn,!0),"@"),t.push(kt(i).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),i=this.u,i!=null&&t.push(":",String(i))),(i=this.h)&&(this.g&&i.charAt(0)!="/"&&t.push("/"),t.push(Mt(i,i.charAt(0)=="/"?bi:vi,!0))),(i=this.i.toString())&&t.push("?",i),(i=this.m)&&t.push("#",Mt(i,Ei)),t.join("")},Q.prototype.resolve=function(t){const e=K(this);let i=!!t.j;i?Rt(e,t.j):i=!!t.o,i?e.o=t.o:i=!!t.g,i?e.g=t.g:i=t.u!=null;var o=t.h;if(i)Ot(e,t.u);else if(i=!!t.h){if(o.charAt(0)!="/")if(this.g&&!this.h)o="/"+o;else{var d=e.h.lastIndexOf("/");d!=-1&&(o=e.h.slice(0,d+1)+o)}if(d=o,d==".."||d==".")o="";else if(d.indexOf("./")!=-1||d.indexOf("/.")!=-1){o=d.lastIndexOf("/",0)==0,d=d.split("/");const b=[];for(let w=0;w<d.length;){const S=d[w++];S=="."?o&&w==d.length&&b.push(""):S==".."?((b.length>1||b.length==1&&b[0]!="")&&b.pop(),o&&w==d.length&&b.push("")):(b.push(S),o=!0)}o=b.join("/")}else o=d}return i?e.h=o:i=t.i.toString()!=="",i?Re(e,Un(t.i)):i=!!t.m,i&&(e.m=t.m),e};function K(t){return new Q(t)}function Rt(t,e,i){t.j=i?Pt(e,!0):e,t.j&&(t.j=t.j.replace(/:$/,""))}function Ot(t,e){if(e){if(e=Number(e),isNaN(e)||e<0)throw Error("Bad port number "+e);t.u=e}else t.u=null}function Re(t,e,i){e instanceof xt?(t.i=e,Ti(t.i,t.l)):(i||(e=Mt(e,wi)),t.i=new xt(e,t.l))}function I(t,e,i){t.i.set(e,i)}function Yt(t){return I(t,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),t}function Pt(t,e){return t?e?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function Mt(t,e,i){return typeof t=="string"?(t=encodeURI(t).replace(e,yi),i&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function yi(t){return t=t.charCodeAt(0),"%"+(t>>4&15).toString(16)+(t&15).toString(16)}var jn=/[#\/\?@]/g,vi=/[#\?:]/g,bi=/[#\?]/g,wi=/[#\?@]/g,Ei=/#/g;function xt(t,e){this.h=this.g=null,this.i=t||null,this.j=!!e}function ct(t){t.g||(t.g=new Map,t.h=0,t.i&&mi(t.i,function(e,i){t.add(decodeURIComponent(e.replace(/\+/g," ")),i)}))}n=xt.prototype,n.add=function(t,e){ct(this),this.i=null,t=bt(this,t);let i=this.g.get(t);return i||this.g.set(t,i=[]),i.push(e),this.h+=1,this};function $n(t,e){ct(t),e=bt(t,e),t.g.has(e)&&(t.i=null,t.h-=t.g.get(e).length,t.g.delete(e))}function Ln(t,e){return ct(t),e=bt(t,e),t.g.has(e)}n.forEach=function(t,e){ct(this),this.g.forEach(function(i,o){i.forEach(function(d){t.call(e,d,o,this)},this)},this)};function Hn(t,e){ct(t);let i=[];if(typeof e=="string")Ln(t,e)&&(i=i.concat(t.g.get(bt(t,e))));else for(t=Array.from(t.g.values()),e=0;e<t.length;e++)i=i.concat(t[e]);return i}n.set=function(t,e){return ct(this),this.i=null,t=bt(this,t),Ln(this,t)&&(this.h-=this.g.get(t).length),this.g.set(t,[e]),this.h+=1,this},n.get=function(t,e){return t?(t=Hn(this,t),t.length>0?String(t[0]):e):e};function Fn(t,e,i){$n(t,e),i.length>0&&(t.i=null,t.g.set(bt(t,e),W(i)),t.h+=i.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const t=[],e=Array.from(this.g.keys());for(let o=0;o<e.length;o++){var i=e[o];const d=kt(i);i=Hn(this,i);for(let b=0;b<i.length;b++){let w=d;i[b]!==""&&(w+="="+kt(i[b])),t.push(w)}}return this.i=t.join("&")};function Un(t){const e=new xt;return e.i=t.i,t.g&&(e.g=new Map(t.g),e.h=t.h),e}function bt(t,e){return e=String(e),t.j&&(e=e.toLowerCase()),e}function Ti(t,e){e&&!t.j&&(ct(t),t.i=null,t.g.forEach(function(i,o){const d=o.toLowerCase();o!=d&&($n(this,o),Fn(this,d,i))},t)),t.j=e}function Ai(t,e){const i=new It;if(m.Image){const o=new Image;o.onload=x(tt,i,"TestLoadImage: loaded",!0,e,o),o.onerror=x(tt,i,"TestLoadImage: error",!1,e,o),o.onabort=x(tt,i,"TestLoadImage: abort",!1,e,o),o.ontimeout=x(tt,i,"TestLoadImage: timeout",!1,e,o),m.setTimeout(function(){o.ontimeout&&o.ontimeout()},1e4),o.src=t}else e(!1)}function Ci(t,e){const i=new It,o=new AbortController,d=setTimeout(()=>{o.abort(),tt(i,"TestPingServer: timeout",!1,e)},1e4);fetch(t,{signal:o.signal}).then(b=>{clearTimeout(d),b.ok?tt(i,"TestPingServer: ok",!0,e):tt(i,"TestPingServer: server error",!1,e)}).catch(()=>{clearTimeout(d),tt(i,"TestPingServer: error",!1,e)})}function tt(t,e,i,o,d){try{d&&(d.onload=null,d.onerror=null,d.onabort=null,d.ontimeout=null),o(i)}catch{}}function Si(){this.g=new ai}function Oe(t){this.i=t.Sb||null,this.h=t.ab||!1}C(Oe,vn),Oe.prototype.g=function(){return new qt(this.i,this.h)};function qt(t,e){B.call(this),this.H=t,this.o=e,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}C(qt,B),n=qt.prototype,n.open=function(t,e){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=t,this.D=e,this.readyState=1,Nt(this)},n.send=function(t){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const e={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};t&&(e.body=t),(this.H||m).fetch(new Request(this.D,e)).then(this.Pa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Bt(this)),this.readyState=0},n.Pa=function(t){if(this.g&&(this.l=t,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=t.headers,this.readyState=2,Nt(this)),this.g&&(this.readyState=3,Nt(this),this.g)))if(this.responseType==="arraybuffer")t.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof m.ReadableStream<"u"&&"body"in t){if(this.j=t.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;zn(this)}else t.text().then(this.Oa.bind(this),this.ga.bind(this))};function zn(t){t.j.read().then(t.Ma.bind(t)).catch(t.ga.bind(t))}n.Ma=function(t){if(this.g){if(this.o&&t.value)this.response.push(t.value);else if(!this.o){var e=t.value?t.value:new Uint8Array(0);(e=this.B.decode(e,{stream:!t.done}))&&(this.response=this.responseText+=e)}t.done?Bt(this):Nt(this),this.readyState==3&&zn(this)}},n.Oa=function(t){this.g&&(this.response=this.responseText=t,Bt(this))},n.Na=function(t){this.g&&(this.response=t,Bt(this))},n.ga=function(){this.g&&Bt(this)};function Bt(t){t.readyState=4,t.l=null,t.j=null,t.B=null,Nt(t)}n.setRequestHeader=function(t,e){this.A.append(t,e)},n.getResponseHeader=function(t){return this.h&&this.h.get(t.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const t=[],e=this.h.entries();for(var i=e.next();!i.done;)i=i.value,t.push(i[0]+": "+i[1]),i=e.next();return t.join(`\r
`)};function Nt(t){t.onreadystatechange&&t.onreadystatechange.call(t)}Object.defineProperty(qt.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(t){this.m=t?"include":"same-origin"}});function Wn(t){let e="";return Wt(t,function(i,o){e+=o,e+=":",e+=i,e+=`\r
`}),e}function Pe(t,e,i){t:{for(o in i){var o=!1;break t}o=!0}o||(i=Wn(i),typeof t=="string"?i!=null&&kt(i):I(t,e,i))}function D(t){B.call(this),this.headers=new Map,this.L=t||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}C(D,B);var _i=/^https?$/i,Ii=["POST","PUT"];n=D.prototype,n.Fa=function(t){this.H=t},n.ea=function(t,e,i,o){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+t);e=e?e.toUpperCase():"GET",this.D=t,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Sn.g(),this.g.onreadystatechange=V(T(this.Ca,this));try{this.B=!0,this.g.open(e,String(t),!0),this.B=!1}catch(b){Vn(this,b);return}if(t=i||"",i=new Map(this.headers),o)if(Object.getPrototypeOf(o)===Object.prototype)for(var d in o)i.set(d,o[d]);else if(typeof o.keys=="function"&&typeof o.get=="function")for(const b of o.keys())i.set(b,o.get(b));else throw Error("Unknown input type for opt_headers: "+String(o));o=Array.from(i.keys()).find(b=>b.toLowerCase()=="content-type"),d=m.FormData&&t instanceof m.FormData,!(Array.prototype.indexOf.call(Ii,e,void 0)>=0)||o||d||i.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[b,w]of i)this.g.setRequestHeader(b,w);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(t),this.v=!1}catch(b){Vn(this,b)}};function Vn(t,e){t.h=!1,t.g&&(t.j=!0,t.g.abort(),t.j=!1),t.l=e,t.o=5,Kn(t),Zt(t)}function Kn(t){t.A||(t.A=!0,N(t,"complete"),N(t,"error"))}n.abort=function(t){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=t||7,N(this,"complete"),N(this,"abort"),Zt(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Zt(this,!0)),D.Z.N.call(this)},n.Ca=function(){this.u||(this.B||this.v||this.j?Gn(this):this.Xa())},n.Xa=function(){Gn(this)};function Gn(t){if(t.h&&typeof v<"u"){if(t.v&&et(t)==4)setTimeout(t.Ca.bind(t),0);else if(N(t,"readystatechange"),et(t)==4){t.h=!1;try{const b=t.ca();t:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var e=!0;break t;default:e=!1}var i;if(!(i=e)){var o;if(o=b===0){let w=String(t.D).match(Nn)[1]||null;!w&&m.self&&m.self.location&&(w=m.self.location.protocol.slice(0,-1)),o=!_i.test(w?w.toLowerCase():"")}i=o}if(i)N(t,"complete"),N(t,"success");else{t.o=6;try{var d=et(t)>2?t.g.statusText:""}catch{d=""}t.l=d+" ["+t.ca()+"]",Kn(t)}}finally{Zt(t)}}}}function Zt(t,e){if(t.g){t.m&&(clearTimeout(t.m),t.m=null);const i=t.g;t.g=null,e||N(t,"ready");try{i.onreadystatechange=null}catch{}}}n.isActive=function(){return!!this.g};function et(t){return t.g?t.g.readyState:0}n.ca=function(){try{return et(this)>2?this.g.status:-1}catch{return-1}},n.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.La=function(t){if(this.g){var e=this.g.responseText;return t&&e.indexOf(t)==0&&(e=e.substring(t.length)),oi(e)}};function Xn(t){try{if(!t.g)return null;if("response"in t.g)return t.g.response;switch(t.F){case"":case"text":return t.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in t.g)return t.g.mozResponseArrayBuffer}return null}catch{return null}}function ki(t){const e={};t=(t.g&&et(t)>=2&&t.g.getAllResponseHeaders()||"").split(`\r
`);for(let o=0;o<t.length;o++){if(l(t[o]))continue;var i=fi(t[o]);const d=i[0];if(i=i[1],typeof i!="string")continue;i=i.trim();const b=e[d]||[];e[d]=b,b.push(i)}ti(e,function(o){return o.join(", ")})}n.ya=function(){return this.o},n.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function jt(t,e,i){return i&&i.internalChannelParams&&i.internalChannelParams[t]||e}function Jn(t){this.za=0,this.i=[],this.j=new It,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=jt("failFast",!1,t),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=jt("baseRetryDelayMs",5e3,t),this.Za=jt("retryDelaySeedMs",1e4,t),this.Ta=jt("forwardChannelMaxRetries",2,t),this.va=jt("forwardChannelRequestTimeoutMs",2e4,t),this.ma=t&&t.xmlHttpFactory||void 0,this.Ua=t&&t.Rb||void 0,this.Aa=t&&t.useFetchStreams||!1,this.O=void 0,this.L=t&&t.supportsCrossDomainXhr||!1,this.M="",this.h=new On(t&&t.concurrentRequestLimit),this.Ba=new Si,this.S=t&&t.fastHandshake||!1,this.R=t&&t.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=t&&t.Pb||!1,t&&t.ua&&this.j.ua(),t&&t.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&t&&t.detectBufferingProxy||!1,this.ia=void 0,t&&t.longPollingTimeout&&t.longPollingTimeout>0&&(this.ia=t.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}n=Jn.prototype,n.ka=8,n.I=1,n.connect=function(t,e,i,o){j(0),this.W=t,this.H=e||{},i&&o!==void 0&&(this.H.OSID=i,this.H.OAID=o),this.F=this.X,this.J=ir(this,null,this.W),te(this)};function Me(t){if(Yn(t),t.I==3){var e=t.V++,i=K(t.J);if(I(i,"SID",t.M),I(i,"RID",e),I(i,"TYPE","terminate"),$t(t,i),e=new Z(t,t.j,e),e.M=2,e.A=Yt(K(i)),i=!1,m.navigator&&m.navigator.sendBeacon)try{i=m.navigator.sendBeacon(e.A.toString(),"")}catch{}!i&&m.Image&&(new Image().src=e.A,i=!0),i||(e.g=sr(e.j,null),e.g.ea(e.A)),e.F=Date.now(),Jt(e)}rr(t)}function Qt(t){t.g&&(Be(t),t.g.cancel(),t.g=null)}function Yn(t){Qt(t),t.v&&(m.clearTimeout(t.v),t.v=null),ee(t),t.h.cancel(),t.m&&(typeof t.m=="number"&&m.clearTimeout(t.m),t.m=null)}function te(t){if(!Pn(t.h)&&!t.m){t.m=!0;var e=t.Ea;q||c(),z||(q(),z=!0),g.add(e,t),t.D=0}}function Di(t,e){return Mn(t.h)>=t.h.j-(t.m?1:0)?!1:t.m?(t.i=e.G.concat(t.i),!0):t.I==1||t.I==2||t.D>=(t.Sa?0:t.Ta)?!1:(t.m=_t(T(t.Ea,t,e),nr(t,t.D)),t.D++,!0)}n.Ea=function(t){if(this.m)if(this.m=null,this.I==1){if(!t){this.V=Math.floor(Math.random()*1e5),t=this.V++;const d=new Z(this,this.j,t);let b=this.o;if(this.U&&(b?(b=hn(b),ln(b,this.U)):b=this.U),this.u!==null||this.R||(d.J=b,b=null),this.S)t:{for(var e=0,i=0;i<this.i.length;i++){e:{var o=this.i[i];if("__data__"in o.map&&(o=o.map.__data__,typeof o=="string")){o=o.length;break e}o=void 0}if(o===void 0)break;if(e+=o,e>4096){e=i;break t}if(e===4096||i===this.i.length-1){e=i+1;break t}}e=1e3}else e=1e3;e=Zn(this,d,e),i=K(this.J),I(i,"RID",t),I(i,"CVER",22),this.G&&I(i,"X-HTTP-Session-Id",this.G),$t(this,i),b&&(this.R?e="headers="+kt(Wn(b))+"&"+e:this.u&&Pe(i,this.u,b)),De(this.h,d),this.Ra&&I(i,"TYPE","init"),this.S?(I(i,"$req",e),I(i,"SID","null"),d.U=!0,Se(d,i,null)):Se(d,i,e),this.I=2}}else this.I==3&&(t?qn(this,t):this.i.length==0||Pn(this.h)||qn(this))};function qn(t,e){var i;e?i=e.l:i=t.V++;const o=K(t.J);I(o,"SID",t.M),I(o,"RID",i),I(o,"AID",t.K),$t(t,o),t.u&&t.o&&Pe(o,t.u,t.o),i=new Z(t,t.j,i,t.D+1),t.u===null&&(i.J=t.o),e&&(t.i=e.G.concat(t.i)),e=Zn(t,i,1e3),i.H=Math.round(t.va*.5)+Math.round(t.va*.5*Math.random()),De(t.h,i),Se(i,o,e)}function $t(t,e){t.H&&Wt(t.H,function(i,o){I(e,o,i)}),t.l&&Wt({},function(i,o){I(e,o,i)})}function Zn(t,e,i){i=Math.min(t.i.length,i);const o=t.l?T(t.l.Ka,t.l,t):null;t:{var d=t.i;let S=-1;for(;;){const O=["count="+i];S==-1?i>0?(S=d[0].g,O.push("ofs="+S)):S=0:O.push("ofs="+S);let _=!0;for(let M=0;M<i;M++){var b=d[M].g;const G=d[M].map;if(b-=S,b<0)S=Math.max(0,d[M].g-100),_=!1;else try{b="req"+b+"_"||"";try{var w=G instanceof Map?G:Object.entries(G);for(const[ut,nt]of w){let rt=nt;E(nt)&&(rt=we(nt)),O.push(b+ut+"="+encodeURIComponent(rt))}}catch(ut){throw O.push(b+"type="+encodeURIComponent("_badmap")),ut}}catch{o&&o(G)}}if(_){w=O.join("&");break t}}w=void 0}return t=t.i.splice(0,i),e.G=t,w}function Qn(t){if(!t.g&&!t.v){t.Y=1;var e=t.Da;q||c(),z||(q(),z=!0),g.add(e,t),t.A=0}}function xe(t){return t.g||t.v||t.A>=3?!1:(t.Y++,t.v=_t(T(t.Da,t),nr(t,t.A)),t.A++,!0)}n.Da=function(){if(this.v=null,tr(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var t=4*this.T;this.j.info("BP detection timer enabled: "+t),this.B=_t(T(this.Wa,this),t)}},n.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,j(10),Qt(this),tr(this))};function Be(t){t.B!=null&&(m.clearTimeout(t.B),t.B=null)}function tr(t){t.g=new Z(t,t.j,"rpc",t.Y),t.u===null&&(t.g.J=t.o),t.g.P=0;var e=K(t.na);I(e,"RID","rpc"),I(e,"SID",t.M),I(e,"AID",t.K),I(e,"CI",t.F?"0":"1"),!t.F&&t.ia&&I(e,"TO",t.ia),I(e,"TYPE","xmlhttp"),$t(t,e),t.u&&t.o&&Pe(e,t.u,t.o),t.O&&(t.g.H=t.O);var i=t.g;t=t.ba,i.M=1,i.A=Yt(K(e)),i.u=null,i.R=!0,kn(i,t)}n.Va=function(){this.C!=null&&(this.C=null,Qt(this),xe(this),j(19))};function ee(t){t.C!=null&&(m.clearTimeout(t.C),t.C=null)}function er(t,e){var i=null;if(t.g==e){ee(t),Be(t),t.g=null;var o=2}else if(ke(t.h,e))i=e.G,xn(t.h,e),o=1;else return;if(t.I!=0){if(e.o)if(o==1){i=e.u?e.u.length:0,e=Date.now()-e.F;var d=t.D;o=Gt(),N(o,new An(o,i)),te(t)}else Qn(t);else if(d=e.m,d==3||d==0&&e.X>0||!(o==1&&Di(t,e)||o==2&&xe(t)))switch(i&&i.length>0&&(e=t.h,e.i=e.i.concat(i)),d){case 1:lt(t,5);break;case 4:lt(t,10);break;case 3:lt(t,6);break;default:lt(t,2)}}}function nr(t,e){let i=t.Qa+Math.floor(Math.random()*t.Za);return t.isActive()||(i*=2),i*e}function lt(t,e){if(t.j.info("Error code "+e),e==2){var i=T(t.bb,t),o=t.Ua;const d=!o;o=new Q(o||"//www.google.com/images/cleardot.gif"),m.location&&m.location.protocol=="http"||Rt(o,"https"),Yt(o),d?Ai(o.toString(),i):Ci(o.toString(),i)}else j(2);t.I=0,t.l&&t.l.pa(e),rr(t),Yn(t)}n.bb=function(t){t?(this.j.info("Successfully pinged google.com"),j(2)):(this.j.info("Failed to ping google.com"),j(1))};function rr(t){if(t.I=0,t.ja=[],t.l){const e=Bn(t.h);(e.length!=0||t.i.length!=0)&&($(t.ja,e),$(t.ja,t.i),t.h.i.length=0,W(t.i),t.i.length=0),t.l.oa()}}function ir(t,e,i){var o=i instanceof Q?K(i):new Q(i);if(o.g!="")e&&(o.g=e+"."+o.g),Ot(o,o.u);else{var d=m.location;o=d.protocol,e=e?e+"."+d.hostname:d.hostname,d=+d.port;const b=new Q(null);o&&Rt(b,o),e&&(b.g=e),d&&Ot(b,d),i&&(b.h=i),o=b}return i=t.G,e=t.wa,i&&e&&I(o,i,e),I(o,"VER",t.ka),$t(t,o),o}function sr(t,e,i){if(e&&!t.L)throw Error("Can't create secondary domain capable XhrIo object.");return e=t.Aa&&!t.ma?new D(new Oe({ab:i})):new D(t.ma),e.Fa(t.L),e}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function or(){}n=or.prototype,n.ra=function(){},n.qa=function(){},n.pa=function(){},n.oa=function(){},n.isActive=function(){return!0},n.Ka=function(){};function ne(){}ne.prototype.g=function(t,e){return new U(t,e)};function U(t,e){B.call(this),this.g=new Jn(e),this.l=t,this.h=e&&e.messageUrlParams||null,t=e&&e.messageHeaders||null,e&&e.clientProtocolHeaderRequired&&(t?t["X-Client-Protocol"]="webchannel":t={"X-Client-Protocol":"webchannel"}),this.g.o=t,t=e&&e.initMessageHeaders||null,e&&e.messageContentType&&(t?t["X-WebChannel-Content-Type"]=e.messageContentType:t={"X-WebChannel-Content-Type":e.messageContentType}),e&&e.sa&&(t?t["X-WebChannel-Client-Profile"]=e.sa:t={"X-WebChannel-Client-Profile":e.sa}),this.g.U=t,(t=e&&e.Qb)&&!l(t)&&(this.g.u=t),this.A=e&&e.supportsCrossDomainXhr||!1,this.v=e&&e.sendRawJson||!1,(e=e&&e.httpSessionIdParam)&&!l(e)&&(this.g.G=e,t=this.h,t!==null&&e in t&&(t=this.h,e in t&&delete t[e])),this.j=new wt(this)}C(U,B),U.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},U.prototype.close=function(){Me(this.g)},U.prototype.o=function(t){var e=this.g;if(typeof t=="string"){var i={};i.__data__=t,t=i}else this.v&&(i={},i.__data__=we(t),t=i);e.i.push(new di(e.Ya++,t)),e.I==3&&te(e)},U.prototype.N=function(){this.g.l=null,delete this.j,Me(this.g),delete this.g,U.Z.N.call(this)};function ar(t){Ee.call(this),t.__headers__&&(this.headers=t.__headers__,this.statusCode=t.__status__,delete t.__headers__,delete t.__status__);var e=t.__sm__;if(e){t:{for(const i in e){t=i;break t}t=void 0}(this.i=t)&&(t=this.i,e=e!==null&&t in e?e[t]:void 0),this.data=e}else this.data=t}C(ar,Ee);function hr(){Te.call(this),this.status=1}C(hr,Te);function wt(t){this.g=t}C(wt,or),wt.prototype.ra=function(){N(this.g,"a")},wt.prototype.qa=function(t){N(this.g,new ar(t))},wt.prototype.pa=function(t){N(this.g,new hr)},wt.prototype.oa=function(){N(this.g,"b")},ne.prototype.createWebChannel=ne.prototype.g,U.prototype.send=U.prototype.o,U.prototype.open=U.prototype.m,U.prototype.close=U.prototype.close,vo=function(){return new ne},yo=function(){return Gt()},mo=at,po={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Xt.NO_ERROR=0,Xt.TIMEOUT=8,Xt.HTTP_ERROR=6,go=Xt,Cn.COMPLETE="complete",fo=Cn,bn.EventType=Ct,Ct.OPEN="a",Ct.CLOSE="b",Ct.ERROR="c",Ct.MESSAGE="d",B.prototype.listen=B.prototype.J,uo=bn,D.prototype.listenOnce=D.prototype.K,D.prototype.getLastError=D.prototype.Ha,D.prototype.getLastErrorCode=D.prototype.ya,D.prototype.getStatus=D.prototype.ca,D.prototype.getResponseJson=D.prototype.La,D.prototype.getResponseText=D.prototype.la,D.prototype.send=D.prototype.ea,D.prototype.setWithCredentials=D.prototype.Fa,lo=D}).apply(typeof ie<"u"?ie:typeof self<"u"?self:typeof window<"u"?window:{});var bo="firebase",wo="12.19.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */gt(bo,wo,"app");/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $r="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Eo{constructor(r,s,a,h){this.app=r,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,Xs(r)&&r.settings.appCheckToken&&(this.serverAppAppCheckToken=r.settings.appCheckToken),this.auth=s.getImmediate({optional:!0}),this.messaging=a.getImmediate({optional:!0}),this.auth||s.get().then(v=>this.auth=v,()=>{}),this.messaging||a.get().then(v=>this.messaging=v,()=>{}),this.appCheck||h==null||h.get().then(v=>this.appCheck=v,()=>{})}async getAuthToken(){if(this.auth)try{const r=await this.auth.getToken();return r==null?void 0:r.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(r){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const s=r?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return s.error?null:s.token}return null}async getContext(r){const s=await this.getAuthToken(),a=await this.getMessagingToken(),h=await this.getAppCheckToken(r);return{authToken:s,messagingToken:a,appCheckToken:h}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Je="us-central1";class To{constructor(r,s,a,h,v=Je,m=(...E)=>fetch(...E)){this.app=r,this.fetchImpl=m,this.emulatorOrigin=null,this.contextProvider=new Eo(r,s,a,h),this.cancelAllRequests=new Promise(E=>{this.deleteService=()=>Promise.resolve(E())});try{const E=new URL(v);this.customDomain=E.origin+(E.pathname==="/"?"":E.pathname),this.region=Je}catch{this.customDomain=null,this.region=v}}_delete(){return this.deleteService()}_url(r){const s=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${s}/${this.region}/${r}`:this.customDomain!==null?`${this.customDomain}/${r}`:`https://${this.region}-${s}.cloudfunctions.net/${r}`}}function Ao(n,r,s){const a=Yi(r);n.emulatorOrigin=`http${a?"s":""}://${r}:${s}`,a&&qi(n.emulatorOrigin+"/backends")}const wr="@firebase/functions",Er="0.14.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Co="auth-internal",So="app-check-internal",_o="messaging-internal";function Io(n){const r=(s,{instanceIdentifier:a})=>{const h=s.getProvider("app").getImmediate(),v=s.getProvider(Co),m=s.getProvider(_o),E=s.getProvider(So);return new To(h,v,m,E,a)};Tt(new pt($r,r,"PUBLIC").setMultipleInstances(!0)),gt(wr,Er,n),gt(wr,Er,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Da(n=Br(),r=Je){const a=ue(en(n),$r).getImmediate({identifier:r}),h=Li("functions");return h&&ko(a,...h),a}function ko(n,r,s){Ao(en(n),r,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Io();/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ye=new Map,Lr={activated:!1,tokenObservers:[]},Do={initialized:!1,enabled:!1};function P(n){return Ye.get(n)||{...Lr}}function Ro(n,r){return Ye.set(n,r),Ye.get(n)}function fe(){return Do}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hr="https://content-firebaseappcheck.googleapis.com/v1",Oo="exchangeRecaptchaV3Token",Po="exchangeDebugToken",Tr={RETRIAL_MIN_WAIT:30*1e3,RETRIAL_MAX_WAIT:960*1e3},Mo=1440*60*1e3;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xo{constructor(r,s,a,h,v){if(this.operation=r,this.retryPolicy=s,this.getWaitDuration=a,this.lowerBound=h,this.upperBound=v,this.pending=null,this.nextErrorWaitInterval=h,h>v)throw new Error("Proactive refresh lower bound greater than upper bound!")}start(){this.nextErrorWaitInterval=this.lowerBound,this.process(!0).catch(()=>{})}stop(){this.pending&&(this.pending.reject("cancelled"),this.pending=null)}isRunning(){return!!this.pending}async process(r){this.stop();try{this.pending=new Lt,this.pending.promise.catch(s=>{}),await Bo(this.getNextRun(r)),this.pending.resolve(),await this.pending.promise,this.pending=new Lt,this.pending.promise.catch(s=>{}),await this.operation(),this.pending.resolve(),await this.pending.promise,this.process(!0).catch(()=>{})}catch(s){this.retryPolicy(s)?this.process(!1).catch(()=>{}):this.stop()}}getNextRun(r){if(r)return this.nextErrorWaitInterval=this.lowerBound,this.getWaitDuration();{const s=this.nextErrorWaitInterval;return this.nextErrorWaitInterval*=2,this.nextErrorWaitInterval>this.upperBound&&(this.nextErrorWaitInterval=this.upperBound),s}}}function Bo(n){return new Promise(r=>{setTimeout(r,n)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const No={"already-initialized":"You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.","use-before-activation":"App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.","fetch-network-error":"Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-parse-error":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status-error":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","recaptcha-error":"ReCAPTCHA error.","initial-throttle":"{$httpStatus} error. Attempts allowed again after {$time}",throttled:"Requests throttled due to previous {$httpStatus} error. Attempts allowed again after {$time}"},F=new tn("appCheck","AppCheck",No);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ar(n=!1){var r;return n?(r=self.grecaptcha)==null?void 0:r.enterprise:self.grecaptcha}function rn(n){if(!P(n).activated)throw F.create("use-before-activation",{appName:n.name})}function Fr(n){const r=Math.round(n/1e3),s=Math.floor(r/(3600*24)),a=Math.floor((r-s*3600*24)/3600),h=Math.floor((r-s*3600*24-a*3600)/60),v=r-s*3600*24-a*3600-h*60;let m="";return s&&(m+=se(s)+"d:"),a&&(m+=se(a)+"h:"),m+=se(h)+"m:"+se(v)+"s",m}function se(n){return n===0?"00":n>=10?n.toString():"0"+n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function sn({url:n,body:r},s){const a={"Content-Type":"application/json"},h=s.getImmediate({optional:!0});if(h){const C=await h.getHeartbeatsHeader();C&&(a["X-Firebase-Client"]=C)}const v={method:"POST",body:JSON.stringify(r),headers:a};let m;try{m=await fetch(n,v)}catch(C){throw F.create("fetch-network-error",{originalErrorMessage:C==null?void 0:C.message})}if(m.status!==200)throw F.create("fetch-status-error",{httpStatus:m.status});let E;try{E=await m.json()}catch(C){throw F.create("fetch-parse-error",{originalErrorMessage:C==null?void 0:C.message})}const A=E.ttl.match(/^([\d.]+)(s)$/);if(!A||!A[2]||isNaN(Number(A[1])))throw F.create("fetch-parse-error",{originalErrorMessage:`ttl field (timeToLive) is not in standard Protobuf Duration format: ${E.ttl}`});const T=Number(A[1])*1e3,x=Date.now();return{token:E.token,expireTimeMillis:x+T,issuedAtTimeMillis:x}}function jo(n,r){const{projectId:s,appId:a,apiKey:h}=n.options;return{url:`${Hr}/projects/${s}/apps/${a}:${Oo}?key=${h}`,body:{recaptcha_v3_token:r}}}function Ur(n,r){const{projectId:s,appId:a,apiKey:h}=n.options;return{url:`${Hr}/projects/${s}/apps/${a}:${Po}?key=${h}`,body:{debug_token:r}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $o="firebase-app-check-database",Lo=1,Ft="firebase-app-check-store",zr="debug-token";let oe=null;function Wr(){return oe||(oe=new Promise((n,r)=>{try{const s=indexedDB.open($o,Lo);s.onsuccess=a=>{n(a.target.result)},s.onerror=a=>{var h;r(F.create("storage-open",{originalErrorMessage:(h=a.target.error)==null?void 0:h.message}))},s.onupgradeneeded=a=>{const h=a.target.result;switch(a.oldVersion){case 0:h.createObjectStore(Ft,{keyPath:"compositeKey"})}}}catch(s){r(F.create("storage-open",{originalErrorMessage:s==null?void 0:s.message}))}}),oe)}function Ho(n){return Kr(Gr(n))}function Fo(n,r){return Vr(Gr(n),r)}function Uo(n){return Vr(zr,n)}function zo(){return Kr(zr)}async function Vr(n,r){const a=(await Wr()).transaction(Ft,"readwrite"),v=a.objectStore(Ft).put({compositeKey:n,value:r});return new Promise((m,E)=>{v.onsuccess=A=>{m()},a.onerror=A=>{var T;E(F.create("storage-set",{originalErrorMessage:(T=A.target.error)==null?void 0:T.message}))}})}async function Kr(n){const s=(await Wr()).transaction(Ft,"readonly"),h=s.objectStore(Ft).get(n);return new Promise((v,m)=>{h.onsuccess=E=>{const A=E.target.result;v(A?A.value:void 0)},s.onerror=E=>{var A;m(F.create("storage-get",{originalErrorMessage:(A=E.target.error)==null?void 0:A.message}))}})}function Gr(n){return`${n.options.appId}-${n.name}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const it=new Pr("@firebase/app-check");/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wo(n){if(Qe()){let r;try{r=await Ho(n)}catch(s){it.warn(`Failed to read token from IndexedDB. Error: ${s}`)}return r}}function Ue(n,r){return Qe()?Fo(n,r).catch(s=>{it.warn(`Failed to write token to IndexedDB. Error: ${s}`)}):Promise.resolve()}async function Vo(n){let r;try{r=await zo()}catch{}if(r)return r;{const s=crypto.randomUUID();let a=`To use this token for app debugging, register it with your project.

Firebase App Check debug token: ${s}

`;const h=n==null?void 0:n.options.appId,v=n==null?void 0:n.options.projectId;return v&&h?a+=`You can do so in the Firebase Console:
https://console.firebase.google.com/project/${v}/appcheck/apps?selectedAppId=${h}

Or using the Firebase CLI:
firebase appcheck:debugtokens:create ${s} --project ${v} --app ${h}

`:a+=`You will need to add it to your app's App Check settings in the Firebase Console for it to work.

`,a+=`Note: To keep your project secure, please revoke and delete this token using the
Firebase Console or the CLI (\`firebase appcheck:debugtokens:delete\`) when you finish debugging.

Warning: This debug token is a secret and should not be shared or uploaded to source code.

Debug Token Guide: https://firebase.google.com/docs/app-check/web/debug-provider
Firebase CLI install instructions: https://firebase.google.com/docs/cli
`,Uo(s).catch(m=>it.warn(`Failed to persist debug token to IndexedDB. Error: ${m}`)),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function on(){return fe().enabled}async function an(){const n=fe();if(n.enabled&&n.token)return n.token.promise;throw Error(`
            Can't get debug token in production mode.
        `)}function Ko(n){const r=kr(),s=fe();if(s.initialized=!0,typeof r.FIREBASE_APPCHECK_DEBUG_TOKEN!="string"&&r.FIREBASE_APPCHECK_DEBUG_TOKEN!==!0)return;s.enabled=!0;const a=new Lt;s.token=a,typeof r.FIREBASE_APPCHECK_DEBUG_TOKEN=="string"?a.resolve(r.FIREBASE_APPCHECK_DEBUG_TOKEN):a.resolve(Vo(n))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Go={error:"UNKNOWN_ERROR"};function Xo(n){return Ze.encodeString(JSON.stringify(n),!1)}async function qe(n,r=!1,s=!1){const a=n.app;rn(a);const h=P(a);let v=h.token,m;if(v&&!Et(v)&&(h.token=void 0,v=void 0),!v){const T=await h.cachedTokenPromise;T&&(Et(T)?v=T:await Ue(a,void 0))}if(!r&&v&&Et(v))return{token:v.token};let E=!1;if(on())try{const T=await an();h.exchangeTokenPromise||(h.exchangeTokenPromise=sn(Ur(a,T),n.heartbeatServiceProvider).finally(()=>{h.exchangeTokenPromise=void 0}),E=!0);const x=await h.exchangeTokenPromise;return await Ue(a,x),h.token=x,{token:x.token}}catch(T){return T.code==="appCheck/throttled"||T.code==="appCheck/initial-throttle"?it.warn(T.message):s&&it.error(T),ze(T)}try{h.exchangeTokenPromise||(h.exchangeTokenPromise=h.provider.getToken().finally(()=>{h.exchangeTokenPromise=void 0}),E=!0),v=await P(a).exchangeTokenPromise}catch(T){T.code==="appCheck/throttled"||T.code==="appCheck/initial-throttle"?it.warn(T.message):s&&it.error(T),m=T}let A;return v?m?Et(v)?A={token:v.token,internalError:m}:A=ze(m):(A={token:v.token},h.token=v,await Ue(a,v)):A=ze(m),E&&Yr(a,A),A}async function Jo(n){const r=n.app;rn(r);const{provider:s}=P(r);if(on()){const a=await an(),h=Ur(r,a);h.body.limited_use=!0;const{token:v}=await sn(h,n.heartbeatServiceProvider);return{token:v}}else{const{token:a}=await s.getToken(!0);return{token:a}}}function Xr(n,r,s,a){const{app:h}=n,v=P(h),m={next:s,error:a,type:r};if(v.tokenObservers=[...v.tokenObservers,m],v.token&&Et(v.token)){const E=v.token;Promise.resolve().then(()=>{s({token:E.token}),Cr(n)}).catch(()=>{})}v.cachedTokenPromise.then(()=>Cr(n))}function Jr(n,r){const s=P(n),a=s.tokenObservers.filter(h=>h.next!==r);a.length===0&&s.tokenRefresher&&s.tokenRefresher.isRunning()&&s.tokenRefresher.stop(),s.tokenObservers=a}function Cr(n){const{app:r}=n,s=P(r);let a=s.tokenRefresher;a||(a=Yo(n),s.tokenRefresher=a),!a.isRunning()&&s.isTokenAutoRefreshEnabled&&a.start()}function Yo(n){const{app:r}=n;return new xo(async()=>{const s=P(r);let a;if(s.token?a=await qe(n,!0):a=await qe(n),a.error)throw a.error;if(a.internalError)throw a.internalError},()=>!0,()=>{const s=P(r);if(s.token){let a=s.token.issuedAtTimeMillis+(s.token.expireTimeMillis-s.token.issuedAtTimeMillis)*.5+3e5;const h=s.token.expireTimeMillis-300*1e3;return a=Math.min(a,h),Math.max(0,a-Date.now())}else return 0},Tr.RETRIAL_MIN_WAIT,Tr.RETRIAL_MAX_WAIT)}function Yr(n,r){const s=P(n).tokenObservers;for(const a of s)try{a.type==="EXTERNAL"&&r.error!=null?a.error(r.error):a.next(r)}catch{}}function Et(n){return n.expireTimeMillis-Date.now()>0}function ze(n){return{token:Xo(Go),error:n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qo{constructor(r,s){this.app=r,this.heartbeatServiceProvider=s}_delete(){const{tokenObservers:r}=P(this.app);for(const s of r)Jr(this.app,s.next);return Promise.resolve()}}function Zo(n,r){return new qo(n,r)}function Qo(n){return{getToken:r=>qe(n,r),getLimitedUseToken:()=>Jo(n),addTokenListener:r=>Xr(n,"INTERNAL",r),removeTokenListener:r=>Jr(n.app,r)}}const ta="@firebase/app-check",ea="0.13.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const na="https://www.google.com/recaptcha/api.js";function ra(n,r){const s=new Lt,a=P(n);a.reCAPTCHAState={initialized:s};const h=ia(n),v=Ar(!1);return v?Sr(n,r,v,h,s):aa(()=>{const m=Ar(!1);if(!m)throw new Error("no recaptcha");Sr(n,r,m,h,s)}),s.promise}function Sr(n,r,s,a,h){s.ready(()=>{oa(n,r,s,a),h.resolve(s)})}function ia(n){const r=`fire_app_check_${n.name}`,s=document.createElement("div");return s.id=r,s.style.display="none",document.body.appendChild(s),r}async function sa(n){rn(n);const s=await P(n).reCAPTCHAState.initialized.promise;return new Promise((a,h)=>{const v=P(n).reCAPTCHAState;s.ready(()=>{a(s.execute(v.widgetId,{action:"fire_app_check"}))})})}function oa(n,r,s,a){const h=s.render(a,{sitekey:r,size:"invisible",callback:()=>{P(n).reCAPTCHAState.succeeded=!0},"error-callback":()=>{P(n).reCAPTCHAState.succeeded=!1}}),v=P(n);v.reCAPTCHAState={...v.reCAPTCHAState,widgetId:h}}function aa(n){const r=document.createElement("script");r.src=na,r.onload=n,document.head.appendChild(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qr{constructor(r){this._siteKey=r,this._throttleData=null}async getToken(r=!1){var h,v,m;ca(this._throttleData);const s=await sa(this._app).catch(E=>{throw F.create("recaptcha-error")});if(!((h=P(this._app).reCAPTCHAState)!=null&&h.succeeded))throw F.create("recaptcha-error");let a;try{const E=jo(this._app,s);r&&(E.body.limited_use=!0),a=await sn(E,this._heartbeatServiceProvider)}catch(E){throw(v=E.code)!=null&&v.includes("fetch-status-error")?(this._throttleData=ha(Number((m=E.customData)==null?void 0:m.httpStatus),this._throttleData),F.create("initial-throttle",{time:Fr(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus})):E}return this._throttleData=null,a}initialize(r){this._app=r,this._heartbeatServiceProvider=ue(r,"heartbeat"),ra(r,this._siteKey).catch(()=>{})}isEqual(r){return r instanceof qr?this._siteKey===r._siteKey:!1}}function ha(n,r){if(n===404||n===403)return{backoffCount:1,allowRequestsAfter:Date.now()+Mo,httpStatus:n};{const s=r?r.backoffCount:0,a=Ji(s,1e3,2);return{backoffCount:s+1,allowRequestsAfter:Date.now()+a,httpStatus:n}}}function ca(n){if(n&&Date.now()-n.allowRequestsAfter<=0)throw F.create("throttled",{time:Fr(n.allowRequestsAfter-Date.now()),httpStatus:n.httpStatus})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ra(n=Br(),r){var h;n=en(n);const s=ue(n,"app-check");if(fe().initialized||Ko(n),on()&&an().then(v=>{}),s.isInitialized()){const v=s.getImmediate(),m=s.getOptions();if(m&&!!m.isTokenAutoRefreshEnabled==!!r.isTokenAutoRefreshEnabled&&((h=m.provider)!=null&&h.isEqual(r.provider)))return v;throw F.create("already-initialized",{appName:n.name})}const a=s.initialize({options:r});return la(n,r.provider,r.isTokenAutoRefreshEnabled),P(n).isTokenAutoRefreshEnabled&&Xr(a,"INTERNAL",()=>{}),a}function la(n,r,s=!1){const a=Ro(n,{...Lr});a.activated=!0,a.provider=r,a.cachedTokenPromise=Wo(n).then(h=>(h&&Et(h)&&(a.token=h,Yr(n,{token:h.token})),h)),a.isTokenAutoRefreshEnabled=s&&n.automaticDataCollectionEnabled,!n.automaticDataCollectionEnabled&&s&&it.warn("`isTokenAutoRefreshEnabled` is true but `automaticDataCollectionEnabled` was set to false during `initializeApp()`. This blocks automatic token refresh."),a.provider.initialize(n)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ua="app-check",_r="app-check-internal";function fa(){Tt(new pt(ua,n=>{const r=n.getProvider("app").getImmediate(),s=n.getProvider("heartbeat");return Zo(r,s)},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((n,r,s)=>{n.getProvider(_r).initialize()})),Tt(new pt(_r,n=>{const r=n.getProvider("app-check").getImmediate();return Qo(r)},"PUBLIC").setInstantiationMode("EXPLICIT")),gt(ta,ea)}fa();export{mo as A,fo as B,pt as C,Lt as D,tn as E,Ut as F,go as G,vo as H,ho as I,wa as J,kr as K,Pr as L,Qe as M,Ea as N,co as O,Ia as P,po as Q,qs as R,ka as S,Da as T,Ra as U,qr as V,uo as W,lo as X,Tt as _,va as a,ya as b,Xs as c,en as d,_a as e,k as f,ga as g,Rr as h,da as i,xi as j,Yi as k,ue as l,$i as m,Br as n,We as o,qi as p,Aa as q,gt as r,ba as s,Ta as t,Ca as u,Sa as v,ma as w,Li as x,pa as y,yo as z};
