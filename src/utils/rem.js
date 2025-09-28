// 基准大小
const baseSize = 16;
// 设置 rem 函数
function setRem() {
  // 当前页面宽度相对于 1920 宽的缩放比例，可根据自己需要修改。
  const scale = document.documentElement.clientWidth / 1024;
  // 设置页面根节点字体大小, 浏览器字体大小最小为12 ↓ 采用下面
  let fontSize =
    baseSize * Math.min(scale, 2) > 12 ? baseSize * Math.min(scale, 2) : 12;
  // electron 可以更小 ↓ （个人项目需要）
  // let fontSize = baseSize * Math.min(scale, 2)
  document.documentElement.style.fontSize = fontSize + "px";
  // console.log(`Current scale: ${scale}, font size set to: ${fontSize}px`);
}
// 初始化
setRem();
// 改变窗口大小时重新设置 rem,这里最好加上节流
window.onresize = function () {
  setRem();
};
