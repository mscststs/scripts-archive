// ==UserScript==
// @name         Bilibili 视频下载增强
// @namespace    mscststs
// @version      1.2.0
// @description  Bilibili 视频下载 - 支持选择视频/音频流，带进度显示
// @license      ISC
// @author       mscststs
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const RemuxIframe = "https://tools.mscststs.com/tools/mp4-remux";

    // AbortController for current download
    let currentAbortController = null;

    // ==================== Styles ====================
    // All selectors strictly scoped with .bili-dl- prefix.
    // The download button uses its own container (.bili-dl-btn-host)
    // to avoid any class-name collision with the page.
    GM_addStyle(`
        /* Download button — fixed position, completely independent
           of page layout. No DOM structure is modified. */
        .bili-dl-btn-float {
            position: fixed;
            right: 20px;
            bottom: 100px;
            z-index: 99999;
            display: inline-flex;
            align-items: center;
            cursor: pointer;
            padding: 12px 18px;
            margin: 0;
            border: none;
            background: #fff;
            color: #18191C;
            font-size: 14px;
            line-height: 1;
            border-radius: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.2s;
            -webkit-user-select: none;
            user-select: none;
            white-space: nowrap;
        }
        .bili-dl-btn-float:hover {
            color: #00A1D6;
            box-shadow: 0 6px 16px rgba(0, 161, 214, 0.25);
            transform: translateY(-2px);
        }
        .bili-dl-btn-float svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
            flex-shrink: 0;
        }
        .bili-dl-btn-float-text {
            margin-left: 6px;
            font-size: 14px;
            font-weight: 500;
        }

        /* Modal Overlay */
        .bili-dl-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.45); z-index: 100000;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.25s ease; pointer-events: none;
        }
        .bili-dl-overlay.bili-dl-show { opacity: 1; pointer-events: auto; }

        /* Modal */
        .bili-dl-modal {
            background: #fff; border-radius: 12px;
            width: 720px; max-width: 92vw; max-height: 80vh;
            box-shadow: 0 8px 40px rgba(0,0,0,0.18);
            overflow: hidden; display: flex; flex-direction: column;
            transform: translateY(20px) scale(0.97); transition: transform 0.25s ease;
        }
        .bili-dl-overlay.bili-dl-show .bili-dl-modal {
            transform: translateY(0) scale(1);
        }
        .bili-dl-modal-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 18px 24px 14px; border-bottom: 1px solid #E3E5E7;
        }
        .bili-dl-modal-title { font-size: 16px; font-weight: 600; color: #18191C; }
        .bili-dl-modal-close {
            width: 28px; height: 28px; border: none; background: none;
            cursor: pointer; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            color: #9499A0; transition: background 0.15s, color 0.15s;
        }
        .bili-dl-modal-close:hover { background: #F1F2F3; color: #18191C; }
        .bili-dl-modal-body {
            padding: 18px 24px 24px; overflow-y: auto; flex: 1;
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
        }

        /* Stream Section */
        .bili-dl-section { min-width: 0; }
        .bili-dl-section-title {
            font-size: 13px; font-weight: 600; color: #9499A0;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;
        }
        .bili-dl-stream-list { display: flex; flex-direction: column; gap: 6px; }
        .bili-dl-stream-item {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 12px; border: 2px solid #E3E5E7; border-radius: 8px;
            cursor: pointer; transition: border-color 0.15s, background 0.15s;
        }
        .bili-dl-stream-item:hover { border-color: #C9CCD0; background: #F6F7F8; }
        .bili-dl-stream-item.bili-dl-selected { border-color: #00A1D6; background: #E8F6FC; }
        .bili-dl-stream-radio {
            width: 16px; height: 16px; border-radius: 50%;
            border: 2px solid #C9CCD0; flex-shrink: 0;
            position: relative; transition: border-color 0.15s;
        }
        .bili-dl-stream-item.bili-dl-selected .bili-dl-stream-radio { border-color: #00A1D6; }
        .bili-dl-stream-item.bili-dl-selected .bili-dl-stream-radio::after {
            content: ''; position: absolute; top: 2px; left: 2px;
            width: 8px; height: 8px; border-radius: 50%; background: #00A1D6;
        }
        .bili-dl-stream-info { flex: 1; min-width: 0; }
        .bili-dl-stream-quality { font-size: 13px; font-weight: 500; color: #18191C; margin-bottom: 2px; }
        .bili-dl-stream-detail { font-size: 11px; color: #9499A0; }
        .bili-dl-stream-codec {
            display: inline-block; padding: 1px 5px; border-radius: 3px;
            background: #F1F2F3; font-size: 10px; color: #61666D; margin-left: 4px;
        }

        /* Modal Footer */
        .bili-dl-modal-footer {
            padding: 14px 24px; border-top: 1px solid #E3E5E7;
            display: flex; justify-content: flex-end; gap: 10px;
        }
        .bili-dl-btn-cancel {
            padding: 8px 20px; border-radius: 8px;
            border: 1px solid #E3E5E7; background: #fff;
            color: #61666D; font-size: 14px; cursor: pointer; transition: background 0.15s;
        }
        .bili-dl-btn-cancel:hover { background: #F1F2F3; }
        .bili-dl-btn-download {
            padding: 8px 24px; border-radius: 8px; border: none;
            background: #00A1D6; color: #fff; font-size: 14px;
            font-weight: 500; cursor: pointer; transition: background 0.15s;
        }
        .bili-dl-btn-download:hover { background: #00B5E5; }
        .bili-dl-btn-download:disabled { background: #C9CCD0; cursor: not-allowed; }

        /* Progress Panel - bottom right */
        .bili-dl-progress {
            position: fixed; bottom: 24px; right: 24px; width: 380px;
            background: #fff; border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.15);
            z-index: 100000; overflow: hidden;
            transform: translateY(120%);
            transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .bili-dl-progress.bili-dl-show { transform: translateY(0); }
        .bili-dl-progress-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 16px; border-bottom: 1px solid #E3E5E7;
        }
        .bili-dl-progress-title {
            font-size: 14px; font-weight: 600; color: #18191C;
            display: flex; align-items: center; gap: 8px;
        }
        .bili-dl-progress-title svg { width: 18px; height: 18px; fill: #00A1D6; }
        .bili-dl-progress-actions { display: flex; gap: 4px; }
        .bili-dl-progress-btn {
            width: 28px; height: 28px; border: none; background: none;
            cursor: pointer; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            color: #9499A0; transition: background 0.15s, color 0.15s;
        }
        .bili-dl-progress-btn:hover { background: #F1F2F3; color: #18191C; }
        .bili-dl-progress-btn.bili-dl-btn-stop:hover { background: #FDE8E8; color: #F25F5C; }
        .bili-dl-progress-body { padding: 16px; }
        .bili-dl-progress-filename {
            font-size: 13px; color: #61666D; margin-bottom: 12px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bili-dl-progress-stage { font-size: 12px; color: #9499A0; margin-bottom: 6px; }
        .bili-dl-progress-bar-wrap {
            width: 100%; height: 8px; background: #E3E5E7;
            border-radius: 4px; overflow: hidden; margin-bottom: 8px;
        }
        .bili-dl-progress-bar {
            height: 100%; background: linear-gradient(90deg, #00A1D6, #00B5E5);
            border-radius: 4px; width: 0%; transition: width 0.3s ease;
        }
        .bili-dl-progress-stats {
            display: flex; justify-content: space-between;
            font-size: 12px; color: #9499A0;
            font-variant-numeric: tabular-nums;
        }
        .bili-dl-progress-downloaded {
            min-width: 140px; text-align: left;
        }
        .bili-dl-progress-percent {
            min-width: 40px; text-align: right;
            font-weight: 500;
        }
        .bili-dl-progress-status {
            margin-top: 10px; padding: 8px 12px; border-radius: 6px;
            font-size: 12px; text-align: center;
        }
        .bili-dl-progress-status.bili-dl-status-success { background: #E8F8E8; color: #2AC638; }
        .bili-dl-progress-status.bili-dl-status-error { background: #FDE8E8; color: #F25F5C; }
        .bili-dl-progress-status.bili-dl-status-cancelled { background: #FFF3E0; color: #E65100; }
        .bili-dl-progress-tip {
            margin-top: 10px; padding: 6px 12px; border-radius: 6px;
            background: #FFF8E1; color: #F57F17;
            font-size: 11px; text-align: center;
            display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .bili-dl-progress-tip svg { width: 14px; height: 14px; fill: #F57F17; flex-shrink: 0; }

        /* Progress panel minimized */
        .bili-dl-progress.bili-dl-minimized .bili-dl-progress-body { display: none; }
        .bili-dl-progress.bili-dl-minimized { width: auto; min-width: 200px; }

        /* Toast */
        .bili-dl-toast {
            position: fixed; top: 80px; left: 50%;
            transform: translateX(-50%) translateY(-20px);
            background: #18191C; color: #fff;
            padding: 10px 24px; border-radius: 8px; font-size: 14px;
            z-index: 100002; opacity: 0;
            transition: opacity 0.25s, transform 0.25s; pointer-events: none;
        }
        .bili-dl-toast.bili-dl-show {
            opacity: 1; transform: translateX(-50%) translateY(0);
        }

        /* Responsive: stack on narrow screens */
        @media (max-width: 600px) {
            .bili-dl-modal-body { grid-template-columns: 1fr; }
        }
    `);

    // ==================== Utility Functions ====================

    function showToast(msg, duration = 2500) {
        let toast = document.querySelector('.bili-dl-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'bili-dl-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('bili-dl-show');
        setTimeout(() => toast.classList.remove('bili-dl-show'), duration);
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Quality ID to name
    const QUALITY_MAP = {
        6: '移动端 240P',
        16: '360P 流畅',
        32: '480P 清晰',
        64: '720P 高清',
        74: '720P60 高帧率',
        80: '1080P 高清',
        112: '1080P+ 高码率',
        116: '1080P60 高帧率',
        120: '4K 超清',
        125: 'HDR 真彩',
        126: '杜比视界',
        127: '8K 超高清',
    };

    const CODEC_MAP = {
        7: 'AVC',
        12: 'HEVC',
        13: 'AV1',
    };

    // Audio quality ID to name
    const AUDIO_QUALITY_MAP = {
        30216: '标准音质 64K',
        30232: '高品音质 132K',
        30280: '无损音质 192K+',
        30250: '杜比全景声',
        30251: 'Hi-Res 无损',
    };

    // ==================== API ====================

    async function getPlayInfo(aid, bvid, cid) {
        const res = await fetch(
            `https://api.bilibili.com/x/player/wbi/playurl?avid=${aid}&bvid=${bvid}&cid=${cid}&qn=127&fnver=0&fnval=4048&fourk=1`,
            { method: "GET", mode: "cors", credentials: "include" }
        );
        return await res.json();
    }

    function getIds() {
        if (unsafeWindow.__INITIAL_STATE__) {
            const p = unsafeWindow.__INITIAL_STATE__.p;
            let { aid, bvid, cid, title } = unsafeWindow.__INITIAL_STATE__.videoData;
            if (unsafeWindow.__INITIAL_STATE__.videoData.pages.length !== 1) {
                cid = unsafeWindow.__INITIAL_STATE__.videoData.pages[p - 1].cid;
                title += "_" + unsafeWindow.__INITIAL_STATE__.videoData.pages[p - 1].part;
            }
            return { aid, bvid, cid, title };
        } else {
            const query = unsafeWindow.__NEXT_DATA__.props.pageProps.dehydratedState.queries[0];
            const isep = query.queryKey[1].startsWith("ep");
            if (isep) {
                const ep = parseInt(query.queryKey[1].slice(2));
                const p = query.state.data.initEpList.find(item => item.id == ep);
                const { aid, bvid, cid } = p;
                const title = p.share_copy;
                return { aid, bvid, cid, title };
            } else {
                const { aid, bvid, cid } = query.state.data.initEpList[0];
                const title = query.state.data.seasonList[0].season_title;
                return { aid, bvid, cid, title };
            }
        }
    }

    // ==================== DOM Injection ====================
    //
    // Use a floating button with position:fixed. This approach:
    // - Does NOT modify any existing page DOM
    // - Does NOT use MutationObserver (avoids performance issues)
    // - Is completely independent of Vue's component tree
    // - Survives page navigation and re-renders
    // ====================

    const DOWNLOAD_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h3l-4 4-4-4h3V7z"/></svg>`;

    function injectDownloadButton() {
        // Already injected?
        if (document.querySelector('.bili-dl-btn-float')) return;

        const btn = document.createElement('div');
        btn.className = 'bili-dl-btn-float';
        btn.setAttribute('role', 'button');
        btn.title = '下载视频';
        btn.innerHTML = DOWNLOAD_ICON_SVG + '<span class="bili-dl-btn-float-text">下载</span>';
        btn.addEventListener('click', handleDownloadClick);

        document.body.appendChild(btn);
    }

    // Inject once on load
    injectDownloadButton();

    // ==================== Modal ====================

    function buildStreamModal(playInfo, title) {
        const dash = playInfo.data?.dash;
        if (!dash) {
            showToast('无法获取视频流信息');
            return null;
        }

        const videos = dash.video || [];
        const audios = dash.audio || [];

        const overlay = document.createElement('div');
        overlay.className = 'bili-dl-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        const modal = document.createElement('div');
        modal.className = 'bili-dl-modal';
        overlay.appendChild(modal);

        modal.innerHTML = `
            <div class="bili-dl-modal-header">
                <span class="bili-dl-modal-title">选择下载画质</span>
                <button class="bili-dl-modal-close" title="关闭">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/>
                    </svg>
                </button>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'bili-dl-modal-body';
        modal.appendChild(body);

        // --- Video column ---
        const videoSection = document.createElement('div');
        videoSection.className = 'bili-dl-section';
        videoSection.innerHTML = `<div class="bili-dl-section-title">视频流</div>`;
        const videoList = document.createElement('div');
        videoList.className = 'bili-dl-stream-list';

        let selectedVideo = 0;
        videos.forEach((v, i) => {
            const quality = QUALITY_MAP[v.id] || `未知 (${v.id})`;
            const codec = CODEC_MAP[v.codecid] || `Codec ${v.codecid}`;
            const w = v.width || '?';
            const h = v.height || '?';
            const fps = v.frame_rate || '?';
            const bandwidth = v.bandwidth ? formatBytes(v.bandwidth / 8) + '/s' : '';

            const item = document.createElement('div');
            item.className = 'bili-dl-stream-item' + (i === 0 ? ' bili-dl-selected' : '');
            item.innerHTML = `
                <div class="bili-dl-stream-radio"></div>
                <div class="bili-dl-stream-info">
                    <div class="bili-dl-stream-quality">${quality}<span class="bili-dl-stream-codec">${codec}</span></div>
                    <div class="bili-dl-stream-detail">${w}×${h} · ${fps}fps${bandwidth ? ' · ' + bandwidth : ''}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                videoList.querySelectorAll('.bili-dl-stream-item').forEach(el => el.classList.remove('bili-dl-selected'));
                item.classList.add('bili-dl-selected');
                selectedVideo = i;
            });
            videoList.appendChild(item);
        });
        videoSection.appendChild(videoList);
        body.appendChild(videoSection);

        // --- Audio column ---
        const audioSection = document.createElement('div');
        audioSection.className = 'bili-dl-section';
        audioSection.innerHTML = `<div class="bili-dl-section-title">音频流</div>`;
        const audioList = document.createElement('div');
        audioList.className = 'bili-dl-stream-list';

        let selectedAudio = 0;
        audios.forEach((a, i) => {
            const qualityName = AUDIO_QUALITY_MAP[a.id] || `音频 ${a.id}`;
            const bandwidth = a.bandwidth ? formatBytes(a.bandwidth / 8) + '/s' : '';
            // Use actual codec string from API (e.g. "mp4a.40.2", "ec-3"), fallback to CODEC_MAP
            const codecName = a.codecs || CODEC_MAP[a.codecid] || `Codec ${a.codecid}`;
            const sampleRate = a.sample_rate ? (a.sample_rate / 1000).toFixed(1).replace(/\.0$/, '') + 'kHz' : '';

            const item = document.createElement('div');
            item.className = 'bili-dl-stream-item' + (i === 0 ? ' bili-dl-selected' : '');
            item.innerHTML = `
                <div class="bili-dl-stream-radio"></div>
                <div class="bili-dl-stream-info">
                    <div class="bili-dl-stream-quality">${qualityName}<span class="bili-dl-stream-codec">${codecName}</span></div>
                    <div class="bili-dl-stream-detail">${[bandwidth, sampleRate].filter(Boolean).join(' · ')}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                audioList.querySelectorAll('.bili-dl-stream-item').forEach(el => el.classList.remove('bili-dl-selected'));
                item.classList.add('bili-dl-selected');
                selectedAudio = i;
            });
            audioList.appendChild(item);
        });
        audioSection.appendChild(audioList);
        body.appendChild(audioSection);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'bili-dl-modal-footer';
        footer.innerHTML = `
            <button class="bili-dl-btn-cancel">取消</button>
            <button class="bili-dl-btn-download">开始下载</button>
        `;
        modal.appendChild(footer);

        function closeModal() {
            overlay.classList.remove('bili-dl-show');
            setTimeout(() => overlay.remove(), 300);
        }

        overlay.querySelector('.bili-dl-modal-close').addEventListener('click', closeModal);
        footer.querySelector('.bili-dl-btn-cancel').addEventListener('click', closeModal);
        footer.querySelector('.bili-dl-btn-download').addEventListener('click', () => {
            closeModal();
            startDownload(videos[selectedVideo], audios[selectedAudio], title);
        });

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('bili-dl-show'));
        return overlay;
    }

    // ==================== Progress Panel ====================

    function createProgressPanel(onCancel) {
        let panel = document.querySelector('.bili-dl-progress');
        if (panel) panel.remove();

        panel = document.createElement('div');
        panel.className = 'bili-dl-progress';
        panel.innerHTML = `
            <div class="bili-dl-progress-header">
                <div class="bili-dl-progress-title">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h3l-4 4-4-4h3V7z"/></svg>
                    下载中
                </div>
                <div class="bili-dl-progress-actions">
                    <button class="bili-dl-progress-btn bili-dl-btn-stop" title="取消下载">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="4" y="4" width="8" height="8" rx="1"/>
                        </svg>
                    </button>
                    <button class="bili-dl-progress-btn bili-dl-btn-min" title="最小化">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M2 7h10v1H2z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="bili-dl-progress-body">
                <div class="bili-dl-progress-filename"></div>
                <div class="bili-dl-progress-stage">准备中...</div>
                <div class="bili-dl-progress-bar-wrap">
                    <div class="bili-dl-progress-bar"></div>
                </div>
                <div class="bili-dl-progress-stats">
                    <span class="bili-dl-progress-downloaded">—</span>
                    <span class="bili-dl-progress-percent">0%</span>
                </div>
                <div class="bili-dl-progress-status" style="display:none;"></div>
                <div class="bili-dl-progress-tip">
                    <svg viewBox="0 0 16 16"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8.75 8a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 1.5 0V8z"/></svg>
                    下载中请勿关闭页面
                </div>
            </div>
        `;

        panel.querySelector('.bili-dl-btn-min').addEventListener('click', () => {
            panel.classList.toggle('bili-dl-minimized');
        });

        panel.querySelector('.bili-dl-btn-stop').addEventListener('click', () => {
            if (onCancel) onCancel();
        });

        document.body.appendChild(panel);
        requestAnimationFrame(() => panel.classList.add('bili-dl-show'));

        return {
            el: panel,
            setFilename(name) {
                panel.querySelector('.bili-dl-progress-filename').textContent = name;
            },
            setStage(text) {
                panel.querySelector('.bili-dl-progress-stage').textContent = text;
            },
            setProgress(downloaded, total, percent) {
                const bar = panel.querySelector('.bili-dl-progress-bar');
                const dlText = panel.querySelector('.bili-dl-progress-downloaded');
                const pctText = panel.querySelector('.bili-dl-progress-percent');

                bar.style.width = Math.min(percent, 100).toFixed(1) + '%';

                const dlStr = formatBytes(downloaded);
                const totalStr = total ? formatBytes(total) : '...';
                dlText.textContent = dlStr + ' / ' + totalStr;
                pctText.textContent = Math.round(percent) + '%';
            },
            setStatus(text, type = 'success') {
                const status = panel.querySelector('.bili-dl-progress-status');
                status.textContent = text;
                status.className = 'bili-dl-progress-status bili-dl-status-' + type;
                status.style.display = 'block';
                const stopBtn = panel.querySelector('.bili-dl-btn-stop');
                if (stopBtn) stopBtn.style.display = 'none';
                const tip = panel.querySelector('.bili-dl-progress-tip');
                if (tip) tip.style.display = 'none';
            },
            hide() {
                panel.classList.remove('bili-dl-show');
                setTimeout(() => panel.remove(), 400);
            }
        };
    }

    // ==================== Iframe Remux ====================

    function createFrame() {
        return new Promise((resolve, reject) => {
            const frame = document.createElement("iframe");
            frame.style.display = "none";
            frame.src = RemuxIframe;
            document.body.appendChild(frame);

            const timeout = setTimeout(() => {
                unsafeWindow.removeEventListener("message", handleMessage);
                frame.remove();
                reject(new Error('Iframe 加载超时'));
            }, 30000);

            function handleMessage(event) {
                const data = event.data;
                if (data === "Mp4Remux_loaded") {
                    clearTimeout(timeout);
                    const [port2] = event.ports;
                    unsafeWindow.removeEventListener("message", handleMessage);
                    resolve(port2);
                }
            }
            unsafeWindow.addEventListener("message", handleMessage);
        });
    }

    // ==================== Download with Progress ====================

    function splitSteps(step, max) {
        let result = [];
        let start = 0;
        while (start < max) {
            let end = Math.min(start + step, max);
            result.push([start, end]);
            start = end + 1;
        }
        return result;
    }

    /**
     * Returns { readable, totalSize, progress }
     * progress is a live object: { downloaded: number, totalSize: number, done: boolean }
     * The download runs in background; `readable` streams data to the consumer.
     * We track bytes by reading the Content-Length of each range response
     * (pipeTo bypasses our code, so we count from HTTP headers instead).
     */
    async function autoRangeFetch(url, signal) {
        const step = 2097152 * 10; // 20MiB
        let controller = new AbortController();

        // Get total size via initial probe
        let res = await fetch(url, {
            mode: "cors",
            signal: controller.signal
        });
        const totalSize = parseInt(res.headers.get('content-length'));
        controller.abort();

        const {readable, writable} = new TransformStream();
        const progress = { downloaded: 0, totalSize, done: false };

        const rangeFetch = async () => {
            const segments = splitSteps(step, totalSize);
            for (const seg of segments) {
                const [start, end] = seg;
                while (true) {
                    try {
                        const res = await fetch(url, {
                            headers: { "range": `bytes=${start}-${end}` },
                            signal
                        });
                        // Count this chunk's size from the response header
                        // BEFORE pipeTo consumes the body
                        const chunkSize = parseInt(res.headers.get('content-length') || '0');
                        await res.body.pipeTo(writable, {preventClose: true});
                        progress.downloaded += chunkSize;
                        break;
                    } catch(e) {
                        if (signal.aborted) throw e;
                    }
                }
            }
            await writable.close();
            progress.done = true;
        };

        rangeFetch();
        return { readable, totalSize, progress };
    }

    // ==================== Beforeunload Guard ====================

    function beforeUnloadHandler(e) {
        e.preventDefault();
        e.returnValue = '';
    }

    function addBeforeUnload() {
        unsafeWindow.addEventListener('beforeunload', beforeUnloadHandler);
    }

    function removeBeforeUnload() {
        unsafeWindow.removeEventListener('beforeunload', beforeUnloadHandler);
    }

    // ==================== Main Flow ====================

    async function handleDownloadClick() {
        try {
            const { aid, bvid, cid, title } = getIds();

            showToast('正在获取视频信息...');
            const playInfo = await getPlayInfo(aid, bvid, cid);

            if (playInfo.code !== 0 || !playInfo.data?.dash) {
                showToast('获取视频流失败: ' + (playInfo.message || '未知错误'));
                return;
            }

            buildStreamModal(playInfo, title);
        } catch (e) {
            console.error('[BiliDL]', e);
            showToast('获取视频信息失败: ' + e.message);
        }
    }

    async function startDownload(videoStream, audioStream, title) {
        if (currentAbortController) {
            currentAbortController.abort();
        }
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        const progress = createProgressPanel(() => {
            currentAbortController.abort();
            progress.setStatus('已取消下载', 'cancelled');
            removeBeforeUnload();
        });
        progress.setFilename(title + '.mp4');

        addBeforeUnload();

        try {
            // Step 1: Load iframe first
            progress.setStage('正在加载拼接器...');
            let port2;
            try {
                port2 = await createFrame();
            } catch (e) {
                progress.setStatus('拼接器加载失败: ' + e.message, 'error');
                removeBeforeUnload();
                return;
            }

            if (signal.aborted) {
                progress.setStatus('已取消下载', 'cancelled');
                removeBeforeUnload();
                return;
            }

            // Step 2: Fetch video and audio streams (returns immediately, downloads in background)
            progress.setStage('正在下载中...');

            const video = await autoRangeFetch(videoStream.baseUrl, signal);
            const audio = await autoRangeFetch(audioStream.baseUrl, signal);

            if (signal.aborted) {
                progress.setStatus('已取消下载', 'cancelled');
                removeBeforeUnload();
                return;
            }

            // Step 3: Send streams to remuxer
            port2.postMessage({ type: "video", stream: video.readable }, [video.readable]);
            port2.postMessage({ type: "audio", stream: audio.readable }, [audio.readable]);
            port2.postMessage({ type: "remux", filename: title });

            progress.setStage('流式下载拼接中...');

            // Step 4: Poll progress until both downloads finish
            const combinedTotal = video.totalSize + audio.totalSize;
            function tick() {
                const totalDownloaded = video.progress.downloaded + audio.progress.downloaded;
                const percent = combinedTotal ? (totalDownloaded / combinedTotal) * 100 : 0;
                progress.setProgress(totalDownloaded, combinedTotal, percent);

                if (!video.progress.done || !audio.progress.done) {
                    requestAnimationFrame(tick);
                } else {
                    progress.setStatus('流式下载拼接中，请等待浏览器保存文件', 'success');
                    removeBeforeUnload();
                }
            }
            requestAnimationFrame(tick);
        } catch (e) {
            if (signal.aborted) {
                removeBeforeUnload();
                return;
            }
            console.error('[BiliDL] Download error:', e);
            progress.setStatus('下载失败: ' + e.message, 'error');
            removeBeforeUnload();
        } finally {
            currentAbortController = null;
        }
    }

    // ==================== Menu Command ====================

    GM_registerMenuCommand("下载当前视频", () => {
        handleDownloadClick();
    });

})();
