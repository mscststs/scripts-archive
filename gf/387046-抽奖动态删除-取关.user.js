// ==UserScript==
// @name         动态管理
// @namespace    mscststs
// @version      0.31
// @description  动态管理页面
// @author       mscststs
// @match        https://space.bilibili.com/*
// @match        http://space.bilibili.com/*
// @require      https://greasyfork.org/scripts/38220-mscststs-tools/code/MSCSTSTS-TOOLS.js?version=713767
// @require      https://cdn.jsdelivr.net/npm/axios@1.7.3/dist/axios.min.js
// @icon         https://static.hdslb.com/images/favicon.ico
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
  
    // 全局状态
    let appState = {
      showModal: false,
      loading: false,
      loadCount: 20,
      dynamics: [],
      offset: '',
      uid: ''
    };
  
    // 等待页面加载完成
    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    async function init() {
      try {
        const shijiao = await mscststs.wait(".view-switcher__trigger", false, 100);
        if (!shijiao || !~shijiao.innerText.indexOf("我自己")) {
          console.log('当前不是自己的个人动态');
          return;
        }
  
        await Promise.all([
          mscststs.wait(".space-dynamic__right")
        ]);
  
        // 获取用户ID
        appState.uid = getCurrentUid();
        
        const node = createControlPanel();
        document.querySelector("body").append(node);
  
        // 绑定事件
        bindEvents();
        
      } catch (error) {
        console.error('初始化失败:', error);
      }
    }
  
    // 获取当前用户ID
    function getCurrentUid() {
      const match = window.location.pathname.match(/\/(\d+)/);
      return match ? match[1] : '';
    }
  
    // 创建控制面板DOM结构
    function createControlPanel() {
      const panelHtml = `
        <div id="dynamic-manager" class="msc_panel" style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
        ">
          <button id="open-manager-btn" style="
            background: linear-gradient(135deg, #00b4d8, #0077b6);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 180, 216, 0.3);
          ">
            📊 动态管理
          </button>
          
          <!-- 管理面板弹窗 -->
          <div id="manager-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              background: white;
              border-radius: 12px;
              width: 95%;
              max-width: 1400px;
              max-height: 90%;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
              <!-- 头部 -->
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 1px solid #e1e1e1;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
              ">
                <h2 style="margin: 0; color: #333;">动态管理面板</h2>
                <button id="close-modal-btn" style="
                  background: none;
                  border: none;
                  font-size: 24px;
                  cursor: pointer;
                  color: #666;
                  width: 30px;
                  height: 30px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 50%;
                  transition: all 0.2s;
                ">×</button>
              </div>
              
              <!-- 操作区域 -->
              <div style="padding: 20px 30px; border-bottom: 1px solid #e1e1e1;">
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="font-weight: 500; color: #333;">加载数量:</label>
                    <input 
                      id="load-count-input" 
                      type="number" 
                      min="1" 
                      max="100" 
                      value="20"
                      style="
                        width: 80px;
                        padding: 6px 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                      "
                    >
                  </div>
                  <button 
                    id="load-dynamics-btn"
                    style="
                      background: #28a745;
                      color: white;
                      border: none;
                      padding: 8px 16px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 14px;
                      transition: all 0.2s;
                    "
                  >
                    加载动态
                  </button>
                  <button 
                    id="select-all-forward-btn"
                    style="
                      background: #17a2b8;
                      color: white;
                      border: none;
                      padding: 8px 16px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 14px;
                      margin-right: 10px;
                    "
                  >
                    勾选所有转发
                  </button>
                  <button 
                    id="select-all-lottery-btn"
                    style="
                      background: #fd7e14;
                      color: white;
                      border: none;
                      padding: 8px 16px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 14px;
                      margin-right: 10px;
                    "
                  >
                    勾选所有抽奖
                  </button>
                  <button 
                    id="batch-delete-btn"
                    style="
                      background: #dc3545;
                      color: white;
                      border: none;
                      padding: 8px 16px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 14px;
                      margin-right: 10px;
                    "
                  >
                    批量删除
                  </button>
                  <button 
                    id="batch-delete-unfollow-btn"
                    style="
                      background: #e74c3c;
                      color: white;
                      border: none;
                      padding: 8px 16px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 14px;
                      margin-right: 10px;
                    "
                  >
                    删除并取关
                  </button>
                  <button 
                    id="clear-data-btn"
                    style="
                      background: #dc3545;
                      color: white;
                      border: none;
                      padding: 8px 16px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 14px;
                    "
                  >
                    清空数据
                  </button>
                  <div id="dynamics-count" style="margin-left: auto; color: #666;">
                    已加载: 0 条动态
                  </div>
                </div>
              </div>
              
              <!-- 表格区域 -->
              <div style="padding: 0; max-height: 600px; overflow-y: auto;">
                <table id="dynamics-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                  <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-weight: 600; width: 80px;">
                        <input 
                          type="checkbox" 
                          id="select-all-checkbox"
                          style="margin-right: 8px;"
                        >
                        选择
                      </th>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-weight: 600; width: 80px;">类型</th>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-weight: 600; width: 500px;">内容</th>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-weight: 600; width: 120px;">发布时间</th>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-weight: 600; width: 120px;">操作</th>
                    </tr>
                  </thead>
                  <tbody id="dynamics-tbody">
                    <tr>
                      <td colspan="5" style="padding: 40px; text-align: center; color: #999;">
                        暂无数据，请点击"加载动态"获取数据
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
  
      const div = document.createElement('div');
      div.innerHTML = panelHtml;
      return div.firstElementChild;
    }
  
    // 绑定事件
    function bindEvents() {
      // 打开弹窗
      document.getElementById('open-manager-btn').addEventListener('click', showModal);
      
      // 关闭弹窗
      document.getElementById('close-modal-btn').addEventListener('click', hideModal);
      
      // 点击遮罩关闭弹窗
      document.getElementById('manager-modal').addEventListener('click', function(e) {
        if (e.target === this) {
          hideModal();
        }
      });
      
      // 加载动态
      document.getElementById('load-dynamics-btn').addEventListener('click', loadDynamics);
      
      // 勾选所有转发
      document.getElementById('select-all-forward-btn').addEventListener('click', selectAllForward);
      
      // 勾选所有抽奖
      document.getElementById('select-all-lottery-btn').addEventListener('click', selectAllLottery);
      
      // 批量删除
      document.getElementById('batch-delete-btn').addEventListener('click', batchDeleteDynamics);
      
      // 批量删除并取关
      document.getElementById('batch-delete-unfollow-btn').addEventListener('click', batchDeleteAndUnfollowDynamics);
      
      // 清空数据
      document.getElementById('clear-data-btn').addEventListener('click', clearData);
      
      // 全选
      document.getElementById('select-all-checkbox').addEventListener('change', toggleAllSelection);
      
      // 加载数量输入
      document.getElementById('load-count-input').addEventListener('input', function() {
        appState.loadCount = parseInt(this.value) || 20;
      });
  
      // 按钮悬停效果
      const openBtn = document.getElementById('open-manager-btn');
      openBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-1px)';
        this.style.boxShadow = '0 4px 12px rgba(0, 180, 216, 0.4)';
      });
      openBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 8px rgba(0, 180, 216, 0.3)';
      });
  
      const closeBtn = document.getElementById('close-modal-btn');
      closeBtn.addEventListener('mouseenter', function() {
        this.style.background = '#f0f0f0';
      });
      closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'none';
      });
  
      // 绑定查看按钮事件
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          viewDynamic(appState.dynamics[index]);
        });
      });
      
      // 绑定删除按钮事件
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          deleteDynamic(appState.dynamics[index]);
        });
      });
      
      // 绑定删除并取关按钮事件
      document.querySelectorAll('.delete-unfollow-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          deleteAndUnfollowDynamic(appState.dynamics[index]);
        });
      });
    }
  
    // 显示弹窗
    function showModal() {
      appState.showModal = true;
      document.getElementById('manager-modal').style.display = 'flex';
    }
  
    // 隐藏弹窗
    function hideModal() {
      appState.showModal = false;
      document.getElementById('manager-modal').style.display = 'none';
    }
  
    // 加载动态
    async function loadDynamics() {
      if (!appState.uid) {
        alert('无法获取用户ID');
        return;
      }
      
      const loadBtn = document.getElementById('load-dynamics-btn');
      loadBtn.disabled = true;
      loadBtn.style.opacity = '0.6';
      loadBtn.style.cursor = 'not-allowed';
      
      const targetCount = appState.loadCount;
      let currentOffset = appState.offset;
      let totalLoadedInThisSession = 0;
      
      try {
        // 循环加载直到达到目标数量或没有更多数据
        while (totalLoadedInThisSession < targetCount) {
          // 更新按钮文本显示进度
          loadBtn.textContent = `加载中... (${totalLoadedInThisSession}/${targetCount})`;
          
          const response = await spaceHistory(currentOffset);
          
          if (response.code !== 0) {
            alert('加载失败: ' + response.message);
            break;
          }
          
          const items = response.data.items || [];
          if (items.length === 0 || !response.data.has_more) {
            console.log('没有更多动态数据');
            break;
          }
          
          // 计算本次需要添加的数量
          const remainingCount = targetCount - totalLoadedInThisSession;
          const itemsToAdd = items.slice(0, remainingCount).map(item => ({
            ...item,
            selected: false
          }));
          
          appState.dynamics = [...appState.dynamics, ...itemsToAdd];
          currentOffset = response.data.offset || '';
          appState.offset = currentOffset;
          
          totalLoadedInThisSession += itemsToAdd.length;
          
          console.log(`本次加载 ${itemsToAdd.length} 条动态，累计加载 ${totalLoadedInThisSession} 条`);
          
          // 如果没有更多数据（offset为空）或者API返回的数据少于预期，说明已经到底了
          if (!currentOffset || !response.data.has_more) {
            console.log('已加载所有可用的动态数据');
            break;
          }
          
          // 如果已经达到目标数量，退出循环
          if (totalLoadedInThisSession >= targetCount) {
            break;
          }
          
          // 添加短暂延迟避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`加载完成，目标: ${targetCount} 条，实际加载: ${totalLoadedInThisSession} 条，总计: ${appState.dynamics.length} 条`);
        
        // 更新UI
        updateDynamicsTable();
        updateDynamicsCount();
        
        // 显示加载结果
        if (totalLoadedInThisSession > 0) {
          const message = totalLoadedInThisSession < targetCount 
            ? `成功加载 ${totalLoadedInThisSession} 条动态（已加载完所有可用数据）`
            : `成功加载 ${totalLoadedInThisSession} 条动态`;
          console.log(message);
        } else {
          alert('没有新的动态数据');
        }
        
      } catch (error) {
        console.error('加载动态失败:', error);
        alert('加载失败，请检查网络连接');
      } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = '加载动态';
        loadBtn.style.opacity = '1';
        loadBtn.style.cursor = 'pointer';
      }
    }
  
    // API调用
    async function spaceHistory(offset = "") {
      const url = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?offset=${offset}&host_mid=${appState.uid}&timezone_offset=-480&platform=web`;
      
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://space.bilibili.com/'
          },
          withCredentials: true
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          // 429错误重试机制
          await new Promise(resolve => setTimeout(resolve, 2000));
          return spaceHistory(offset);
        }
        throw error;
      }
    }
  
    // 清空数据
    function clearData() {
      if (confirm('确定要清空所有数据吗？')) {
        appState.dynamics = [];
        appState.offset = '';
        updateDynamicsTable();
        updateDynamicsCount();
      }
    }
  
    // 全选/取消全选
    function toggleAllSelection() {
      const checkbox = document.getElementById('select-all-checkbox');
      const isChecked = checkbox.checked;
      
      appState.dynamics.forEach(item => {
        item.selected = isChecked;
      });
      
      // 更新表格中的复选框
      const itemCheckboxes = document.querySelectorAll('.item-checkbox');
      itemCheckboxes.forEach(cb => {
        cb.checked = isChecked;
      });
    }
  
    // 更新动态表格
    function updateDynamicsTable() {
      const tbody = document.getElementById('dynamics-tbody');
      
      if (appState.dynamics.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="padding: 40px; text-align: center; color: #999;">
              暂无数据，请点击"加载动态"获取数据
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = appState.dynamics.map((item, index) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px;">
            <input 
              type="checkbox" 
              class="item-checkbox"
              data-index="${index}"
              ${item.selected ? 'checked' : ''}
              style="margin-right: 8px;"
            >
            ${index + 1}
          </td>
          <td style="padding: 12px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              background: #e3f2fd;
              color: #1976d2;
              border-radius: 12px;
              font-size: 12px;
              white-space: nowrap;
            ">
              ${getTypeLabel(item)}
            </span>
          </td>
          <td style="padding: 12px; word-wrap: break-word; overflow: hidden;">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${item.modules.module_dynamic.major && item.modules.module_dynamic.major.archive ? 
                `<img src="${item.modules.module_dynamic.major.archive.cover}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">` : ''
              }
              <div style="overflow: hidden; flex: 1; min-width: 0;">
                <div style="font-weight: 500; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${getContentTitle(item)}">
                  ${getContentTitle(item)}
                </div>
                <div style="font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${getContentDesc(item)}">
                  ${getContentDesc(item)}
                </div>
              </div>
            </div>
          </td>
          <td style="padding: 12px; color: #666; font-size: 14px; white-space: nowrap;">
            ${item.modules.module_author.pub_time}
          </td>
          <td style="padding: 12px;">
            <div style="display: flex; gap: 8px;">
              <button 
                class="view-btn"
                data-index="${index}"
                style="
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 4px 8px;
                  border-radius: 3px;
                  cursor: pointer;
                  font-size: 12px;
                  white-space: nowrap;
                "
              >
                查看
              </button>
              <button 
                class="delete-btn"
                data-index="${index}"
                style="
                  background: #dc3545;
                  color: white;
                  border: none;
                  padding: 4px 8px;
                  border-radius: 3px;
                  cursor: pointer;
                  font-size: 12px;
                  white-space: nowrap;
                "
              >
                删除
              </button>
              <button 
                class="delete-unfollow-btn"
                data-index="${index}"
                style="
                  background: #e74c3c;
                  color: white;
                  border: none;
                  padding: 4px 6px;
                  border-radius: 3px;
                  cursor: pointer;
                  font-size: 12px;
                  white-space: nowrap;
                "
              >
                删除并取关
              </button>
            </div>
          </td>
        </tr>
      `).join('');
      
      // 绑定表格内的事件
      bindTableEvents();
    }
  
    // 绑定表格内的事件
    function bindTableEvents() {
      // 绑定复选框事件
      document.querySelectorAll('.item-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const index = parseInt(this.dataset.index);
          appState.dynamics[index].selected = this.checked;
          
          // 更新全选复选框状态
          const allSelected = appState.dynamics.every(item => item.selected);
          const someSelected = appState.dynamics.some(item => item.selected);
          const selectAllCheckbox = document.getElementById('select-all-checkbox');
          selectAllCheckbox.checked = allSelected;
          selectAllCheckbox.indeterminate = someSelected && !allSelected;
        });
      });
  
      // 绑定查看按钮事件
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          viewDynamic(appState.dynamics[index]);
        });
      });
      
      // 绑定删除按钮事件
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          deleteDynamic(appState.dynamics[index]);
        });
      });
      
      // 绑定删除并取关按钮事件
      document.querySelectorAll('.delete-unfollow-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          deleteAndUnfollowDynamic(appState.dynamics[index]);
        });
      });
    }
  
    // 更新动态数量显示
    function updateDynamicsCount() {
      document.getElementById('dynamics-count').textContent = `已加载: ${appState.dynamics.length} 条动态`;
    }
  
    // 勾选所有转发动态
    function selectAllForward() {
      let forwardCount = 0;
      
      appState.dynamics.forEach(item => {
        if (item.type === 'DYNAMIC_TYPE_FORWARD') {
          item.selected = true;
          forwardCount++;
        }
      });
      
      if (forwardCount === 0) {
        alert('暂无转发动态');
        return;
      }
      
      // 更新表格中的复选框
      const itemCheckboxes = document.querySelectorAll('.item-checkbox');
      itemCheckboxes.forEach((cb, index) => {
        if (appState.dynamics[index] && appState.dynamics[index].type === 'DYNAMIC_TYPE_FORWARD') {
          cb.checked = true;
        }
      });
      
      // 更新全选复选框状态
      const allSelected = appState.dynamics.every(item => item.selected);
      const someSelected = appState.dynamics.some(item => item.selected);
      const selectAllCheckbox = document.getElementById('select-all-checkbox');
      selectAllCheckbox.checked = allSelected;
      selectAllCheckbox.indeterminate = someSelected && !allSelected;
      
      alert(`已勾选 ${forwardCount} 条转发动态`);
    }
  
    // 勾选所有抽奖动态
    function selectAllLottery() {
      let lotteryCount = 0;
      
      appState.dynamics.forEach(item => {
        // 检查是否是转发抽奖动态
        if (item.type === 'DYNAMIC_TYPE_FORWARD' && 
            item.orig && 
            item.orig.modules && 
            item.orig.modules.module_dynamic &&
            item.orig.modules.module_dynamic.additional &&
            item.orig.modules.module_dynamic.additional.type === 'ADDITIONAL_TYPE_UPOWER_LOTTERY') {
          item.selected = true;
          lotteryCount++;
        }
      });
      
      if (lotteryCount === 0) {
        alert('暂无抽奖动态');
        return;
      }
      
      // 更新表格中的复选框
      const itemCheckboxes = document.querySelectorAll('.item-checkbox');
      itemCheckboxes.forEach((cb, index) => {
        const item = appState.dynamics[index];
        if (item && item.type === 'DYNAMIC_TYPE_FORWARD' && 
            item.orig && 
            item.orig.modules && 
            item.orig.modules.module_dynamic &&
            item.orig.modules.module_dynamic.additional &&
            item.orig.modules.module_dynamic.additional.type === 'ADDITIONAL_TYPE_UPOWER_LOTTERY') {
          cb.checked = true;
        }
      });
      
      // 更新全选复选框状态
      const allSelected = appState.dynamics.every(item => item.selected);
      const someSelected = appState.dynamics.some(item => item.selected);
      const selectAllCheckbox = document.getElementById('select-all-checkbox');
      selectAllCheckbox.checked = allSelected;
      selectAllCheckbox.indeterminate = someSelected && !allSelected;
      
      alert(`已勾选 ${lotteryCount} 条抽奖动态`);
    }
  
    // 获取类型标签
    function getTypeLabel(item) {
      const type = item.type;
      
      // 处理转发动态
      if (type === 'DYNAMIC_TYPE_FORWARD') {
        if (item.orig && item.orig.modules && item.orig.modules.module_dynamic) {
          const origDynamic = item.orig.modules.module_dynamic;
          // 检查是否是转发抽奖
          if (origDynamic.additional && origDynamic.additional.type === 'ADDITIONAL_TYPE_UPOWER_LOTTERY') {
            return '转发抽奖';
          }
        }
        return '转发';
      }
      
      const typeMap = {
        'DYNAMIC_TYPE_AV': '视频',
        'DYNAMIC_TYPE_WORD': '文字',
        'DYNAMIC_TYPE_DRAW': '图片',
        'DYNAMIC_TYPE_ARTICLE': '文章',
        'DYNAMIC_TYPE_MUSIC': '音频',
        'DYNAMIC_TYPE_COMMON_SQUARE': '分享',
        'DYNAMIC_TYPE_LIVE': '直播',
        'DYNAMIC_TYPE_LIVE_RCMD': '直播推荐'
      };
      
      return typeMap[type] || '其他';
    }
  
    // 获取内容标题
    function getContentTitle(item) {
      // 处理转发动态
      if (item.type === 'DYNAMIC_TYPE_FORWARD') {
        if (item.modules.module_dynamic.desc && item.modules.module_dynamic.desc.text) {
          return `${item.modules.module_dynamic.desc.text}`;
        }
        // 如果转发没有文字，显示转发的原动态标题
        if (item.orig) {
          const origTitle = getOriginalContentTitle(item.orig);
          return `转发：${origTitle}`;
        }
        return '转发动态';
      }
      
      // 处理视频动态
      if (item.modules.module_dynamic.major && item.modules.module_dynamic.major.archive) {
        return item.modules.module_dynamic.major.archive.title;
      }
      
      // 处理图片动态
      if (item.modules.module_dynamic.major && item.modules.module_dynamic.major.opus) {
        if (item.modules.module_dynamic.major.opus.summary) {
          return item.modules.module_dynamic.major.opus.summary.text || '图片动态';
        }
      }
      
      // 处理文字动态
      if (item.modules.module_dynamic.desc && item.modules.module_dynamic.desc.text) {
        return item.modules.module_dynamic.desc.text;
      }
      
      return '无标题';
    }
  
    // 获取原动态的标题（用于转发）
    function getOriginalContentTitle(origItem) {
      if (origItem.modules.module_dynamic.major && origItem.modules.module_dynamic.major.archive) {
        return origItem.modules.module_dynamic.major.archive.title;
      }
      if (origItem.modules.module_dynamic.major && origItem.modules.module_dynamic.major.opus) {
        if (origItem.modules.module_dynamic.major.opus.summary) {
          return origItem.modules.module_dynamic.major.opus.summary.text || '图片动态';
        }
      }
      if (origItem.modules.module_dynamic.desc && origItem.modules.module_dynamic.desc.text) {
        return origItem.modules.module_dynamic.desc.text;
      }
      return '动态内容';
    }
  
    // 获取内容描述
    function getContentDesc(item) {
      // 处理转发动态
      if (item.type === 'DYNAMIC_TYPE_FORWARD' && item.orig) {
        return getOriginalContentDesc(item.orig);
      }
      
      // 处理视频动态
      if (item.modules.module_dynamic.major && item.modules.module_dynamic.major.archive) {
        return item.modules.module_dynamic.major.archive.desc || '';
      }
      
      // 处理图片动态描述
      if (item.modules.module_dynamic.major && item.modules.module_dynamic.major.opus) {
        return '图片动态';
      }
      
      return '';
    }
  
    // 获取原动态的描述（用于转发）
    function getOriginalContentDesc(origItem) {
      if (origItem.modules.module_dynamic.major && origItem.modules.module_dynamic.major.archive) {
        return origItem.modules.module_dynamic.major.archive.desc || '';
      }
      if (origItem.modules.module_dynamic.major && origItem.modules.module_dynamic.major.opus) {
        return '图片动态';
      }
      return '';
    }
  
    // 查看动态
    function viewDynamic(item) {
      // 处理视频动态
      if (item.modules.module_dynamic.major && item.modules.module_dynamic.major.archive) {
        window.open(item.modules.module_dynamic.major.archive.jump_url, '_blank');
        return;
      }
      
      // 处理转发动态
      if (item.type === 'DYNAMIC_TYPE_FORWARD' && item.orig) {
        // 如果原动态是视频，跳转到视频
        if (item.orig.modules.module_dynamic.major && item.orig.modules.module_dynamic.major.archive) {
          window.open(item.orig.modules.module_dynamic.major.archive.jump_url, '_blank');
          return;
        }
        // 如果原动态是图片，跳转到图文
        if (item.orig.modules.module_dynamic.major && item.orig.modules.module_dynamic.major.opus) {
          window.open(item.orig.modules.module_dynamic.major.opus.jump_url, '_blank');
          return;
        }
        // 跳转到原动态
        window.open(`https://t.bilibili.com/${item.orig.id_str}`, '_blank');
        return;
      }
      
      // 处理图片动态
      if (item.modules.module_dynamic.major && item.modules.module_dynamic.major.opus) {
        window.open(item.modules.module_dynamic.major.opus.jump_url, '_blank');
        return;
      }
      
      // 默认跳转到动态页面
      window.open(`https://t.bilibili.com/${item.id_str}`, '_blank');
    }
  
    // 获取CSRF token
    function getCSRFToken() {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'bili_jct') {
          return value;
        }
      }
      return '';
    }
  
    // 删除动态
    async function deleteDynamic(item) {
      const title = getContentTitle(item);
      if (!confirm(`确定要删除这条动态吗？\n${title}`)) {
        return;
      }
      
      try {
        // 获取删除参数
        const deleteParams = item.modules.module_more.three_point_items.find(
          item => item.type === 'THREE_POINT_DELETE'
        );
        
        if (!deleteParams || !deleteParams.params) {
          alert('无法获取删除参数');
          return;
        }
        
        const { dyn_id_str, dyn_type, rid_str } = deleteParams.params;
        const csrf = getCSRFToken();
        
        if (!csrf) {
          alert('未登录或获取CSRF token失败，请先登录B站');
          return;
        }
        
        // 调用删除API
        const response = await fetch(
          `https://api.bilibili.com/x/dynamic/feed/operate/remove?platform=web&csrf=${csrf}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
              dyn_id_str,
              dyn_type,
              rid_str
            })
          }
        );
        
        const result = await response.json();
        
        if (result.code === 0) {
          alert('删除成功！');
          // 从本地数据中移除该动态
          const index = appState.dynamics.findIndex(d => d.id_str === item.id_str);
          if (index > -1) {
            appState.dynamics.splice(index, 1);
            updateDynamicsTable();
            updateDynamicsCount();
          }
        } else {
          alert(`删除失败: ${result.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('删除失败:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          alert('删除失败：网络连接错误或跨域问题');
        } else {
          alert(`删除失败: ${error.message}`);
        }
      }
    }
  
    // 批量删除动态
    async function batchDeleteDynamics() {
      const selectedItems = appState.dynamics.filter(item => item.selected);
      
      if (selectedItems.length === 0) {
        alert('请先选择要删除的动态');
        return;
      }
      
      if (!confirm(`确定要删除选中的 ${selectedItems.length} 条动态吗？此操作无法撤销！`)) {
        return;
      }
      
      const csrf = getCSRFToken();
      if (!csrf) {
        alert('未登录或获取CSRF token失败，请先登录B站');
        return;
      }
      
      const batchBtn = document.getElementById('batch-delete-btn');
      const originalText = batchBtn.textContent;
      
      let successCount = 0;
      let failCount = 0;
      
      try {
        batchBtn.disabled = true;
        batchBtn.style.opacity = '0.6';
        
        for (let i = 0; i < selectedItems.length; i++) {
          const item = selectedItems[i];
          batchBtn.textContent = `删除中... (${i + 1}/${selectedItems.length})`;
          
          try {
            // 获取删除参数
            const deleteParams = item.modules.module_more.three_point_items.find(
              item => item.type === 'THREE_POINT_DELETE'
            );
            
            if (!deleteParams || !deleteParams.params) {
              console.warn(`动态 ${item.id_str} 无法获取删除参数`);
              failCount++;
              continue;
            }
            
            const { dyn_id_str, dyn_type, rid_str } = deleteParams.params;
            
            // 调用删除API
            const response = await fetch(
              `https://api.bilibili.com/x/dynamic/feed/operate/remove?platform=web&csrf=${csrf}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': '*/*',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                credentials: 'include',
                body: JSON.stringify({
                  dyn_id_str,
                  dyn_type,
                  rid_str
                })
              }
            );
            
            const result = await response.json();
            
            if (result.code === 0) {
              successCount++;
              // 从本地数据中移除该动态
              const index = appState.dynamics.findIndex(d => d.id_str === item.id_str);
              if (index > -1) {
                appState.dynamics.splice(index, 1);
              }
            } else {
              console.error(`删除动态 ${item.id_str} 失败:`, result.message);
              failCount++;
            }
          } catch (error) {
            console.error(`删除动态 ${item.id_str} 出错:`, error);
            failCount++;
          }
          
          // 添加延迟避免请求过于频繁
          if (i < selectedItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // 更新UI
        updateDynamicsTable();
        updateDynamicsCount();
        
        // 显示结果
        let message = `批量删除完成！\n成功: ${successCount} 条`;
        if (failCount > 0) {
          message += `\n失败: ${failCount} 条`;
        }
        alert(message);
        
      } catch (error) {
        console.error('批量删除失败:', error);
        alert(`批量删除失败: ${error.message}`);
      } finally {
        batchBtn.disabled = false;
        batchBtn.style.opacity = '1';
        batchBtn.textContent = originalText;
      }
    }
  
    // 批量删除并取关
    async function batchDeleteAndUnfollowDynamics() {
      const selectedItems = appState.dynamics.filter(item => item.selected);
      
      if (selectedItems.length === 0) {
        alert('请先选择要删除的动态');
        return;
      }
      
      if (!confirm(`确定要删除选中的 ${selectedItems.length} 条动态并取关对应的用户吗？此操作无法撤销！`)) {
        return;
      }
      
      const csrf = getCSRFToken();
      if (!csrf) {
        alert('未登录或获取CSRF token失败，请先登录B站');
        return;
      }
      
      const batchBtn = document.getElementById('batch-delete-unfollow-btn');
      const originalText = batchBtn.textContent;
      
      let deleteSuccessCount = 0;
      let unfollowSuccessCount = 0;
      let failCount = 0;
      const processedUsers = new Set(); // 记录已处理的用户，避免重复取关
      
      try {
        batchBtn.disabled = true;
        batchBtn.style.opacity = '0.6';
        
        for (let i = 0; i < selectedItems.length; i++) {
          const item = selectedItems[i];
          batchBtn.textContent = `处理中... (${i + 1}/${selectedItems.length})`;
          
          try {
            // 获取删除参数
            const deleteParams = item.modules.module_more.three_point_items.find(
              item => item.type === 'THREE_POINT_DELETE'
            );
            
            if (!deleteParams || !deleteParams.params) {
              console.warn(`动态 ${item.id_str} 无法获取删除参数`);
              failCount++;
              continue;
            }
            
            const { dyn_id_str, dyn_type, rid_str } = deleteParams.params;
            
            // 调用删除API
            const deleteResponse = await fetch(
              `https://api.bilibili.com/x/dynamic/feed/operate/remove?platform=web&csrf=${csrf}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': '*/*',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                credentials: 'include',
                body: JSON.stringify({
                  dyn_id_str,
                  dyn_type,
                  rid_str
                })
              }
            );
            
            const deleteResult = await deleteResponse.json();
            
            if (deleteResult.code === 0) {
              deleteSuccessCount++;
              
              // 删除成功，尝试取关目标作者
              let targetAuthorUid = item.modules.module_author.mid;
              let targetAuthorName = item.modules.module_author.name;
              
              // 如果是转发动态，获取原动态的作者信息
              if (item.type === 'DYNAMIC_TYPE_FORWARD' && item.orig && item.orig.modules && item.orig.modules.module_author) {
                targetAuthorUid = item.orig.modules.module_author.mid;
                targetAuthorName = item.orig.modules.module_author.name;
              }
              
              // 检查是否是自己的动态或者已经处理过这个用户
              if (targetAuthorUid.toString() !== appState.uid && !processedUsers.has(targetAuthorUid)) {
                processedUsers.add(targetAuthorUid);
                
                const unfollowResult = await unfollowUser(targetAuthorUid);
                if (unfollowResult.success) {
                  unfollowSuccessCount++;
                  console.log(`成功取关用户 ${targetAuthorName} (${targetAuthorUid})`);
                } else {
                  console.warn(`取关用户 ${targetAuthorName} (${targetAuthorUid}) 失败: ${unfollowResult.message}`);
                }
                
                // 添加取关操作间的延迟
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              // 从本地数据中移除该动态
              const index = appState.dynamics.findIndex(d => d.id_str === item.id_str);
              if (index > -1) {
                appState.dynamics.splice(index, 1);
              }
            } else {
              console.error(`删除动态 ${item.id_str} 失败:`, deleteResult.message);
              failCount++;
            }
          } catch (error) {
            console.error(`处理动态 ${item.id_str} 出错:`, error);
            failCount++;
          }
          
          // 添加延迟避免请求过于频繁
          if (i < selectedItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // 更新UI
        updateDynamicsTable();
        updateDynamicsCount();
        
        // 显示结果
        let message = `批量操作完成！\n删除动态成功: ${deleteSuccessCount} 条\n取关用户成功: ${unfollowSuccessCount} 个`;
        if (failCount > 0) {
          message += `\n失败: ${failCount} 条`;
        }
        alert(message);
        
      } catch (error) {
        console.error('批量删除并取关失败:', error);
        alert(`批量操作失败: ${error.message}`);
      } finally {
        batchBtn.disabled = false;
        batchBtn.style.opacity = '1';
        batchBtn.textContent = originalText;
      }
    }
  
    // 取关用户
    async function unfollowUser(uid) {
      const csrf = getCSRFToken();
      if (!csrf) {
        throw new Error('未登录或获取CSRF token失败');
      }
      
      try {
        const formData = new URLSearchParams();
        formData.append('act', '2'); // 2表示取消关注
        formData.append('fid', uid.toString());
        formData.append('spmid', '333.1365');
        formData.append('re_src', '0');
        formData.append('csrf', csrf);
        
        const response = await fetch(
          'https://api.bilibili.com/x/relation/modify?statistics=%7B%22appId%22:100,%22platform%22:5%7D',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': '*/*',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            credentials: 'include',
            body: formData
          }
        );
        
        const result = await response.json();
        
        if (result.code === 0) {
          return { success: true };
        } else {
          return { success: false, message: result.message || '取关失败' };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  
    // 删除并取关动态
    async function deleteAndUnfollowDynamic(item) {
      const title = getContentTitle(item);
      let targetAuthorName = item.modules.module_author.name;
      let targetAuthorUid = item.modules.module_author.mid;
      
      // 如果是转发动态，获取原动态的作者信息
      if (item.type === 'DYNAMIC_TYPE_FORWARD' && item.orig && item.orig.modules && item.orig.modules.module_author) {
        targetAuthorName = item.orig.modules.module_author.name;
        targetAuthorUid = item.orig.modules.module_author.mid;
      }
      
      if (!confirm(`确定要删除这条动态并取关 "${targetAuthorName}" 吗？\n动态：${title}`)) {
        return;
      }
      
      try {
        // 先删除动态
        const deleteParams = item.modules.module_more.three_point_items.find(
          item => item.type === 'THREE_POINT_DELETE'
        );
        
        if (!deleteParams || !deleteParams.params) {
          alert('无法获取删除参数');
          return;
        }
        
        const { dyn_id_str, dyn_type, rid_str } = deleteParams.params;
        const csrf = getCSRFToken();
        
        if (!csrf) {
          alert('未登录或获取CSRF token失败，请先登录B站');
          return;
        }
        
        // 调用删除API
        const deleteResponse = await fetch(
          `https://api.bilibili.com/x/dynamic/feed/operate/remove?platform=web&csrf=${csrf}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
              dyn_id_str,
              dyn_type,
              rid_str
            })
          }
        );
        
        const deleteResult = await deleteResponse.json();
        
        if (deleteResult.code === 0) {
          // 删除成功，尝试取关目标作者
          
          // 检查是否是自己的动态，如果是则跳过取关
          if (targetAuthorUid.toString() === appState.uid) {
            alert('删除成功！（跳过取关自己）');
          } else {
            const unfollowResult = await unfollowUser(targetAuthorUid);
            
            if (unfollowResult.success) {
              alert(`删除动态并取关 "${targetAuthorName}" 成功！`);
            } else {
              alert(`删除动态成功，但取关失败: ${unfollowResult.message}`);
            }
          }
          
          // 从本地数据中移除该动态
          const index = appState.dynamics.findIndex(d => d.id_str === item.id_str);
          if (index > -1) {
            appState.dynamics.splice(index, 1);
            updateDynamicsTable();
            updateDynamicsCount();
          }
        } else {
          alert(`删除失败: ${deleteResult.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('删除并取关失败:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          alert('操作失败：网络连接错误或跨域问题');
        } else {
          alert(`操作失败: ${error.message}`);
        }
      }
    }
  
  })();
  