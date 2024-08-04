// ==UserScript==
// @name         抽奖动态删除&取关
// @namespace    mscststs
// @version      0.22
// @description  删除所有抽奖动态并自动取关
// @author       mscststs
// @match        https://space.bilibili.com/*
// @match        http://space.bilibili.com/*
// @require https://greasyfork.org/scripts/38220-mscststs-tools/code/MSCSTSTS-TOOLS.js?version=713767
// @require      https://cdn.jsdelivr.net/npm/axios@1.7.3/dist/axios.min.js
// @icon         https://static.hdslb.com/images/favicon.ico
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const uid = window.location.pathname.split("/")[1];

    function getUserCSRF() {
        return document.cookie.split("; ").find(row => row.startsWith("bili_jct="))?.split("=")[1];
    }

    const csrfToken = getUserCSRF();

    class Api {
        constructor() { }

        async getFollowers() { // 获取粉丝列表
            return this.fetchJsonp(`https://api.bilibili.com/x/relation/followers?jsonp=jsonp&vmid=${window.BilibiliLive.UID}`);
        }

        async spaceHistory(offset = 0) { // 获取个人动态
            return this.retryOn429(() => this._api(
                `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?visitor_uid=${uid}&host_uid=${uid}&offset_dynamic_id=${offset}`,
                {}, "get"
            ));
        }

        async removeDynamic(id) { // 删除动态
            return this._api(
                "https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/rm_dynamic",
                { dynamic_id: id, csrf_token: csrfToken }
            );
        }

        async unfollowUser(id) { // 取关
            return this._api(
                "https://api.live.bilibili.com/relation/v1/Feed/SetUserFollow",
                {
                    uid: uid,
                    type: 0,
                    follow: id,
                    re_src: 18,
                    csrf_token: csrfToken,
                    csrf: csrfToken,
                    visit_id: "",
                }
            );
        }

        async _api(url, data, method = "post") { // 通用请求
            return axios({
                url,
                method,
                data: this.transformRequest(data),
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(res => res.data);
        }

        transformRequest(data) { // 转换请求参数
            return Object.entries(data).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
        }

        async fetchJsonp(url) { // jsonp请求
            return fetchJsonp(url).then(res => res.json());
        }

        async retryOn429(func, retries = 5, delay = 100) { // 出现429错误时冷却100ms重试，出现412错误时提示并退出
            while (retries > 0) {
                try {
                    return await func();
                } catch (err) {
                    if (err.response && err.response.status === 429) {
                        await this.sleep(delay);
                        retries--;
                    } else if (err.response && err.response.status === 412) {
                        alert('由于请求过于频繁，IP暂时被ban，请更换IP或稍后再试。');
                        throw new Error('IP blocked, please retry later.');
                    } else {
                        throw err;
                    }
                }
            }
            throw new Error('Too many retries, request failed.');
        }

        sleep(ms) { // 睡眠
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    const api = new Api();
    const buttons = [".onlyDeleteAll", ".deleteAll", ".onlyDeleteRepost", ".deleteRepost", ".unfollowAll"];
    let logNode;

    async function init() {
        const shijiao = await mscststs.wait(".h-version-state", true, 100);
        if (!shijiao || shijiao.innerText != "我自己") {
            console.log('当前不是自己的个人动态');
            return;
        }

        await Promise.all([
            mscststs.wait("#page-dynamic"),
            mscststs.wait("#page-dynamic .col-2")
        ]);

        const node = createControlPanel();
        document.querySelector("#page-dynamic .col-2").append(node);
        logNode = document.querySelector(".msc_panel .log");

        setEventListeners();
    }

    function createControlPanel() {
        const node = document.createElement("div");
        node.className = "msc_panel";
        node.innerHTML = `
            <div class="inner">
                <button class="onlyDeleteAll">删除所有抽奖动态但是不取关</button><br>
                <button class="onlyDeleteRepost">删除所有转发动态但是不取关</button><br>
                <button class="deleteAll">删除所有抽奖动态并取关</button><br>
                <button class="deleteRepost">删除所有转发动态并取关</button><br>
                <button class="unfollowAll">取关所有</button>
                <div class="log"></div>
            </div>`;
        return node;
    }

    function setEventListeners() {
        document.querySelector(".onlyDeleteAll").addEventListener("click", handleDelete.bind(null, true, false));
        document.querySelector(".onlyDeleteRepost").addEventListener("click", handleDelete.bind(null, false, false));
        document.querySelector(".deleteAll").addEventListener("click", handleDelete.bind(null, true, true));
        document.querySelector(".deleteRepost").addEventListener("click", handleDelete.bind(null, false, true));
        document.querySelector(".unfollowAll").addEventListener("click", unfollowAll);
    }

    async function handleDelete(deleteLottery, unfollow) { // 参数含义：是否仅删除抽奖，是否取关
        disableAll();
        let deleteCount = 0; // 删除计数
        let unfollowCount = 0; // 取关计数
        let hasMore = true; // 是否还有更多动态
        let offset = 0; // 动态偏移量
        let unfollowList = {}; // 已取关列表

        while (hasMore) {
            const { data } = await api.spaceHistory(offset);
            hasMore = data.has_more;

            for (const card of data.cards) {
                offset = card.desc.dynamic_id_str;

                if (card.desc.orig_dy_id != 0) { // 如果是转发动态
                    try {
                        const content = JSON.parse(card.card);
                        const content2 = JSON.parse(content.origin_extend_json);

                        if (!deleteLottery || content2.lott) { // 如果“仅删除抽奖”为假，或判断为抽奖动态
                            const rm = await api.removeDynamic(card.desc.dynamic_id_str);
                            if (rm.code === 0) deleteCount++;
                            else throw new Error("删除出错");

                            if (unfollow && !unfollowList[content.origin_user.info.uid]) { // 如果“取关”为真，且未取关过
                                const uf = await api.unfollowUser(content.origin_user.info.uid);
                                if (uf.code === 0) {
                                    unfollowList[content.origin_user.info.uid] = 1;
                                    unfollowCount++;
                                } else throw new Error("取关出错");
                            }
                        }
                        await api.sleep(50);
                        log(`已删除 ${deleteCount} 条，取关 ${unfollowCount} 个`);
                    } catch (e) {
                        console.error(e);
                        break;
                    }
                }
            }
        }
        enableAll();
    }

    async function unfollowAll() {
        disableAll();
        const { data } = await api.getFollowers();
        let unfollowCount = 0;

        for (const follower of data.list) {
            try {
                const uf = await api.unfollowUser(follower.mid);
                if (uf.code === 0) {
                    unfollowCount++;
                } else {
                    throw new Error("取关出错");
                }
                await api.sleep(50);
                log(`已取关 ${unfollowCount} 个`);
            } catch (e) {
                console.error(e);
                break;
            }
        }
        enableAll();
    }

    function disableAll() {
        console.log('start');
        buttons.forEach(btn => document.querySelector(btn).disabled = true);
    }

    function enableAll() {
        console.log('done');
        buttons.forEach(btn => document.querySelector(btn).disabled = false);
    }

    function log(message) {
        logNode.innerText = message;
    }

    init();
})();
