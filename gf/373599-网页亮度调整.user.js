// ==UserScript==
// @name         网页亮度调整
// @name:en    Webpage brightness adjustment
// @namespace    mscststs
// @version      0.41
// @description  用这个脚本来调整你的网页亮度
// @description:en  Use this script to adjust the brightness of your page
// @require 	https://greasyfork.org/scripts/373588-mscststs-eventbus/code/mscststs-EventBus.js?version=639557
// @author       mscststs
// @include        /.*/
// @grant 		GM_setValue
// @grant 		GM_getValue
// @grant 		GM_addValueChangeListener
// @grant       GM_registerMenuCommand
// @grant		unsafeWindow
// @license        MIT License
// @noframes
// @contributionURL   https://blve.mscststs.com/img/Pay.png
// @contributionAmount 5
// @compatible   firefox 旧版FF兼容性未考证，火狐量子版完全兼容
// @compatible   chrome
// @compatible   opera
// @compatible   safari
// @run-at 		document-body
// ==/UserScript==

(function() {
    'use strict';
	const Default_config={
		globalBrightness: 0.9,
		SingleConfigMap:{
			/* {
					[window.location.host] : 0.9,
			}*/
		}
	}

	function isCN(){
		let lang = navigator.language||navigator.userLanguage;//常规浏览器语言和IE浏览器
		if(lang.indexOf('zh')>=0){
			return true;
		}else{
			return false;
		}
	}

	const CN_wordsMap = {
		MenuCmd:"打开亮度调整菜单",
		settingsTitle:"亮度调整",
		setAsDefault:"设为默认亮度",
		closeSettingWindow:"关闭设置窗口",
		DeafultSetText:"网页默认亮度已被设置为",
	}
	const EN_wordsMap = {
		MenuCmd:"Brightness adjustment menu",
		settingsTitle:"Brightness adjustment",
		setAsDefault:"Set As Default Brightness",
		closeSettingWindow:"Close the settings window",
		DeafultSetText:"The default brightness has been set to "
	}

	const wordsMap = isCN()?CN_wordsMap:EN_wordsMap;

	const body = document.querySelector("body");




	let gm = new class{
		constructor(){
			this.key = "mscststs-brightness";
			this.init();
		}
		init(){
			GM_registerMenuCommand(wordsMap.MenuCmd,()=>{
				eve.emit("Cmd-OpenMenu");
			});
			GM_addValueChangeListener(this.key,(name, old_value, new_value, remote)=>{
				eve.emit("SettingUpdated",new_value);
			});
		}
		getNowBrightness(){
			let config = this.getConfig();
			return config.SingleConfigMap[window.location.host] || config.globalBrightness;
		}
		getConfig(){
			//读取配置文件
			return GM_getValue(this.key,Default_config);
		}
		setConfig(value){
			GM_setValue(this.key,value);
		}
		setGlobalBrightness(value){
			let config = this.getConfig();
			config.globalBrightness = value;
			this.setConfig(config);
		}
		setHostBrightness(value,host = window.location.host){
			let config = this.getConfig();
			config.SingleConfigMap[host] = value;
			this.setConfig(config);
		}
	}();

	function OpenMenuPage(){
		if(document.querySelector("#helper_brightness")){
			//当前Menu已存在
		}else{
			//Menu不存在，需要打开Menu
			let div = document.createElement("div");
			div.id = "helper_brightness";
			div.innerHTML = `
  <div class="brightness-title">
    `+wordsMap.settingsTitle+`
  </div>
  <div class="brightness-Menu">
    <div class="single">
      <div class="controller">
        <input id="helper_brightness_range" type="range" min="0" max="1" step="0.01" value="`+gm.getNowBrightness()+`"/>
      </div>
       <div class="desc">
         <div id="brightness-value">
           `+gm.getNowBrightness()+`
         </div>
         <div class="btn-group">
         <button id="helper_brightness_setAsDefault">
           `+wordsMap.setAsDefault+`
         </button>
         <button id="helper_brightness_closeSettingPage">
           `+wordsMap.closeSettingWindow+`
         </button>
         </div>
       </div>
    </div>
  </div>

<style>
/* ---------- 弹窗容器 ---------- */
#helper_brightness {
  position: fixed;
  color: #1a1a2e !important;
  display: flex;
  flex-direction: column;
  left: calc(50% - 200px);
  top: 50%;
  transform: translateY(-50%);
  width: 400px;
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04);
  background: linear-gradient(135deg, #f8f9fb 0%, #eef0f4 100%);
  padding: 0;
  user-select: none;
  z-index: 1000000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  animation: brightnessPopupIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes brightnessPopupIn {
  from { opacity: 0; transform: translateY(-50%) scale(0.92); }
  to   { opacity: 1; transform: translateY(-50%) scale(1); }
}

/* ---------- 标题栏 ---------- */
#helper_brightness .brightness-title {
  color: #1a1a2e !important;
  text-align: center;
  font-size: 1.15em;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 2.6em;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: rgba(255,255,255,0.6);
  border-radius: 16px 16px 0 0;
  margin: 0;
  padding: 0 24px;
}

/* ---------- 内容区 ---------- */
#helper_brightness .brightness-Menu {
  padding: 28px 36px 32px;
  margin: 0;
}
#helper_brightness .controller {
  padding: 10px 0 16px;
  margin: 0 auto;
  width: 328px;
}

/* ---------- Range 滑块 ---------- */
#helper_brightness input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%);
  outline: none;
  cursor: pointer;
}
#helper_brightness input[type=range]::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
}
#helper_brightness input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(26,26,46,0.15);
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  margin-top: -7px;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}
#helper_brightness input[type=range]::-webkit-slider-thumb:hover {
  border-color: rgba(26,26,46,0.35);
  box-shadow: 0 4px 14px rgba(0,0,0,0.28);
}
#helper_brightness input[type=range]::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(26,26,46,0.15);
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  cursor: pointer;
}
#helper_brightness input[type=range]::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%);
}
#helper_brightness input[type=range]:focus {
  outline: none;
}

/* ---------- 亮度数值 ---------- */
#brightness-value {
  font-size: 2em;
  font-weight: 700;
  height: 52px;
  line-height: 52px;
  color: #1a1a2e !important;
  text-align: center;
  letter-spacing: 1px;
}

/* ---------- 描述区 ---------- */
#helper_brightness .desc {
  text-align: center;
  line-height: 1;
}
#helper_brightness .btn-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 10px;
}

/* ---------- 按钮 ---------- */
#helper_brightness button {
  background: rgba(255,255,255,0.75);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  border: 1px solid rgba(0,0,0,0.08);
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  cursor: pointer;
  color: #1a1a2e !important;
  transition: all 0.15s ease;
  flex: 1;
  max-width: 170px;
}
#helper_brightness button:hover {
  background: #fff;
  border-color: rgba(0,0,0,0.16);
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  transform: translateY(-1px);
}
#helper_brightness button:active {
  transform: translateY(0);
  box-shadow: none;
}
#helper_brightness_closeSettingPage {
  background: rgba(26,26,46,0.06) !important;
}
#helper_brightness_closeSettingPage:hover {
  background: rgba(26,26,46,0.14) !important;
}
</style>

				`
				body.appendChild(div);

				let rangeController = document.querySelector("#helper_brightness_range");
				let setAsDefaultBtn = document.querySelector("#helper_brightness_setAsDefault");
				let closeSettingPage = document.querySelector("#helper_brightness_closeSettingPage");
				let brightnessValue = document.querySelector("#brightness-value");

				rangeController.addEventListener("input",(e)=>{
				  let value = e.target.value;
				  brightnessValue.innerText = value;
				  gm.setHostBrightness(value);
				})
				setAsDefaultBtn.addEventListener("click",(e)=>{
				  //设为默认亮度
				  let value = rangeController.value;

				  gm.setGlobalBrightness(value);
				  alert(wordsMap.DeafultSetText+value+"!");
				})
				closeSettingPage.addEventListener("click",(e)=>{
				  CloseMenuPage();
				})

			}
		}
		function CloseMenuPage(){
			let menu = document.querySelector("#helper_brightness");
			if(menu){
				menu.remove();
			}
		}


		eve.on("Cmd-OpenMenu",()=>{
			OpenMenuPage();
		})
		eve.on("SettingUpdated",()=>{
			Init();
		})




		let CurrentBrightness = null;

		//插入style节点
		let styleNode = document.createElement("style")
		document.querySelector("head").append(styleNode)

		function Init(){
			if(CurrentBrightness && CurrentBrightness == gm.getNowBrightness()){
				//默认亮度未改变
			}else{
				CurrentBrightness = gm.getNowBrightness();
			}
			styleNode.innerHTML = `

body::after{
content:"";
display:block;
background-color:#000;
opacity:`+parseFloat(1-CurrentBrightness).toFixed(2)+`;

position:fixed;
left:0;
top:0;
z-index:999999;
width:100%;
height:100%;
pointer-events: none;
}

			`;
		}

		Init();


		//优化逻辑判断
		body.addEventListener("dblclick",(e)=>{
			if(e.ctrlKey){
				eve.emit("Cmd-OpenMenu")
			}
		})
})();