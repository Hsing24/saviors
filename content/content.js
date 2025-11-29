// Content Script: Form Field Recorder
// 負責頁面內欄位監聽與錄製

(function() {
  'use strict';

  /**
   * 訊息類型定義
   */
  const MessageTypes = {
    FIELD_CHANGED: 'FIELD_CHANGED',
    PROMPT_RESPONSE: 'PROMPT_RESPONSE',
    START_RECORDING: 'START_RECORDING',
    STOP_RECORDING: 'STOP_RECORDING',
    APPLY_FIELD_VALUE: 'APPLY_FIELD_VALUE',
    SCROLL_TO_FIELD: 'SCROLL_TO_FIELD',
    SHOW_PROMPT: 'SHOW_PROMPT'
  };

  /**
   * 內部狀態
   */
  let isRecording = false;
  let currentSessionTimestamp = null;
  let promptElement = null;

  /**
   * 初始化 Content Script
   */
  function init() {
    console.log('[ContentScript] Initializing Form Field Recorder');
    
    // 設置事件委派監聽 blur 事件
    document.addEventListener('blur', handleBlur, true);
    
    // 設置 MutationObserver 偵測動態載入欄位
    setupMutationObserver();
    
    // 監聽來自 Service Worker 的訊息
    chrome.runtime.onMessage.addListener(handleMessage);
    
    console.log('[ContentScript] Form Field Recorder ready');
  }

  /**
   * 處理 blur 事件
   */
  function handleBlur(event) {
    const element = event.target;
    
    // 檢查是否為表單欄位
    if (!isFormField(element)) return;
    
    // 檢查是否應該錄製此欄位
    if (!window.CaptchaFilter?.shouldRecordField(element)) {
      console.log('[ContentScript] Skipping captcha/excluded field:', element);
      return;
    }
    
    const value = window.FieldDetector?.getFieldValue(element);
    
    // 空值不錄製
    if (!value) return;
    
    // 建立欄位記錄
    const fieldRecord = {
      identifier: window.FieldDetector?.getFieldIdentifier(element),
      value: value,
      type: window.FieldDetector?.getFieldType(element),
      label: window.FieldDetector?.getFieldLabel(element)
    };
    
    console.log('[ContentScript] Field changed:', fieldRecord);
    
    // 發送至 Service Worker
    chrome.runtime.sendMessage({
      type: MessageTypes.FIELD_CHANGED,
      payload: {
        url: window.location.href,
        field: fieldRecord
      },
      timestamp: Date.now()
    }).catch(error => {
      console.error('[ContentScript] Error sending FIELD_CHANGED:', error);
    });
  }

  /**
   * 檢查是否為表單欄位
   */
  function isFormField(element) {
    if (!element || !element.tagName) return false;
    
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input') {
      const type = (element.type || 'text').toLowerCase();
      const excludedTypes = ['submit', 'button', 'reset', 'image'];
      return !excludedTypes.includes(type);
    }
    
    return tagName === 'textarea' || tagName === 'select';
  }

  /**
   * 設置 MutationObserver
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newFields = window.FieldDetector?.detectNewFields(node) || [];
            if (newFields.length > 0) {
              console.log('[ContentScript] New fields detected:', newFields.length);
            }
          }
        });
      });
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  }

  /**
   * 處理來自 Service Worker 的訊息
   */
  function handleMessage(message, sender, sendResponse) {
    const { type, payload } = message;
    
    console.log('[ContentScript] Received message:', type, payload);
    
    switch (type) {
      case MessageTypes.START_RECORDING:
        handleStartRecording(payload);
        sendResponse({ started: true });
        break;
      
      case MessageTypes.STOP_RECORDING:
        handleStopRecording(payload);
        sendResponse({ stopped: true, fieldsRecorded: 0 });
        break;
      
      case MessageTypes.SHOW_PROMPT:
        handleShowPrompt(payload);
        sendResponse({ shown: true });
        break;
      
      case MessageTypes.APPLY_FIELD_VALUE:
        const applyResult = handleApplyFieldValue(payload);
        sendResponse(applyResult);
        break;
      
      case MessageTypes.SCROLL_TO_FIELD:
        const scrollResult = handleScrollToField(payload);
        sendResponse(scrollResult);
        break;
      
      default:
        sendResponse({ error: 'Unknown message type' });
    }
    
    return true;
  }

  /**
   * 處理開始錄製
   */
  function handleStartRecording(payload) {
    isRecording = true;
    currentSessionTimestamp = payload.sessionTimestamp;
    console.log('[ContentScript] Recording started, session:', currentSessionTimestamp);
    
    // 移除提示視窗（若存在）
    hidePrompt();
  }

  /**
   * 處理停止錄製
   */
  function handleStopRecording(payload) {
    isRecording = false;
    currentSessionTimestamp = null;
    console.log('[ContentScript] Recording stopped, reason:', payload?.reason);
  }

  /**
   * 處理顯示錄製提醒
   */
  function handleShowPrompt(payload) {
    console.log('[ContentScript] Showing recording prompt');
    showPrompt();
  }

  /**
   * 顯示錄製提醒視窗
   */
  function showPrompt() {
    if (promptElement) return;
    
    promptElement = document.createElement('div');
    promptElement.className = 'saviors-prompt';
    promptElement.innerHTML = `
      <div class="saviors-prompt-content">
        <div class="saviors-prompt-icon">📝</div>
        <div class="saviors-prompt-text">
          <strong>表單欄位錄製器</strong>
          <p>偵測到您正在填寫表單，是否要開始錄製？</p>
        </div>
        <div class="saviors-prompt-buttons">
          <button class="saviors-prompt-btn saviors-prompt-btn-yes">是</button>
          <button class="saviors-prompt-btn saviors-prompt-btn-no">否</button>
        </div>
      </div>
    `;
    
    // 綁定按鈕事件
    promptElement.querySelector('.saviors-prompt-btn-yes').addEventListener('click', () => {
      handlePromptAccept();
    });
    
    promptElement.querySelector('.saviors-prompt-btn-no').addEventListener('click', () => {
      handlePromptDecline();
    });
    
    document.body.appendChild(promptElement);
  }

  /**
   * 隱藏錄製提醒視窗
   */
  function hidePrompt() {
    if (promptElement && promptElement.parentNode) {
      promptElement.parentNode.removeChild(promptElement);
      promptElement = null;
    }
  }

  /**
   * 處理使用者接受錄製
   */
  function handlePromptAccept() {
    hidePrompt();
    
    chrome.runtime.sendMessage({
      type: MessageTypes.PROMPT_RESPONSE,
      payload: {
        accepted: true,
        url: window.location.href
      },
      timestamp: Date.now()
    }).catch(error => {
      console.error('[ContentScript] Error sending PROMPT_RESPONSE:', error);
    });
  }

  /**
   * 處理使用者拒絕錄製
   */
  function handlePromptDecline() {
    hidePrompt();
    
    chrome.runtime.sendMessage({
      type: MessageTypes.PROMPT_RESPONSE,
      payload: {
        accepted: false,
        url: window.location.href
      },
      timestamp: Date.now()
    }).catch(error => {
      console.error('[ContentScript] Error sending PROMPT_RESPONSE:', error);
    });
  }

  /**
   * 處理填入欄位值
   */
  function handleApplyFieldValue(payload) {
    const { identifier, value } = payload;
    
    const element = window.FieldDetector?.findElementByIdentifier(identifier);
    
    if (!element) {
      return { applied: false, elementFound: false };
    }
    
    // 填入值
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input') {
      const type = (element.type || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        element.checked = value === 'on' || value === element.value;
      } else {
        element.value = value;
      }
    } else {
      element.value = value;
    }
    
    // 觸發 input 和 change 事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 高亮欄位
    highlightField(element);
    
    return { applied: true, elementFound: true };
  }

  /**
   * 處理捲動至欄位
   */
  function handleScrollToField(payload) {
    const { identifier } = payload;
    
    const element = window.FieldDetector?.findElementByIdentifier(identifier);
    
    if (!element) {
      return { scrolled: false, elementFound: false };
    }
    
    // 捲動至元素
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // 高亮欄位
    highlightField(element);
    
    // 嘗試聚焦
    try {
      element.focus();
    } catch (e) {
      // 忽略聚焦錯誤
    }
    
    return { scrolled: true, elementFound: true };
  }

  /**
   * 高亮欄位
   */
  function highlightField(element) {
    const originalOutline = element.style.outline;
    const originalTransition = element.style.transition;
    
    element.style.transition = 'outline 0.3s ease';
    element.style.outline = '3px solid #4CAF50';
    
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.transition = originalTransition;
    }, 2000);
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
