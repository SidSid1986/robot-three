/*
 * @Author: Sid Li
 * @Date: 2025-09-28 16:34:04
 * @LastEditors: Sid Li
 * @LastEditTime: 2025-09-28 16:35:15
 * @FilePath: \robot-three\src\main.js
 * @Description: 
 */
import { createApp } from "vue";
import App from "./App.vue";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "@/styles/main.scss";
// import "@/styles/element/index.scss";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import "@/styles/free-icons/iconfont.css";

import router from "@/router/index.js";

import store from "@/store";

// 引入rem适配
import "@/utils/rem.js";

// 引入flexible
import "amfe-flexible";

 

 

const app = createApp(App);
app.use(store);
app.use(ElementPlus);
app.use(router);
 
// app.directive("throttle", throttle);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount("#app");
